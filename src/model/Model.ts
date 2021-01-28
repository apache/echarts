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

import env from 'zrender/src/core/env';
import {
    enableClassExtend,
    ExtendableConstructor,
    enableClassCheck,
    CheckableConstructor
} from '../util/clazz';

import {AreaStyleMixin} from './mixin/areaStyle';
import TextStyleMixin from './mixin/textStyle';
import {LineStyleMixin} from './mixin/lineStyle';
import {ItemStyleMixin} from './mixin/itemStyle';
import GlobalModel from './Global';
import { AnimationOptionMixin, ModelOption } from '../util/types';
import { Dictionary } from 'zrender/src/core/types';
import { mixin, clone, merge } from 'zrender/src/core/util';

// Since model.option can be not only `Dictionary` but also primary types,
// we do this conditional type to avoid getting type 'never';
type Key<Opt> = Opt extends Dictionary<any>
    ? keyof Opt : string;
type Value<Opt, R> = Opt extends Dictionary<any>
    ? (R extends keyof Opt ? Opt[R] : ModelOption)
    : ModelOption;

interface Model<Opt = ModelOption>
    extends LineStyleMixin, ItemStyleMixin, TextStyleMixin, AreaStyleMixin {}
class Model<Opt = ModelOption> {    // TODO: TYPE use unkown insteadof any?

    // [Caution]: Becuase this class or desecendants can be used as `XXX.extend(subProto)`,
    // the class members must not be initialized in constructor or declaration place.
    // Otherwise there is bad case:
    //   class A {xxx = 1;}
    //   enableClassExtend(A);
    //   class B extends A {}
    //   var C = B.extend({xxx: 5});
    //   var c = new C();
    //   console.log(c.xxx); // expect 5 but always 1.

    parentModel: Model;

    ecModel: GlobalModel;

    option: Opt;    // TODO Opt should only be object.

    constructor(option?: Opt, parentModel?: Model, ecModel?: GlobalModel) {
        this.parentModel = parentModel;
        this.ecModel = ecModel;
        this.option = option;

        // Simple optimization
        // if (this.init) {
        //     if (arguments.length <= 4) {
        //         this.init(option, parentModel, ecModel, extraOpt);
        //     }
        //     else {
        //         this.init.apply(this, arguments);
        //     }
        // }
    }

    init(option: Opt, parentModel?: Model, ecModel?: GlobalModel, ...rest: any): void {}

    /**
     * Merge the input option to me.
     */
    mergeOption(option: Opt, ecModel?: GlobalModel): void {
        merge(this.option, option, true);
    }

    // FIXME:TS consider there is parentModel,
    // return type have to be ModelOption or can be Option<R>?
    // (Is there any chance that parentModel value type is different?)
    get<R extends keyof Opt>(
        path: R, ignoreParent?: boolean
    ): Opt[R];
    get<R extends keyof Opt>(
        path: readonly [R], ignoreParent?: boolean
    ): Opt[R];
    get<R extends keyof Opt, S extends keyof Opt[R]>(
        path: readonly [R, S], ignoreParent?: boolean
    ): Opt[R][S];
    get<R extends keyof Opt, S extends keyof Opt[R], T extends keyof Opt[R][S]>(
        path: readonly [R, S, T], ignoreParent?: boolean
    ): Opt[R][S][T];
    // `path` can be 'xxx.yyy.zzz', so the return value type have to be `ModelOption`
    // TODO: TYPE strict key check?
    // get(path: string | string[], ignoreParent?: boolean): ModelOption;
    get(path: string | readonly string[], ignoreParent?: boolean): ModelOption {
        if (path == null) {
            return this.option;
        }

        return this._doGet(
            this.parsePath(path),
            !ignoreParent && this.parentModel
        );
    }

    getShallow<R extends keyof Opt>(
        key: R, ignoreParent?: boolean
    ): Opt[R] {
        const option = this.option;

        let val = option == null ? option : option[key];
        if (val == null && !ignoreParent) {
            const parentModel = this.parentModel;
            if (parentModel) {
                // FIXME:TS do not know how to make it works
                val = parentModel.getShallow(key);
            }
        }
        return val as Opt[R];
    }

    // TODO At most 3 depth?
    getModel<R extends keyof Opt>(
        path: R, parentModel?: Model
    ): Model<Opt[R]>;
    getModel<R extends keyof Opt>(
        path: readonly [R], parentModel?: Model
    ): Model<Opt[R]>;
    getModel<R extends keyof Opt, S extends keyof Opt[R]>(
        path: readonly [R, S], parentModel?: Model
    ): Model<Opt[R][S]>;
    getModel<Ra extends keyof Opt, Rb extends keyof Opt, S extends keyof Opt[Rb]>(
        path: readonly [Ra] | readonly [Rb, S], parentModel?: Model
    ): Model<Opt[Ra]> | Model<Opt[Rb][S]>;
    getModel<R extends keyof Opt, S extends keyof Opt[R], T extends keyof Opt[R][S]>(
        path: readonly [R, S, T], parentModel?: Model
    ): Model<Opt[R][S][T]>;
    // `path` can be 'xxx.yyy.zzz', so the return value type have to be `Model<ModelOption>`
    // getModel(path: string | string[], parentModel?: Model): Model;
    // TODO 'xxx.yyy.zzz' is deprecated
    getModel(path: string | readonly string[], parentModel?: Model): Model<any> {
        const hasPath = path != null;
        const pathFinal = hasPath ? this.parsePath(path) : null;
        const obj = hasPath
            ? this._doGet(pathFinal)
            : this.option;

        parentModel = parentModel || (
            this.parentModel
                && this.parentModel.getModel(this.resolveParentPath(pathFinal) as [string])
        );

        return new Model(obj, parentModel, this.ecModel);
    }

    /**
     * Squash option stack into one.
     * parentModel will be removed after squashed.
     *
     * NOTE: resolveParentPath will not be applied here for simplicity. DON'T use this function
     * if resolveParentPath is modified.
     *
     * @param deepMerge If do deep merge. Default to be false.
     */
    // squash(
    //     deepMerge?: boolean,
    //     handleCallback?: (func: () => object) => object
    // ) {
    //     const optionStack = [];
    //     let model: Model = this;
    //     while (model) {
    //         if (model.option) {
    //             optionStack.push(model.option);
    //         }
    //         model = model.parentModel;
    //     }

    //     const newOption = {} as Opt;
    //     let option;
    //     while (option = optionStack.pop()) {    // Top down merge
    //         if (isFunction(option) && handleCallback) {
    //             option = handleCallback(option);
    //         }
    //         if (deepMerge) {
    //             merge(newOption, option);
    //         }
    //         else {
    //             extend(newOption, option);
    //         }
    //     }

    //     // Remove parentModel
    //     this.option = newOption;
    //     this.parentModel = null;
    // }

    /**
     * If model has option
     */
    isEmpty(): boolean {
        return this.option == null;
    }

    restoreData(): void {}

    // Pending
    clone(): Model<Opt> {
        const Ctor = this.constructor;
        return new (Ctor as any)(clone(this.option));
    }

    // setReadOnly(properties): void {
        // clazzUtil.setReadOnly(this, properties);
    // }

    // If path is null/undefined, return null/undefined.
    parsePath(path: string | readonly string[]): readonly string[] {
        if (typeof path === 'string') {
            return path.split('.');
        }
        return path;
    }

    // Resolve path for parent. Perhaps useful when parent use a different property.
    // Default to be a identity resolver.
    // Can be modified to a different resolver.
    resolveParentPath(path: readonly string[]): string[] {
        return path as string[];
    }

    // FIXME:TS check whether put this method here
    isAnimationEnabled(): boolean {
        if (!env.node && this.option) {
            if ((this.option as AnimationOptionMixin).animation != null) {
                return !!(this.option as AnimationOptionMixin).animation;
            }
            else if (this.parentModel) {
                return this.parentModel.isAnimationEnabled();
            }
        }
    }

    private _doGet(pathArr: readonly string[], parentModel?: Model<Dictionary<any>>) {
        let obj = this.option;
        if (!pathArr) {
            return obj;
        }

        for (let i = 0; i < pathArr.length; i++) {
            // Ignore empty
            if (!pathArr[i]) {
                continue;
            }
            // obj could be number/string/... (like 0)
            obj = (obj && typeof obj === 'object')
                ? (obj as ModelOption)[pathArr[i] as keyof ModelOption] : null;
            if (obj == null) {
                break;
            }
        }
        if (obj == null && parentModel) {
            obj = parentModel._doGet(
                this.resolveParentPath(pathArr) as [string],
                parentModel.parentModel
            ) as any;
        }

        return obj;
    }
};

type ModelConstructor = typeof Model
    & ExtendableConstructor
    & CheckableConstructor;

// Enable Model.extend.
enableClassExtend(Model as ModelConstructor);
enableClassCheck(Model as ModelConstructor);


mixin(Model, LineStyleMixin);
mixin(Model, ItemStyleMixin);
mixin(Model, AreaStyleMixin);
mixin(Model, TextStyleMixin);

export default Model;
