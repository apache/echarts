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
import env from 'zrender/src/core/env';
import {makeInner} from '../util/model';
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
import { ModelOption } from '../util/types';
import { Dictionary } from 'zrender/src/core/types';

var mixin = zrUtil.mixin;
var inner = makeInner<{getParent(path: string | string[]): Model}>();

// Since model.option can be not only `Dictionary` but also primary types,
// we do this conditional type to avoid getting type 'never';
type Key<Opt> = Opt extends Dictionary<any>
    ? keyof Opt : string;
type Value<Opt, R> = Opt extends Dictionary<any>
    ? (R extends keyof Opt ? Opt[R] : ModelOption)
    : ModelOption;

class Model<Opt extends ModelOption = ModelOption> {    // TODO: TYPE use unkown insteadof any?

    // [Caution]: for compat the previous "class extend"
    // publich and protected fields must be initialized on
    // prototype rather than in constructor. Otherwise the
    // subclass overrided filed will be overwritten by this
    // class. That is, they should not be initialized here.

    /**
     * @readOnly
     */
    parentModel: Model;

    /**
     * @readOnly
     */
    ecModel: GlobalModel;;

    /**
     * @readOnly
     */
    option: Opt;

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
        zrUtil.merge(this.option, option, true);
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

        return doGet(
            this.option,
            this.parsePath(path),
            !ignoreParent && getParent(this, path)
        );
    }

    getShallow<R extends keyof Opt>(
        key: R, ignoreParent?: boolean
    ): Opt[R] {
        var option = this.option;

        var val = option == null ? option : option[key];
        if (val == null) {
            var parentModel = !ignoreParent && getParent(this, key as string);
            if (parentModel) {
                // FIXME:TS do not know how to make it works
                val = parentModel.getShallow(key);
            }
        }
        return val;
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
    getModel<R extends keyof Opt, S extends keyof Opt[R], T extends keyof Opt[R][S]>(
        path: readonly [R, S, T], parentModel?: Model
    ): Model<Opt[R][S][T]>;
    // `path` can be 'xxx.yyy.zzz', so the return value type have to be `Model<ModelOption>`
    // getModel(path: string | string[], parentModel?: Model): Model;
    // TODO 'xxx.yyy.zzz' is deprecated
    getModel(path: string | readonly string[], parentModel?: Model): Model<any> {
        var hasPath = path != null;
        var pathFinal = hasPath ? this.parsePath(path) : null;
        var obj = hasPath
            ? doGet(this.option, pathFinal)
            : this.option;

        var thisParentModel;
        parentModel = parentModel || (
            (thisParentModel = getParent(this, pathFinal))
                && thisParentModel.getModel(pathFinal as readonly [string])
        );

        return new Model(obj, parentModel, this.ecModel);
    }

    /**
     * If model has option
     */
    isEmpty(): boolean {
        return this.option == null;
    }

    restoreData(): void {}

    // Pending
    clone(): Model<Opt> {
        var Ctor = this.constructor;
        return new (Ctor as any)(zrUtil.clone(this.option));
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

    customizeGetParent(
        getParentMethod: (path: string | string[]) => Model
    ): void {
        inner(this).getParent = getParentMethod;
    }

    // FIXME:TS check whether put this method here
    isAnimationEnabled(): boolean {
        if (!env.node) {
            if (this.option.animation != null) {
                return !!this.option.animation;
            }
            else if (this.parentModel) {
                return this.parentModel.isAnimationEnabled();
            }
        }
    }

};

function doGet(obj: ModelOption, pathArr: readonly string[], parentModel?: Model<Dictionary<any>>) {
    for (var i = 0; i < pathArr.length; i++) {
        // Ignore empty
        if (!pathArr[i]) {
            continue;
        }
        // obj could be number/string/... (like 0)
        obj = (obj && typeof obj === 'object') ? obj[pathArr[i] as keyof ModelOption] : null;
        if (obj == null) {
            break;
        }
    }
    if (obj == null && parentModel) {
        // TODO At most 3 items array. support string[]?
        obj = parentModel.get(pathArr as [string]);
    }
    return obj;
}

// `path` can be null/undefined
function getParent(model: Model, path: string | readonly string[]): Model {
    var getParentMethod = inner(model).getParent;
    return getParentMethod ? getParentMethod.call(model, path) : model.parentModel;
}

type ModelConstructor = typeof Model
    & ExtendableConstructor
    & CheckableConstructor;

// Enable Model.extend.
enableClassExtend(Model as ModelConstructor);
enableClassCheck(Model as ModelConstructor);

interface Model extends LineStyleMixin, ItemStyleMixin, TextStyleMixin, AreaStyleMixin {}
mixin(Model, LineStyleMixin);
mixin(Model, ItemStyleMixin);
mixin(Model, AreaStyleMixin);
mixin(Model, TextStyleMixin);

export default Model;
