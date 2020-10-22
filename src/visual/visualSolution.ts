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
 * @file Visual solution, for consistent option specification.
 */

import * as zrUtil from 'zrender/src/core/util';
import VisualMapping, { VisualMappingOption } from './VisualMapping';
import { Dictionary } from 'zrender/src/core/types';
import {
    BuiltinVisualProperty,
    ParsedValue,
    DimensionLoose,
    StageHandlerProgressExecutor
} from '../util/types';
import List from '../data/List';
import { getItemVisualFromData, setItemVisualFromData } from './helper';

const each = zrUtil.each;

type VisualMappingCollection<VisualState extends string>
    = {
        [key in VisualState]?: {
            [key in BuiltinVisualProperty]?: VisualMapping
        } & {
            __alphaForOpacity?: VisualMapping
        }
    };

function hasKeys(obj: Dictionary<any>) {
    if (obj) {
        for (const name in obj) {
            if (obj.hasOwnProperty(name)) {
                return true;
            }
        }
    }
}

type VisualOption = {[key in BuiltinVisualProperty]?: any};


export function createVisualMappings<VisualState extends string>(
    option: Partial<Record<VisualState, VisualOption>>,
    stateList: readonly VisualState[],
    supplementVisualOption: (mappingOption: VisualMappingOption, state: string) => void
) {
    const visualMappings: VisualMappingCollection<VisualState> = {};

    each(stateList, function (state) {
        const mappings = visualMappings[state] = createMappings();

        each(option[state], function (visualData: VisualOption, visualType: BuiltinVisualProperty) {
            if (!VisualMapping.isValidType(visualType)) {
                return;
            }
            let mappingOption = {
                type: visualType,
                visual: visualData
            };
            supplementVisualOption && supplementVisualOption(mappingOption, state);
            mappings[visualType] = new VisualMapping(mappingOption);

            // Prepare a alpha for opacity, for some case that opacity
            // is not supported, such as rendering using gradient color.
            if (visualType === 'opacity') {
                mappingOption = zrUtil.clone(mappingOption);
                mappingOption.type = 'colorAlpha';
                mappings.__hidden.__alphaForOpacity = new VisualMapping(mappingOption);
            }
        });
    });

    return visualMappings;

    function createMappings() {
        const Creater = function () {};
        // Make sure hidden fields will not be visited by
        // object iteration (with hasOwnProperty checking).
        Creater.prototype.__hidden = Creater.prototype;
        const obj = new (Creater as any)();
        return obj;
    }
}

export function replaceVisualOption<T extends string>(
    thisOption: Partial<Record<T, any>>, newOption: Partial<Record<T, any>>, keys: readonly T[]
) {
    // Visual attributes merge is not supported, otherwise it
    // brings overcomplicated merge logic. See #2853. So if
    // newOption has anyone of these keys, all of these keys
    // will be reset. Otherwise, all keys remain.
    let has;
    zrUtil.each(keys, function (key) {
        if (newOption.hasOwnProperty(key) && hasKeys(newOption[key])) {
            has = true;
        }
    });
    has && zrUtil.each(keys, function (key) {
        if (newOption.hasOwnProperty(key) && hasKeys(newOption[key])) {
            thisOption[key] = zrUtil.clone(newOption[key]);
        }
        else {
            delete thisOption[key];
        }
    });
}

/**
 * @param stateList
 * @param visualMappings
 * @param list
 * @param getValueState param: valueOrIndex, return: state.
 * @param scope Scope for getValueState
 * @param dimension Concrete dimension, if used.
 */
// ???! handle brush?
export function applyVisual<VisualState extends string, Scope>(
    stateList: readonly VisualState[],
    visualMappings: VisualMappingCollection<VisualState>,
    data: List,
    getValueState: (this: Scope, valueOrIndex: ParsedValue | number) => VisualState,
    scope?: Scope,
    dimension?: DimensionLoose
) {
    const visualTypesMap: Partial<Record<VisualState, BuiltinVisualProperty[]>> = {};
    zrUtil.each(stateList, function (state) {
        const visualTypes = VisualMapping.prepareVisualTypes(visualMappings[state]);
        visualTypesMap[state] = visualTypes;
    });

    let dataIndex: number;

    function getVisual(key: string) {
        return getItemVisualFromData(data, dataIndex, key) as string | number;
    }

    function setVisual(key: string, value: any) {
        setItemVisualFromData(data, dataIndex, key, value);
    }

    if (dimension == null) {
        data.each(eachItem);
    }
    else {
        data.each([dimension], eachItem);
    }

    function eachItem(valueOrIndex: ParsedValue | number, index?: number) {
        dataIndex = dimension == null
            ? valueOrIndex as number    // First argument is index
            : index;

        const rawDataItem = data.getRawDataItem(dataIndex);
        // Consider performance
        // @ts-ignore
        if (rawDataItem && rawDataItem.visualMap === false) {
            return;
        }

        const valueState = getValueState.call(scope, valueOrIndex);
        const mappings = visualMappings[valueState];
        const visualTypes = visualTypesMap[valueState];

        for (let i = 0, len = visualTypes.length; i < len; i++) {
            const type = visualTypes[i];
            mappings[type] && mappings[type].applyVisual(
                valueOrIndex, getVisual, setVisual
            );
        }
    }
}

/**
 * @param data
 * @param stateList
 * @param visualMappings <state, Object.<visualType, module:echarts/visual/VisualMapping>>
 * @param getValueState param: valueOrIndex, return: state.
 * @param dim dimension or dimension index.
 */
export function incrementalApplyVisual<VisualState extends string>(
    stateList: readonly VisualState[],
    visualMappings: VisualMappingCollection<VisualState>,
    getValueState: (valueOrIndex: ParsedValue | number) => VisualState,
    dim?: DimensionLoose
): StageHandlerProgressExecutor {
    const visualTypesMap: Partial<Record<VisualState, BuiltinVisualProperty[]>> = {};
    zrUtil.each(stateList, function (state) {
        const visualTypes = VisualMapping.prepareVisualTypes(visualMappings[state]);
        visualTypesMap[state] = visualTypes;
    });

    return {
        progress: function progress(params, data) {
            let dimName: string;
            if (dim != null) {
                dimName = data.getDimension(dim);
            }

            function getVisual(key: string) {
                return getItemVisualFromData(data, dataIndex, key) as string | number;
            }

            function setVisual(key: string, value: any) {
                setItemVisualFromData(data, dataIndex, key, value);
            }

            let dataIndex: number;
            while ((dataIndex = params.next()) != null) {
                const rawDataItem = data.getRawDataItem(dataIndex);

                // Consider performance
                // @ts-ignore
                if (rawDataItem && rawDataItem.visualMap === false) {
                    continue;
                }

                const value = dim != null
                    ? data.get(dimName, dataIndex)
                    : dataIndex;

                const valueState = getValueState(value);
                const mappings = visualMappings[valueState];
                const visualTypes = visualTypesMap[valueState];

                for (let i = 0, len = visualTypes.length; i < len; i++) {
                    const type = visualTypes[i];
                    mappings[type] && mappings[type].applyVisual(value, getVisual, setVisual);
                }
            }
        }
    };
}
