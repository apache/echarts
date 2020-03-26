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

import {ArrayLike} from 'zrender/src/core/types';

// return key.
export type DiffKeyGetter = (this: DataDiffer, value: any, index: number) => string;
export type DiffCallbackAdd = (newIndex: number) => void;
export type DiffCallbackUpdate = (newIndex: number, oldIndex: number) => void;
export type DiffCallbackRemove = (oldIndex: number) => void;

type DataIndexMap = {[key: string]: number | number[]};

function defaultKeyGetter<T>(item: T): T {
    return item;
}

class DataDiffer {

    private _old: ArrayLike<any>;
    private _new: ArrayLike<any>;
    private _oldKeyGetter: DiffKeyGetter;
    private _newKeyGetter: DiffKeyGetter;
    private _add: DiffCallbackAdd;
    private _update: DiffCallbackUpdate;
    private _remove: DiffCallbackRemove;

    readonly context: any;

    /**
     * @param context Can be visited by this.context in callback.
     */
    constructor(
        oldArr: ArrayLike<any>,
        newArr: ArrayLike<any>,
        oldKeyGetter?: DiffKeyGetter,
        newKeyGetter?: DiffKeyGetter,
        context?: any
    ) {
        this._old = oldArr;
        this._new = newArr;

        this._oldKeyGetter = oldKeyGetter || defaultKeyGetter;
        this._newKeyGetter = newKeyGetter || defaultKeyGetter;

        // Visible in callback via `this.context`;
        this.context = context;
    }

    /**
     * Callback function when add a data
     */
    add(func: DiffCallbackAdd): DataDiffer {
        this._add = func;
        return this;
    }

    /**
     * Callback function when update a data
     */
    update(func: DiffCallbackUpdate): DataDiffer {
        this._update = func;
        return this;
    }

    /**
     * Callback function when remove a data
     */
    remove(func: DiffCallbackRemove): DataDiffer {
        this._remove = func;
        return this;
    }

    execute(): void {
        const oldArr = this._old;
        const newArr = this._new;

        const oldDataIndexMap: DataIndexMap = {};
        const newDataIndexMap: DataIndexMap = {};
        const oldDataKeyArr: string[] = [];
        const newDataKeyArr: string[] = [];
        let i;

        this._initIndexMap(oldArr, oldDataIndexMap, oldDataKeyArr, '_oldKeyGetter');
        this._initIndexMap(newArr, newDataIndexMap, newDataKeyArr, '_newKeyGetter');

        for (i = 0; i < oldArr.length; i++) {
            const key = oldDataKeyArr[i];
            let idx = newDataIndexMap[key];

            // idx can never be empty array here. see 'set null' logic below.
            if (idx != null) {
                // Consider there is duplicate key (for example, use dataItem.name as key).
                // We should make sure every item in newArr and oldArr can be visited.
                const len = (idx as number[]).length;
                if (len) {
                    len === 1 && (newDataIndexMap[key] = null);
                    idx = (idx as number[]).shift();
                }
                else {
                    newDataIndexMap[key] = null;
                }
                this._update && this._update(idx as number, i);
            }
            else {
                this._remove && this._remove(i);
            }
        }

        for (i = 0; i < newDataKeyArr.length; i++) {
            const key = newDataKeyArr[i];
            if (newDataIndexMap.hasOwnProperty(key)) {
                const idx = newDataIndexMap[key];
                if (idx == null) {
                    continue;
                }
                // idx can never be empty array here. see 'set null' logic above.
                if (!(idx as number[]).length) {
                    this._add && this._add(idx as number);
                }
                else {
                    for (let j = 0, len = (idx as number[]).length; j < len; j++) {
                        this._add && this._add((idx as number[])[j]);
                    }
                }
            }
        }
    }

    private _initIndexMap(
        arr: ArrayLike<any>,
        map: DataIndexMap,
        keyArr: string[],
        keyGetterName: '_oldKeyGetter' | '_newKeyGetter'
    ): void {
        for (let i = 0; i < arr.length; i++) {
            // Add prefix to avoid conflict with Object.prototype.
            const key = '_ec_' + this[keyGetterName](arr[i], i);
            let existence = map[key];
            if (existence == null) {
                keyArr.push(key);
                map[key] = i;
            }
            else {
                if (!(existence as number[]).length) {
                    map[key] = existence = [existence as number];
                }
                (existence as number[]).push(i);
            }
        }
    }

}

export default DataDiffer;
