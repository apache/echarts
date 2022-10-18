/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/


import * as zrUtil from 'zrender/src/core/util';
import Model from './Model';
import * as componentUtil from '../util/component';
import {
    enableClassManagement,
    parseClassType,
    isExtendedClass,
    ExtendableConstructor,
    ClassManager,
    mountExtend
} from '../util/clazz';
import {
    makeInner, ModelFinderIndexQuery, queryReferringComponents, ModelFinderIdQuery, QueryReferringOpt
} from '../util/model';
import * as layout from '../util/layout';
import GlobalModel from './Global';
import {
    ComponentOption,
    ComponentMainType,
    ComponentSubType,
    ComponentFullType,
    ComponentLayoutMode,
    BoxLayoutOptionMixin
} from '../util/types';

const inner = makeInner<{
    defaultOption: ComponentOption
}, ComponentModel>();


class ComponentModel<Opt extends ComponentOption = ComponentOption> extends Model<Opt> {

    // [Caution]: Because this class or desecendants can be used as `XXX.extend(subProto)`,
    // the class members must not be initialized in constructor or declaration place.
    // Otherwise there is bad case:
    //   class A {xxx = 1;}
    //   enableClassExtend(A);
    //   class B extends A {}
    //   var C = B.extend({xxx: 5});
    //   var c = new C();
    //   console.log(c.xxx); // expect 5 but always 1.

    /**
     * @readonly
     */
    type: ComponentFullType;

    /**
     * @readonly
     */
    id: string;

    /**
     * Because simplified concept is probably better, series.name (or component.name)
     * has been having too many responsibilities:
     * (1) Generating id (which requires name in option should not be modified).
     * (2) As an index to mapping series when merging option or calling API (a name
     * can refer to more than one component, which is convenient is some cases).
     * (3) Display.
     * @readOnly But injected
     */
    name: string;

    /**
     * @readOnly
     */
    mainType: ComponentMainType;

    /**
     * @readOnly
     */
    subType: ComponentSubType;

    /**
     * @readOnly
     */
    componentIndex: number;

    /**
     * @readOnly
     */
    protected defaultOption: ComponentOption;

    /**
     * @readOnly
     */
    ecModel: GlobalModel;

    /**
     * @readOnly
     */
    static dependencies: string[];


    readonly uid: string;

    // // No common coordinateSystem needed. Each sub class implement
    // // `CoordinateSystemHostModel` itself.
    // coordinateSystem: CoordinateSystemMaster | CoordinateSystemExecutive;

    /**
     * Support merge layout params.
     * Only support 'box' now (left/right/top/bottom/width/height).
     */
    static layoutMode: ComponentLayoutMode | ComponentLayoutMode['type'];

    /**
     * Prevent from auto set z, zlevel, z2 by the framework.
     */
    preventAutoZ: boolean;

    // Injectable properties:
    __viewId: string;
    __requireNewView: boolean;

    static protoInitialize = (function () {
        const proto = ComponentModel.prototype;
        proto.type = 'component';
        proto.id = '';
        proto.name = '';
        proto.mainType = '';
        proto.subType = '';
        proto.componentIndex = 0;
    })();


    constructor(option: Opt, parentModel: Model, ecModel: GlobalModel) {
        super(option, parentModel, ecModel);
        this.uid = componentUtil.getUID('ec_cpt_model');
    }

    init(option: Opt, parentModel: Model, ecModel: GlobalModel): void {
        this.mergeDefaultAndTheme(option, ecModel);
    }

    mergeDefaultAndTheme(option: Opt, ecModel: GlobalModel): void {
        const layoutMode = layout.fetchLayoutMode(this);
        const inputPositionParams = layoutMode
            ? layout.getLayoutParams(option as BoxLayoutOptionMixin) : {};

        const themeModel = ecModel.getTheme();
        zrUtil.merge(option, themeModel.get(this.mainType));
        zrUtil.merge(option, this.getDefaultOption());

        if (layoutMode) {
            layout.mergeLayoutParam(option as BoxLayoutOptionMixin, inputPositionParams, layoutMode);
        }
    }

    mergeOption(option: Opt, ecModel: GlobalModel): void {
        zrUtil.merge(this.option, option, true);

        const layoutMode = layout.fetchLayoutMode(this);
        if (layoutMode) {
            layout.mergeLayoutParam(
                this.option as BoxLayoutOptionMixin,
                option as BoxLayoutOptionMixin,
                layoutMode
            );
        }
    }

    /**
     * Called immediately after `init` or `mergeOption` of this instance called.
     */
    optionUpdated(newCptOption: Opt, isInit: boolean): void {}

    /**
     * [How to declare defaultOption]:
     *
     * (A) If using class declaration in typescript (since echarts 5):
     * ```ts
     * import {ComponentOption} from '../model/option';
     * export interface XxxOption extends ComponentOption {
     *     aaa: number
     * }
     * export class XxxModel extends Component {
     *     static type = 'xxx';
     *     static defaultOption: XxxOption = {
     *         aaa: 123
     *     }
     * }
     * Component.registerClass(XxxModel);
     * ```
     * ```ts
     * import {inheritDefaultOption} from '../util/component';
     * import {XxxModel, XxxOption} from './XxxModel';
     * export interface XxxSubOption extends XxxOption {
     *     bbb: number
     * }
     * class XxxSubModel extends XxxModel {
     *     static defaultOption: XxxSubOption = inheritDefaultOption(XxxModel.defaultOption, {
     *         bbb: 456
     *     })
     *     fn() {
     *         let opt = this.getDefaultOption();
     *         // opt is {aaa: 123, bbb: 456}
     *     }
     * }
     * ```
     *
     * (B) If using class extend (previous approach in echarts 3 & 4):
     * ```js
     * let XxxComponent = Component.extend({
     *     defaultOption: {
     *         xx: 123
     *     }
     * })
     * ```
     * ```js
     * let XxxSubComponent = XxxComponent.extend({
     *     defaultOption: {
     *         yy: 456
     *     },
     *     fn: function () {
     *         let opt = this.getDefaultOption();
     *         // opt is {xx: 123, yy: 456}
     *     }
     * })
     * ```
     */
    getDefaultOption(): Opt {
        const ctor = this.constructor;

        // If using class declaration, it is different to travel super class
        // in legacy env and auto merge defaultOption. So if using class
        // declaration, defaultOption should be merged manually.
        if (!isExtendedClass(ctor)) {
            // When using ts class, defaultOption must be declared as static.
            return (ctor as any).defaultOption;
        }

        // FIXME: remove this approach?
        const fields = inner(this);
        if (!fields.defaultOption) {
            const optList = [];
            let clz = ctor as ExtendableConstructor;
            while (clz) {
                const opt = clz.prototype.defaultOption;
                opt && optList.push(opt);
                clz = clz.superClass;
            }

            let defaultOption = {};
            for (let i = optList.length - 1; i >= 0; i--) {
                defaultOption = zrUtil.merge(defaultOption, optList[i], true);
            }
            fields.defaultOption = defaultOption;
        }
        return fields.defaultOption as Opt;
    }

    /**
     * Notice: always force to input param `useDefault` in case that forget to consider it.
     * The same behavior as `modelUtil.parseFinder`.
     *
     * @param useDefault In many cases like series refer axis and axis refer grid,
     *        If axis index / axis id not specified, use the first target as default.
     *        In other cases like dataZoom refer axis, if not specified, measn no refer.
     */
    getReferringComponents(mainType: ComponentMainType, opt: QueryReferringOpt): {
        // Always be array rather than null/undefined, which is convenient to use.
        models: ComponentModel[];
        // Whether target component is specified
        specified: boolean;
    } {
        const indexKey = (mainType + 'Index') as keyof Opt;
        const idKey = (mainType + 'Id') as keyof Opt;

        return queryReferringComponents(
            this.ecModel,
            mainType,
            {
                index: this.get(indexKey, true) as unknown as ModelFinderIndexQuery,
                id: this.get(idKey, true) as unknown as ModelFinderIdQuery
            },
            opt
        );
    }

    getBoxLayoutParams() {
        // Consider itself having box layout configs.
        const boxLayoutModel = this as Model<ComponentOption & BoxLayoutOptionMixin>;
        return {
            left: boxLayoutModel.get('left'),
            top: boxLayoutModel.get('top'),
            right: boxLayoutModel.get('right'),
            bottom: boxLayoutModel.get('bottom'),
            width: boxLayoutModel.get('width'),
            height: boxLayoutModel.get('height')
        };
    }

    /**
     * Get key for zlevel.
     * If developers don't configure zlevel. We will assign zlevel to series based on the key.
     * For example, lines with trail effect and progressive series will in an individual zlevel.
     */
    getZLevelKey(): string {
        return '';
    }

    setZLevel(zlevel: number) {
        this.option.zlevel = zlevel;
    }

    // // Interfaces for component / series with select ability.
    // select(dataIndex?: number[], dataType?: string): void {}

    // unSelect(dataIndex?: number[], dataType?: string): void {}

    // getSelectedDataIndices(): number[] {
    //     return [];
    // }


    static registerClass: ClassManager['registerClass'];

    static hasClass: ClassManager['hasClass'];

    static registerSubTypeDefaulter: componentUtil.SubTypeDefaulterManager['registerSubTypeDefaulter'];

}

export type ComponentModelConstructor = typeof ComponentModel
    & ClassManager
    & componentUtil.SubTypeDefaulterManager
    & ExtendableConstructor
    & componentUtil.TopologicalTravelable<object>;

mountExtend(ComponentModel, Model);
enableClassManagement(ComponentModel as ComponentModelConstructor);
componentUtil.enableSubTypeDefaulter(ComponentModel as ComponentModelConstructor);
componentUtil.enableTopologicalTravel(ComponentModel as ComponentModelConstructor, getDependencies);


function getDependencies(componentType: string): string[] {
    let deps: string[] = [];
    zrUtil.each((ComponentModel as ComponentModelConstructor).getClassesByMainType(componentType), function (clz) {
        deps = deps.concat((clz as any).dependencies || (clz as any).prototype.dependencies || []);
    });

    // Ensure main type.
    deps = zrUtil.map(deps, function (type) {
        return parseClassType(type).main;
    });

    // Hack dataset for convenience.
    if (componentType !== 'dataset' && zrUtil.indexOf(deps, 'dataset') <= 0) {
        deps.unshift('dataset');
    }

    return deps;
}


export default ComponentModel;
