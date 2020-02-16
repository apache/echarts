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
 * Data selectable mixin for chart series.
 * To eanble data select, option of series must have `selectedMode`.
 * And each data item will use `selected` to toggle itself selected status
 */

import * as zrUtil from 'zrender/src/core/util';
import Model from '../../model/Model';

export type SelectableTarget = {
    name: string,
    value: any,
    selected: boolean
};

interface DataSelectableMixin extends Pick<Model, 'get'> {};

class DataSelectableMixin {

    private _targetList: SelectableTarget[];

    // Key: target.name
    private _selectTargetMap: zrUtil.HashMap<SelectableTarget>;


    /**
     * @param targetList [{name, value, selected}, ...]
     *        If targetList is an array, it should like [{name: ..., value: ...}, ...].
     *        If targetList is a "List", it must have coordDim: 'value' dimension and name.
     */
    updateSelectedMap(targetList?: SelectableTarget[]): void {
        this._targetList = zrUtil.isArray(targetList) ? targetList.slice() : [];

        this._selectTargetMap = zrUtil.reduce(targetList || [], function (targetMap, target) {
            targetMap.set(target.name, target);
            return targetMap;
        }, zrUtil.createHashMap());
    }

    /**
     * Either name or id should be passed as input here.
     * If both of them are defined, id is used.
     *
     * @param name name of data. Can be null/undefined.
     * @param idx dataIndex of data. Can be null/undefined.
     */
    // PENGING If selectedMode is null ?
    select(name?: string, idx?: number): void {
        var target = idx != null
            ? this._targetList[idx]
            : this._selectTargetMap.get(name);
        var selectedMode = this.get('selectedMode');
        if (selectedMode === 'single') {
            this._selectTargetMap.each(function (target) {
                target.selected = false;
            });
        }
        target && (target.selected = true);
    }

    /**
     * Either name or id should be passed as input here.
     * If both of them are defined, id is used.
     *
     * @param name name of data. Can be null/undefined.
     * @param idx dataIndex of data. Can be null/undefined.
     */
    unSelect(name?: string, idx?: number): void {
        var target = idx != null
            ? this._targetList[idx]
            : this._selectTargetMap.get(name);
        // var selectedMode = this.get('selectedMode');
        // selectedMode !== 'single' && target && (target.selected = false);
        target && (target.selected = false);
    }

    /**
     * Either name or id should be passed as input here.
     * If both of them are defined, id is used.
     *
     * @param name name of data. Can be null/undefined.
     * @param idx dataIndex of data. Can be null/undefined.
     */
    toggleSelected(name?: string, idx?: number): boolean {
        var target = idx != null
            ? this._targetList[idx]
            : this._selectTargetMap.get(name);
        if (target != null) {
            this[target.selected ? 'unSelect' : 'select'](name, idx);
            return target.selected;
        }
    }

    /**
     * Either name or id should be passed as input here.
     * If both of them are defined, id is used.
     *
     * @param name name of data. Can be null/undefined.
     * @param idx dataIndex of data. Can be null/undefined.
     */
    isSelected(name?: string, idx?: number): boolean {
        var target = idx != null
            ? this._targetList[idx]
            : this._selectTargetMap.get(name);
        return target && target.selected;
    }
}

export {DataSelectableMixin};
