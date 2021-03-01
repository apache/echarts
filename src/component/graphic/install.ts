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

import * as modelUtil from '../../util/model';
import * as graphicUtil from '../../util/graphic';
import * as layoutUtil from '../../util/layout';
import {parsePercent} from '../../util/number';
import {
    ComponentOption,
    BoxLayoutOptionMixin,
    Dictionary,
    ZRStyleProps,
    OptionId,
    OptionPreprocessor
} from '../../util/types';
import ComponentModel from '../../model/Component';
import Element, { ElementTextConfig } from 'zrender/src/Element';
import Displayable from 'zrender/src/graphic/Displayable';
import { PathProps } from 'zrender/src/graphic/Path';
import { ImageStyleProps } from 'zrender/src/graphic/Image';
import GlobalModel from '../../model/Global';
import ComponentView from '../../view/Component';
import ExtensionAPI from '../../core/ExtensionAPI';
import { getECData } from '../../util/innerStore';
import { TextStyleProps } from 'zrender/src/graphic/Text';
import { isEC4CompatibleStyle, convertFromEC4CompatibleStyle } from '../../util/styleCompat';
import { EChartsExtensionInstallRegisters } from '../../extension';

const TRANSFORM_PROPS = {
    x: 1,
    y: 1,
    scaleX: 1,
    scaleY: 1,
    originX: 1,
    originY: 1,
    rotation: 1
} as const;
type TransformProp = keyof typeof TRANSFORM_PROPS;

interface GraphicComponentBaseElementOption extends
        Partial<Pick<
            Element,
            TransformProp
            | 'silent'
            | 'ignore'
            | 'draggable'
            | 'textConfig'
            | 'onclick'
            | 'ondblclick'
            | 'onmouseover'
            | 'onmouseout'
            | 'onmousemove'
            | 'onmousewheel'
            | 'onmousedown'
            | 'onmouseup'
            | 'oncontextmenu'
            | 'ondrag'
            | 'ondragstart'
            | 'ondragend'
            | 'ondragenter'
            | 'ondragleave'
            | 'ondragover'
            | 'ondrop'
        >>,
        /**
         * left/right/top/bottom: (like 12, '22%', 'center', default undefined)
         * If left/rigth is set, shape.x/shape.cx/position will not be used.
         * If top/bottom is set, shape.y/shape.cy/position will not be used.
         * This mechanism is useful when you want to position a group/element
         * against the right side or the center of this container.
         */
        Partial<Pick<BoxLayoutOptionMixin, 'left' | 'right' | 'top' | 'bottom'>> {

    /**
     * element type, mandatory.
     * Only can be omit if call setOption not at the first time and perform merge.
     */
    type?: string;

    id?: OptionId;
    name?: string;

    // Only internal usage. Use specified value does NOT make sense.
    parentId?: OptionId;
    parentOption?: GraphicComponentElementOption;
    children?: GraphicComponentElementOption[];
    hv?: [boolean, boolean];

    /**
     * bounding: (enum: 'all' (default) | 'raw')
     * Specify how to calculate boundingRect when locating.
     * 'all': Get uioned and transformed boundingRect
     *     from both itself and its descendants.
     *     This mode simplies confining a group of elements in the bounding
     *     of their ancester container (e.g., using 'right: 0').
     * 'raw': Only use the boundingRect of itself and before transformed.
     *     This mode is similar to css behavior, which is useful when you
     *     want an element to be able to overflow its container. (Consider
     *     a rotated circle needs to be located in a corner.)
     */
    bounding?: 'raw' | 'all';

    /**
     * info: custom info. enables user to mount some info on elements and use them
     * in event handlers. Update them only when user specified, otherwise, remain.
     */
    info?: GraphicExtraElementInfo;

    textContent?: GraphicComponentTextOption;
    textConfig?: ElementTextConfig;

    $action?: 'merge' | 'replace' | 'remove';
};
interface GraphicComponentDisplayableOption extends
        GraphicComponentBaseElementOption,
        Partial<Pick<Displayable, 'zlevel' | 'z' | 'z2' | 'invisible' | 'cursor'>> {

    style?: ZRStyleProps;

    // TODO: states?
    // emphasis?: GraphicComponentDisplayableOptionOnState;
    // blur?: GraphicComponentDisplayableOptionOnState;
    // select?: GraphicComponentDisplayableOptionOnState;
}
// TODO: states?
// interface GraphicComponentDisplayableOptionOnState extends Partial<Pick<
//     Displayable, TransformProp | 'textConfig' | 'z2'
// >> {
//     style?: ZRStyleProps;
// }
interface GraphicComponentGroupOption extends GraphicComponentBaseElementOption {
    type?: 'group';

    /**
     * width/height: (can only be pixel value, default 0)
     * Only be used to specify contianer(group) size, if needed. And
     * can not be percentage value (like '33%'). See the reason in the
     * layout algorithm below.
     */
    width?: number;
    height?: number;

    // TODO: Can only set focus, blur on the root element.
    // children: Omit<GraphicComponentElementOption, 'focus' | 'blurScope'>[];
    children: GraphicComponentElementOption[];
}
export interface GraphicComponentZRPathOption extends GraphicComponentDisplayableOption {
    shape?: PathProps['shape'];
}
export interface GraphicComponentImageOption extends GraphicComponentDisplayableOption {
    type?: 'image';
    style?: ImageStyleProps;
    // TODO: states?
    // emphasis?: GraphicComponentImageOptionOnState;
    // blur?: GraphicComponentImageOptionOnState;
    // select?: GraphicComponentImageOptionOnState;
}
// TODO: states?
// interface GraphicComponentImageOptionOnState extends GraphicComponentDisplayableOptionOnState {
//     style?: ImageStyleProps;
// }
interface GraphicComponentTextOption
        extends Omit<GraphicComponentDisplayableOption, 'textContent' | 'textConfig'> {
    type?: 'text';
    style?: TextStyleProps;
}
type GraphicComponentElementOption =
    GraphicComponentGroupOption
    | GraphicComponentZRPathOption
    | GraphicComponentImageOption
    | GraphicComponentTextOption;
// type GraphicComponentElementOptionOnState =
//     GraphicComponentDisplayableOptionOnState
//     | GraphicComponentImageOptionOnState;

type GraphicExtraElementInfo = Dictionary<unknown>;

type ElementMap = zrUtil.HashMap<Element, string>;

const inner = modelUtil.makeInner<{
    __ecGraphicWidthOption: number;
    __ecGraphicHeightOption: number;
    __ecGraphicWidth: number;
    __ecGraphicHeight: number;
    __ecGraphicId: string;
}, Element>();


const _nonShapeGraphicElements = {

    // Reserved but not supported in graphic component.
    path: null as unknown,
    compoundPath: null as unknown,

    // Supported in graphic component.
    group: graphicUtil.Group,
    image: graphicUtil.Image,
    text: graphicUtil.Text
} as const;
type NonShapeGraphicElementType = keyof typeof _nonShapeGraphicElements;

// ------------------------
// Preprocessor
// ------------------------

const preprocessor: OptionPreprocessor = function (option) {
    const graphicOption = option.graphic as GraphicComponentOption | GraphicComponentOption[];

    // Convert
    // {graphic: [{left: 10, type: 'circle'}, ...]}
    // or
    // {graphic: {left: 10, type: 'circle'}}
    // to
    // {graphic: [{elements: [{left: 10, type: 'circle'}, ...]}]}
    if (zrUtil.isArray(graphicOption)) {
        if (!graphicOption[0] || !graphicOption[0].elements) {
            option.graphic = [{elements: graphicOption}];
        }
        else {
            // Only one graphic instance can be instantiated. (We dont
            // want that too many views are created in echarts._viewMap)
            option.graphic = [(option.graphic as any)[0]];
        }
    }
    else if (graphicOption && !graphicOption.elements) {
        option.graphic = [{elements: [graphicOption]}];
    }
};

// ------------------------
// Model
// ------------------------

export type GraphicComponentLooseOption = (GraphicComponentOption | GraphicComponentElementOption) & {
    mainType?: 'graphic';
};

export interface GraphicComponentOption extends ComponentOption {
    // Note: elements is always behind its ancestors in this elements array.
    elements?: GraphicComponentElementOption[];
    // parentId: string;
};


class GraphicComponentModel extends ComponentModel<GraphicComponentOption> {

    static type = 'graphic';
    type = GraphicComponentModel.type;

    static defaultOption: GraphicComponentOption = {
        elements: []
        // parentId: null
    };

    /**
     * Save el options for the sake of the performance (only update modified graphics).
     * The order is the same as those in option. (ancesters -> descendants)
     */
    private _elOptionsToUpdate: GraphicComponentElementOption[];

    mergeOption(option: GraphicComponentOption, ecModel: GlobalModel): void {
        // Prevent default merge to elements
        const elements = this.option.elements;
        this.option.elements = null;

        super.mergeOption(option, ecModel);

        this.option.elements = elements;
    }

    optionUpdated(newOption: GraphicComponentOption, isInit: boolean): void {
        const thisOption = this.option;
        const newList = (isInit ? thisOption : newOption).elements;
        const existList = thisOption.elements = isInit ? [] : thisOption.elements;

        const flattenedList = [] as GraphicComponentElementOption[];
        this._flatten(newList, flattenedList, null);

        const mappingResult = modelUtil.mappingToExists(existList, flattenedList, 'normalMerge');

        // Clear elOptionsToUpdate
        const elOptionsToUpdate = this._elOptionsToUpdate = [] as GraphicComponentElementOption[];

        zrUtil.each(mappingResult, function (resultItem, index) {
            const newElOption = resultItem.newOption as GraphicComponentElementOption;

            if (__DEV__) {
                zrUtil.assert(
                    zrUtil.isObject(newElOption) || resultItem.existing,
                    'Empty graphic option definition'
                );
            }

            if (!newElOption) {
                return;
            }

            elOptionsToUpdate.push(newElOption);

            setKeyInfoToNewElOption(resultItem, newElOption);

            mergeNewElOptionToExist(existList, index, newElOption);

            setLayoutInfoToExist(existList[index], newElOption);

        }, this);

        // Clean
        for (let i = existList.length - 1; i >= 0; i--) {
            if (existList[i] == null) {
                existList.splice(i, 1);
            }
            else {
                // $action should be volatile, otherwise option gotten from
                // `getOption` will contain unexpected $action.
                delete existList[i].$action;
            }
        }
    }

    /**
     * Convert
     * [{
     *  type: 'group',
     *  id: 'xx',
     *  children: [{type: 'circle'}, {type: 'polygon'}]
     * }]
     * to
     * [
     *  {type: 'group', id: 'xx'},
     *  {type: 'circle', parentId: 'xx'},
     *  {type: 'polygon', parentId: 'xx'}
     * ]
     */
    private _flatten(
        optionList: GraphicComponentElementOption[],
        result: GraphicComponentElementOption[],
        parentOption: GraphicComponentElementOption
    ): void {
        zrUtil.each(optionList, function (option) {
            if (!option) {
                return;
            }

            if (parentOption) {
                option.parentOption = parentOption;
            }

            result.push(option);

            const children = option.children;
            if (option.type === 'group' && children) {
                this._flatten(children, result, option);
            }
            // Deleting for JSON output, and for not affecting group creation.
            delete option.children;
        }, this);
    }

    // FIXME
    // Pass to view using payload? setOption has a payload?
    useElOptionsToUpdate(): GraphicComponentElementOption[] {
        const els = this._elOptionsToUpdate;
        // Clear to avoid render duplicately when zooming.
        this._elOptionsToUpdate = null;
        return els;
    }
}

// ------------------------
// View
// ------------------------

class GraphicComponentView extends ComponentView {

    static type = 'graphic';
    type = GraphicComponentView.type;

    private _elMap: ElementMap;
    private _lastGraphicModel: GraphicComponentModel;

    init() {
        this._elMap = zrUtil.createHashMap();
    }

    render(graphicModel: GraphicComponentModel, ecModel: GlobalModel, api: ExtensionAPI): void {

        // Having leveraged between use cases and algorithm complexity, a very
        // simple layout mechanism is used:
        // The size(width/height) can be determined by itself or its parent (not
        // implemented yet), but can not by its children. (Top-down travel)
        // The location(x/y) can be determined by the bounding rect of itself
        // (can including its descendants or not) and the size of its parent.
        // (Bottom-up travel)

        // When `chart.clear()` or `chart.setOption({...}, true)` with the same id,
        // view will be reused.
        if (graphicModel !== this._lastGraphicModel) {
            this._clear();
        }
        this._lastGraphicModel = graphicModel;

        this._updateElements(graphicModel);
        this._relocate(graphicModel, api);
    }

    /**
     * Update graphic elements.
     */
    private _updateElements(graphicModel: GraphicComponentModel): void {
        const elOptionsToUpdate = graphicModel.useElOptionsToUpdate();

        if (!elOptionsToUpdate) {
            return;
        }

        const elMap = this._elMap;
        const rootGroup = this.group;

        // Top-down tranverse to assign graphic settings to each elements.
        zrUtil.each(elOptionsToUpdate, function (elOption) {
            const id = modelUtil.convertOptionIdName(elOption.id, null);
            const elExisting = id != null ? elMap.get(id) : null;
            const parentId = modelUtil.convertOptionIdName(elOption.parentId, null);
            const targetElParent = (parentId != null ? elMap.get(parentId) : rootGroup) as graphicUtil.Group;

            const elType = elOption.type;
            const elOptionStyle = (elOption as GraphicComponentDisplayableOption).style;
            if (elType === 'text' && elOptionStyle) {
                // In top/bottom mode, textVerticalAlign should not be used, which cause
                // inaccurately locating.
                if (elOption.hv && elOption.hv[1]) {
                    (elOptionStyle as any).textVerticalAlign =
                    (elOptionStyle as any).textBaseline =
                    (elOptionStyle as TextStyleProps).verticalAlign =
                    (elOptionStyle as TextStyleProps).align = null;
                }
            }

            let textContentOption = (elOption as GraphicComponentZRPathOption).textContent;
            let textConfig = (elOption as GraphicComponentZRPathOption).textConfig;
            if (elOptionStyle
                && isEC4CompatibleStyle(elOptionStyle, elType, !!textConfig, !!textContentOption)
            ) {
                const convertResult = convertFromEC4CompatibleStyle(elOptionStyle, elType, true) as GraphicComponentZRPathOption;
                if (!textConfig && convertResult.textConfig) {
                    textConfig = (elOption as GraphicComponentZRPathOption).textConfig = convertResult.textConfig;
                }
                if (!textContentOption && convertResult.textContent) {
                    textContentOption = convertResult.textContent;
                }
            }

            // Remove unnecessary props to avoid potential problems.
            const elOptionCleaned = getCleanedElOption(elOption);

            // For simple, do not support parent change, otherwise reorder is needed.
            if (__DEV__) {
                elExisting && zrUtil.assert(
                    targetElParent === elExisting.parent,
                    'Changing parent is not supported.'
                );
            }

            const $action = elOption.$action || 'merge';
            if ($action === 'merge') {
                elExisting
                    ? elExisting.attr(elOptionCleaned)
                    : createEl(id, targetElParent, elOptionCleaned, elMap);
            }
            else if ($action === 'replace') {
                removeEl(elExisting, elMap);
                createEl(id, targetElParent, elOptionCleaned, elMap);
            }
            else if ($action === 'remove') {
                removeEl(elExisting, elMap);
            }

            const el = elMap.get(id);

            if (el && textContentOption) {
                if ($action === 'merge') {
                    const textContentExisting = el.getTextContent();
                    textContentExisting
                        ? textContentExisting.attr(textContentOption)
                        : el.setTextContent(new graphicUtil.Text(textContentOption));
                }
                else if ($action === 'replace') {
                    el.setTextContent(new graphicUtil.Text(textContentOption));
                }
            }

            if (el) {
                const elInner = inner(el);
                elInner.__ecGraphicWidthOption = (elOption as GraphicComponentGroupOption).width;
                elInner.__ecGraphicHeightOption = (elOption as GraphicComponentGroupOption).height;
                setEventData(el, graphicModel, elOption);
            }
        });
    }

    /**
     * Locate graphic elements.
     */
    private _relocate(graphicModel: GraphicComponentModel, api: ExtensionAPI): void {
        const elOptions = graphicModel.option.elements;
        const rootGroup = this.group;
        const elMap = this._elMap;
        const apiWidth = api.getWidth();
        const apiHeight = api.getHeight();

        // Top-down to calculate percentage width/height of group
        for (let i = 0; i < elOptions.length; i++) {
            const elOption = elOptions[i];
            const id = modelUtil.convertOptionIdName(elOption.id, null);
            const el = id != null ? elMap.get(id) : null;

            if (!el || !el.isGroup) {
                continue;
            }
            const parentEl = el.parent;
            const isParentRoot = parentEl === rootGroup;
            // Like 'position:absolut' in css, default 0.
            const elInner = inner(el);
            const parentElInner = inner(parentEl);
            elInner.__ecGraphicWidth = parsePercent(
                elInner.__ecGraphicWidthOption,
                isParentRoot ? apiWidth : parentElInner.__ecGraphicWidth
            ) || 0;
            elInner.__ecGraphicHeight = parsePercent(
                elInner.__ecGraphicHeightOption,
                isParentRoot ? apiHeight : parentElInner.__ecGraphicHeight
            ) || 0;
        }

        // Bottom-up tranvese all elements (consider ec resize) to locate elements.
        for (let i = elOptions.length - 1; i >= 0; i--) {
            const elOption = elOptions[i];
            const id = modelUtil.convertOptionIdName(elOption.id, null);
            const el = id != null ? elMap.get(id) : null;

            if (!el) {
                continue;
            }

            const parentEl = el.parent;
            const parentElInner = inner(parentEl);
            const containerInfo = parentEl === rootGroup
                ? {
                    width: apiWidth,
                    height: apiHeight
                }
                : {
                    width: parentElInner.__ecGraphicWidth,
                    height: parentElInner.__ecGraphicHeight
                };

            // PENDING
            // Currently, when `bounding: 'all'`, the union bounding rect of the group
            // does not include the rect of [0, 0, group.width, group.height], which
            // is probably weird for users. Should we make a break change for it?
            layoutUtil.positionElement(
                el, elOption, containerInfo, null,
                {hv: elOption.hv, boundingMode: elOption.bounding}
            );
        }
    }

    /**
     * Clear all elements.
     */
    private _clear(): void {
        const elMap = this._elMap;
        elMap.each(function (el) {
            removeEl(el, elMap);
        });
        this._elMap = zrUtil.createHashMap();
    }

    dispose(): void {
        this._clear();
    }
}

function createEl(
    id: string,
    targetElParent: graphicUtil.Group,
    elOption: GraphicComponentElementOption,
    elMap: ElementMap
): void {
    const graphicType = elOption.type;

    if (__DEV__) {
        zrUtil.assert(graphicType, 'graphic type MUST be set');
    }

    const Clz = (
        zrUtil.hasOwn(_nonShapeGraphicElements, graphicType)
            // Those graphic elements are not shapes. They should not be
            // overwritten by users, so do them first.
            ? _nonShapeGraphicElements[graphicType as NonShapeGraphicElementType]
            : graphicUtil.getShapeClass(graphicType)
    ) as { new(opt: GraphicComponentElementOption): Element };

    if (__DEV__) {
        zrUtil.assert(Clz, 'graphic type can not be found');
    }

    const el = new Clz(elOption);
    targetElParent.add(el);
    elMap.set(id, el);
    inner(el).__ecGraphicId = id;
}

function removeEl(elExisting: Element, elMap: ElementMap): void {
    const existElParent = elExisting && elExisting.parent;
    if (existElParent) {
        elExisting.type === 'group' && elExisting.traverse(function (el) {
            removeEl(el, elMap);
        });
        elMap.removeKey(inner(elExisting).__ecGraphicId);
        existElParent.remove(elExisting);
    }
}

// Remove unnecessary props to avoid potential problems.
function getCleanedElOption(
    elOption: GraphicComponentElementOption
): Omit<GraphicComponentElementOption, 'textContent'> {
    elOption = zrUtil.extend({}, elOption);
    zrUtil.each(
        ['id', 'parentId', '$action', 'hv', 'bounding', 'textContent'].concat(layoutUtil.LOCATION_PARAMS),
        function (name) {
            delete (elOption as any)[name];
        }
    );
    return elOption;
}

function isSetLoc(
    obj: GraphicComponentElementOption,
    props: ('left' | 'right' | 'top' | 'bottom')[]
): boolean {
    let isSet;
    zrUtil.each(props, function (prop) {
        obj[prop] != null && obj[prop] !== 'auto' && (isSet = true);
    });
    return isSet;
}

function setKeyInfoToNewElOption(
    resultItem: ReturnType<typeof modelUtil.mappingToExists>[number],
    newElOption: GraphicComponentElementOption
): void {
    const existElOption = resultItem.existing as GraphicComponentElementOption;

    // Set id and type after id assigned.
    newElOption.id = resultItem.keyInfo.id;
    !newElOption.type && existElOption && (newElOption.type = existElOption.type);

    // Set parent id if not specified
    if (newElOption.parentId == null) {
        const newElParentOption = newElOption.parentOption;
        if (newElParentOption) {
            newElOption.parentId = newElParentOption.id;
        }
        else if (existElOption) {
            newElOption.parentId = existElOption.parentId;
        }
    }

    // Clear
    newElOption.parentOption = null;
}

function mergeNewElOptionToExist(
    existList: GraphicComponentElementOption[],
    index: number,
    newElOption: GraphicComponentElementOption
): void {
    // Update existing options, for `getOption` feature.
    const newElOptCopy = zrUtil.extend({}, newElOption);
    const existElOption = existList[index];

    const $action = newElOption.$action || 'merge';
    if ($action === 'merge') {
        if (existElOption) {

            if (__DEV__) {
                const newType = newElOption.type;
                zrUtil.assert(
                    !newType || existElOption.type === newType,
                    'Please set $action: "replace" to change `type`'
                );
            }

            // We can ensure that newElOptCopy and existElOption are not
            // the same object, so `merge` will not change newElOptCopy.
            zrUtil.merge(existElOption, newElOptCopy, true);
            // Rigid body, use ignoreSize.
            layoutUtil.mergeLayoutParam(existElOption, newElOptCopy, {ignoreSize: true});
            // Will be used in render.
            layoutUtil.copyLayoutParams(newElOption, existElOption);
        }
        else {
            existList[index] = newElOptCopy;
        }
    }
    else if ($action === 'replace') {
        existList[index] = newElOptCopy;
    }
    else if ($action === 'remove') {
        // null will be cleaned later.
        existElOption && (existList[index] = null);
    }
}

function setLayoutInfoToExist(
    existItem: GraphicComponentElementOption,
    newElOption: GraphicComponentElementOption
) {
    if (!existItem) {
        return;
    }
    existItem.hv = newElOption.hv = [
        // Rigid body, dont care `width`.
        isSetLoc(newElOption, ['left', 'right']),
        // Rigid body, dont care `height`.
        isSetLoc(newElOption, ['top', 'bottom'])
    ];
    // Give default group size. Otherwise layout error may occur.
    if (existItem.type === 'group') {
        const existingGroupOpt = existItem as GraphicComponentGroupOption;
        const newGroupOpt = newElOption as GraphicComponentGroupOption;
        existingGroupOpt.width == null && (existingGroupOpt.width = newGroupOpt.width = 0);
        existingGroupOpt.height == null && (existingGroupOpt.height = newGroupOpt.height = 0);
    }
}

function setEventData(
    el: Element,
    graphicModel: GraphicComponentModel,
    elOption: GraphicComponentElementOption
): void {
    let eventData = getECData(el).eventData;
    // Simple optimize for large amount of elements that no need event.
    if (!el.silent && !el.ignore && !eventData) {
        eventData = getECData(el).eventData = {
            componentType: 'graphic',
            componentIndex: graphicModel.componentIndex,
            name: el.name
        };
    }

    // `elOption.info` enables user to mount some info on
    // elements and use them in event handlers.
    if (eventData) {
        eventData.info = elOption.info;
    }
}

export function install(registers: EChartsExtensionInstallRegisters) {
    registers.registerComponentModel(GraphicComponentModel);
    registers.registerComponentView(GraphicComponentView);
    registers.registerPreprocessor(preprocessor);
}