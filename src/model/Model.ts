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

/**
 * @module echarts/model/Model
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

import lineStyleMixin from './mixin/lineStyle';
import areaStyleMixin from './mixin/areaStyle';
import textStyleMixin from './mixin/textStyle';
import itemStyleMixin from './mixin/itemStyle';
import GlobalModel from './Global';
import { ModelOption } from '../util/types';
import { Dictionary } from 'zrender/src/core/types';

var mixin = zrUtil.mixin;
var inner = makeInner();

// Since model.option can be not only `Dictionary` but also primary types,
// we do this conditional type to avoid getting type 'never';
type Key<Opt> = Opt extends Dictionary<any>
    ? keyof Opt : string;
type Value<Opt, R> = Opt extends Dictionary<any>
    ? (R extends keyof Opt ? Opt[R] : ModelOption)
    : ModelOption;

/**
 * @alias module:echarts/model/Model
 * @constructor
 * @param {Object} [option]
 * @param {module:echarts/model/Model} [parentModel]
 * @param {module:echarts/model/Global} [ecModel]
 */
class Model<Opt extends ModelOption = ModelOption> {

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
    get<R extends Key<Opt>>(
        path: [R], ignoreParent?: boolean
    ): Value<Opt, R>;
    get<R extends Key<Opt>, S extends Key<Value<Opt, R>>>(
        path: [R, S], ignoreParent?: boolean
    ): Value<Value<Opt, R>, S>;
    get<R extends Key<Opt>, S extends Key<Value<Opt, R>>, T extends Key<Value<Value<Opt, R>, S>>>(
        path: [R, S, T], ignoreParent?: boolean
    ): Value<Value<Value<Opt, R>, S>, T>;
    // `path` can be 'xxx.yyy.zzz', so the return value type have to be `ModelOption`
    get(path: string | string[], ignoreParent?: boolean): ModelOption;
    get(path: string | string[], ignoreParent?: boolean): ModelOption {
        if (path == null) {
            return this.option;
        }

        return doGet(
            this.option,
            this.parsePath(path),
            !ignoreParent && getParent(this, path)
        );
    }

    getShallow<R extends Key<Opt>>(
        key: R, ignoreParent?: boolean
    ): Value<Opt, R> {
        var option = this.option;

        var val = option == null ? option : option[key];
        var parentModel = !ignoreParent && getParent(this, key as string);
        if (val == null && parentModel) {
            // FIXME:TS do not know how to make it works
            val = parentModel.getShallow(key);
        }
        return val;
    }

    getModel<R extends Key<Opt>>(
        path: [R], parentModel?: Model
    ): Model<Value<Opt, R>>;
    getModel<R extends Key<Opt>, S extends Key<Value<Opt, R>>>(
        path: [R, S], parentModel?: Model
    ): Model<Value<Value<Opt, R>, S>>;
    getModel<R extends Key<Opt>, S extends Key<Value<Opt, R>>, T extends Key<Value<Value<Opt, R>, S>>>(
        path: [R, S, T], parentModel?: Model
    ): Model<Value<Value<Value<Opt, R>, S>, T>>;
    // `path` can be 'xxx.yyy.zzz', so the return value type have to be `Model<ModelOption>`
    getModel(path: string | string[], parentModel?: Model): Model;
    getModel(path: string | string[], parentModel?: Model): Model<any> {
        var obj = path == null
            ? this.option
            : doGet(this.option, path = this.parsePath(path));

        var thisParentModel;
        parentModel = parentModel || (
            (thisParentModel = getParent(this, path))
                && thisParentModel.getModel(path)
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
    parsePath(path: string | string[]): string[] {
        if (typeof path === 'string') {
            path = path.split('.');
        }
        return path;
    }

    /**
     * @param {Function} getParentMethod
     *        param {Array.<string>|string} path
     *        return {module:echarts/model/Model}
     */
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

function doGet(obj: ModelOption, pathArr: string[], parentModel?: Model) {
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
        obj = parentModel.get(pathArr);
    }
    return obj;
}

// `path` can be null/undefined
function getParent(model: Model, path: string | string[]): Model {
    var getParentMethod = inner(model).getParent;
    return getParentMethod ? getParentMethod.call(model, path) : model.parentModel;
}

type ModelConstructor = typeof Model
    & ExtendableConstructor
    & CheckableConstructor;

// Enable Model.extend.
enableClassExtend(Model as ModelConstructor);
enableClassCheck(Model as ModelConstructor);

mixin(Model, lineStyleMixin);
mixin(Model, areaStyleMixin);
mixin(Model, textStyleMixin);
mixin(Model, itemStyleMixin);

export default Model;
