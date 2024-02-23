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
import { Dictionary } from 'zrender/src/core/types';
import { ComponentFullType, ComponentTypeInfo, ComponentMainType, ComponentSubType } from './types';

const TYPE_DELIMITER = '.';
const IS_CONTAINER = '___EC__COMPONENT__CONTAINER___' as const;
const IS_EXTENDED_CLASS = '___EC__EXTENDED_CLASS___' as const;

/**
 * Notice, parseClassType('') should returns {main: '', sub: ''}
 * @public
 */
export function parseClassType(componentType: ComponentFullType): ComponentTypeInfo {
    const ret = {main: '', sub: ''};
    if (componentType) {
        const typeArr = componentType.split(TYPE_DELIMITER);
        ret.main = typeArr[0] || '';
        ret.sub = typeArr[1] || '';
    }
    return ret;
}

/**
 * @public
 */
function checkClassType(componentType: ComponentFullType): void {
    zrUtil.assert(
        /^[a-zA-Z0-9_]+([.][a-zA-Z0-9_]+)?$/.test(componentType),
        'componentType "' + componentType + '" illegal'
    );
}

export function isExtendedClass(clz: any): boolean {
    return !!(clz && clz[IS_EXTENDED_CLASS]);
}


export interface ExtendableConstructor {
    new (...args: any): any;
    $constructor?: new (...args: any) => any;
    extend: (proto: {[name: string]: any}) => ExtendableConstructor;
    superCall: (context: any, methodName: string, ...args: any) => any;
    superApply: (context: any, methodName: string, args: []) => any;
    superClass?: ExtendableConstructor;
    [IS_EXTENDED_CLASS]?: boolean;
}

/**
 * Implements `ExtendableConstructor` for `rootClz`.
 *
 * @usage
 * ```ts
 * class Xxx {}
 * type XxxConstructor = typeof Xxx & ExtendableConstructor
 * enableClassExtend(Xxx as XxxConstructor);
 * ```
 */
export function enableClassExtend(rootClz: ExtendableConstructor, mandatoryMethods?: string[]): void {

    rootClz.$constructor = rootClz; // FIXME: not necessary?

    rootClz.extend = function (proto: Dictionary<any>) {
        if (__DEV__) {
            zrUtil.each(mandatoryMethods, function (method) {
                if (!proto[method]) {
                    console.warn(
                        'Method `' + method + '` should be implemented'
                        + (proto.type ? ' in ' + proto.type : '') + '.'
                    );
                }
            });
        }

        const superClass = this;
        let ExtendedClass: any;

        if (isESClass(superClass)) {
            ExtendedClass = class extends superClass {
                constructor() {
                    super(...arguments as any);
                }
            };
        }
        else {
            // For backward compat, we both support ts class inheritance and this
            // "extend" approach.
            // The constructor should keep the same behavior as ts class inheritance:
            // If this constructor/$constructor is not declared, auto invoke the super
            // constructor.
            // If this constructor/$constructor is declared, it is responsible for
            // calling the super constructor.
            ExtendedClass = function (this: any) {
                (proto.$constructor || superClass).apply(this, arguments);
            };

            zrUtil.inherits(ExtendedClass, this);
        }

        zrUtil.extend(ExtendedClass.prototype, proto);
        ExtendedClass[IS_EXTENDED_CLASS] = true;

        ExtendedClass.extend = this.extend;
        ExtendedClass.superCall = superCall;
        ExtendedClass.superApply = superApply;
        ExtendedClass.superClass = superClass;

        return ExtendedClass as unknown as ExtendableConstructor;
    };
}

function isESClass(fn: unknown): boolean {
    return zrUtil.isFunction(fn)
        && /^class\s/.test(Function.prototype.toString.call(fn));
}

/**
 * A work around to both support ts extend and this extend mechanism.
 * on sub-class.
 * @usage
 * ```ts
 * class Component { ... }
 * classUtil.enableClassExtend(Component);
 * classUtil.enableClassManagement(Component, {registerWhenExtend: true});
 *
 * class Series extends Component { ... }
 * // Without calling `markExtend`, `registerWhenExtend` will not work.
 * Component.markExtend(Series);
 * ```
 */
export function mountExtend(SubClz: any, SupperClz: any): void {
    SubClz.extend = SupperClz.extend;
}


export interface CheckableConstructor {
    new (...args: any): any;
    isInstance: (ins: any) => boolean;
}

// A random offset.
let classBase = Math.round(Math.random() * 10);

/**
 * Implements `CheckableConstructor` for `target`.
 * Can not use instanceof, consider different scope by
 * cross domain or es module import in ec extensions.
 * Mount a method "isInstance()" to Clz.
 *
 * @usage
 * ```ts
 * class Xxx {}
 * type XxxConstructor = typeof Xxx & CheckableConstructor;
 * enableClassCheck(Xxx as XxxConstructor)
 * ```
 */
export function enableClassCheck(target: CheckableConstructor): void {
    const classAttr = ['__\0is_clz', classBase++].join('_');
    target.prototype[classAttr] = true;

    if (__DEV__) {
        zrUtil.assert(!target.isInstance, 'The method "is" can not be defined.');
    }

    target.isInstance = function (obj) {
        return !!(obj && obj[classAttr]);
    };
}

// superCall should have class info, which can not be fetched from 'this'.
// Consider this case:
// class A has method f,
// class B inherits class A, overrides method f, f call superApply('f'),
// class C inherits class B, does not override method f,
// then when method of class C is called, dead loop occurred.
function superCall(this: any, context: any, methodName: string, ...args: any): any {
    return this.superClass.prototype[methodName].apply(context, args);
}

function superApply(this: any, context: any, methodName: string, args: any): any {
    return this.superClass.prototype[methodName].apply(context, args);
}

export type Constructor = new (...args: any) => any;
type SubclassContainer = {[subType: string]: Constructor} & {[IS_CONTAINER]?: true};

export interface ClassManager {
    registerClass: (clz: Constructor) => Constructor;
    getClass: (
        componentMainType: ComponentMainType, subType?: ComponentSubType, throwWhenNotFound?: boolean
    ) => Constructor;
    getClassesByMainType: (componentType: ComponentMainType) => Constructor[];
    hasClass: (componentType: ComponentFullType) => boolean;
    getAllClassMainTypes: () => ComponentMainType[];
    hasSubTypes: (componentType: ComponentFullType) => boolean;
}

/**
 * Implements `ClassManager` for `target`
 *
 * @usage
 * ```ts
 * class Xxx {}
 * type XxxConstructor = typeof Xxx & ClassManager
 * enableClassManagement(Xxx as XxxConstructor);
 * ```
 */
export function enableClassManagement(
    target: ClassManager
): void {

    /**
     * Component model classes
     * key: componentType,
     * value:
     *     componentClass, when componentType is 'a'
     *     or Object.<subKey, componentClass>, when componentType is 'a.b'
     */
    const storage: {
        [componentMainType: string]: (Constructor | SubclassContainer)
    } = {};

    target.registerClass = function (
        clz: Constructor
    ): Constructor {

        // `type` should not be a "instance member".
        // If using TS class, should better declared as `static type = 'series.pie'`.
        // otherwise users have to mount `type` on prototype manually.
        // For backward compat and enable instance visit type via `this.type`,
        // we still support fetch `type` from prototype.
        const componentFullType = (clz as any).type || clz.prototype.type;

        if (componentFullType) {
            checkClassType(componentFullType);

            // If only static type declared, we assign it to prototype mandatorily.
            clz.prototype.type = componentFullType;

            const componentTypeInfo = parseClassType(componentFullType);

            if (!componentTypeInfo.sub) {
                if (__DEV__) {
                    if (storage[componentTypeInfo.main]) {
                        console.warn(componentTypeInfo.main + ' exists.');
                    }
                }
                storage[componentTypeInfo.main] = clz;
            }
            else if (componentTypeInfo.sub !== IS_CONTAINER) {
                const container = makeContainer(componentTypeInfo);
                container[componentTypeInfo.sub] = clz;
            }
        }
        return clz;
    };

    target.getClass = function (
        mainType: ComponentMainType,
        subType?: ComponentSubType,
        throwWhenNotFound?: boolean
    ): Constructor {
        let clz = storage[mainType];

        if (clz && (clz as SubclassContainer)[IS_CONTAINER]) {
            clz = subType ? (clz as SubclassContainer)[subType] : null;
        }

        if (throwWhenNotFound && !clz) {
            throw new Error(
                !subType
                    ? mainType + '.' + 'type should be specified.'
                    : 'Component ' + mainType + '.' + (subType || '') + ' is used but not imported.'
            );
        }

        return clz as Constructor;
    };

    target.getClassesByMainType = function (componentType: ComponentFullType): Constructor[] {
        const componentTypeInfo = parseClassType(componentType);

        const result: Constructor[] = [];
        const obj = storage[componentTypeInfo.main];

        if (obj && (obj as SubclassContainer)[IS_CONTAINER]) {
            zrUtil.each(obj as SubclassContainer, function (o, type) {
                type !== IS_CONTAINER && result.push(o as Constructor);
            });
        }
        else {
            result.push(obj as Constructor);
        }

        return result;
    };

    target.hasClass = function (componentType: ComponentFullType): boolean {
        // Just consider componentType.main.
        const componentTypeInfo = parseClassType(componentType);
        return !!storage[componentTypeInfo.main];
    };

    /**
     * @return Like ['aa', 'bb'], but can not be ['aa.xx']
     */
    target.getAllClassMainTypes = function (): ComponentMainType[] {
        const types: string[] = [];
        zrUtil.each(storage, function (obj, type) {
            types.push(type);
        });
        return types;
    };

    /**
     * If a main type is container and has sub types
     */
    target.hasSubTypes = function (componentType: ComponentFullType): boolean {
        const componentTypeInfo = parseClassType(componentType);
        const obj = storage[componentTypeInfo.main];
        return obj && (obj as SubclassContainer)[IS_CONTAINER];
    };

    function makeContainer(componentTypeInfo: ComponentTypeInfo): SubclassContainer {
        let container = storage[componentTypeInfo.main];
        if (!container || !(container as SubclassContainer)[IS_CONTAINER]) {
            container = storage[componentTypeInfo.main] = {};
            container[IS_CONTAINER] = true;
        }
        return container as SubclassContainer;
    }
}

// /**
//  * @param {string|Array.<string>} properties
//  */
// export function setReadOnly(obj, properties) {
    // FIXME It seems broken in IE8 simulation of IE11
    // if (!zrUtil.isArray(properties)) {
    //     properties = properties != null ? [properties] : [];
    // }
    // zrUtil.each(properties, function (prop) {
    //     let value = obj[prop];

    //     Object.defineProperty
    //         && Object.defineProperty(obj, prop, {
    //             value: value, writable: false
    //         });
    //     zrUtil.isArray(obj[prop])
    //         && Object.freeze
    //         && Object.freeze(obj[prop]);
    // });
// }
