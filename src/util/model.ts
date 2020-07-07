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

import {
    each,
    isObject,
    isArray,
    createHashMap,
    HashMap,
    map,
    assert,
    isString,
    indexOf
} from 'zrender/src/core/util';
import env from 'zrender/src/core/env';
import GlobalModel, { QueryConditionKindB } from '../model/Global';
import ComponentModel from '../model/Component';
import List from '../data/List';
import {
    ComponentOption,
    ComponentMainType,
    ComponentSubType,
    DisplayStateHostOption,
    OptionDataItem,
    OptionDataValue,
    TooltipRenderMode,
    Payload
} from './types';
import { Dictionary } from 'zrender/src/core/types';
import SeriesModel from '../model/Series';
import CartesianAxisModel from '../coord/cartesian/AxisModel';
import GridModel from '../coord/cartesian/GridModel';
import { __DEV__ } from '../config';

/**
 * Make the name displayable. But we should
 * make sure it is not duplicated with user
 * specified name, so use '\0';
 */
const DUMMY_COMPONENT_NAME_PREFIX = 'series\0';

/**
 * If value is not array, then translate it to array.
 * @param  {*} value
 * @return {Array} [value] or value
 */
export function normalizeToArray<T>(value?: T | T[]): T[] {
    return value instanceof Array
        ? value
        : value == null
        ? []
        : [value];
}

/**
 * Sync default option between normal and emphasis like `position` and `show`
 * In case some one will write code like
 *     label: {
 *          show: false,
 *          position: 'outside',
 *          fontSize: 18
 *     },
 *     emphasis: {
 *          label: { show: true }
 *     }
 */
export function defaultEmphasis(
    opt: DisplayStateHostOption,
    key: string,
    subOpts: string[]
): void {
    // Caution: performance sensitive.
    if (opt) {
        opt[key] = opt[key] || {};
        opt.emphasis = opt.emphasis || {};
        opt.emphasis[key] = opt.emphasis[key] || {};

        // Default emphasis option from normal
        for (let i = 0, len = subOpts.length; i < len; i++) {
            const subOptName = subOpts[i];
            if (!opt.emphasis[key].hasOwnProperty(subOptName)
                && opt[key].hasOwnProperty(subOptName)
            ) {
                opt.emphasis[key][subOptName] = opt[key][subOptName];
            }
        }
    }
}

export const TEXT_STYLE_OPTIONS = [
    'fontStyle', 'fontWeight', 'fontSize', 'fontFamily',
    'rich', 'tag', 'color', 'textBorderColor', 'textBorderWidth',
    'width', 'height', 'lineHeight', 'align', 'verticalAlign', 'baseline',
    'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY',
    'textShadowColor', 'textShadowBlur', 'textShadowOffsetX', 'textShadowOffsetY',
    'backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'padding'
] as const;

// modelUtil.LABEL_OPTIONS = modelUtil.TEXT_STYLE_OPTIONS.concat([
//     'position', 'offset', 'rotate', 'origin', 'show', 'distance', 'formatter',
//     'fontStyle', 'fontWeight', 'fontSize', 'fontFamily',
//     // FIXME: deprecated, check and remove it.
//     'textStyle'
// ]);

/**
 * The method do not ensure performance.
 * data could be [12, 2323, {value: 223}, [1221, 23], {value: [2, 23]}]
 * This helper method retieves value from data.
 */
export function getDataItemValue(
    dataItem: OptionDataItem
): OptionDataValue | OptionDataValue[] {
    return (isObject(dataItem) && !isArray(dataItem) && !(dataItem instanceof Date))
        ? (dataItem as Dictionary<OptionDataValue>).value : dataItem;
}

/**
 * data could be [12, 2323, {value: 223}, [1221, 23], {value: [2, 23]}]
 * This helper method determine if dataItem has extra option besides value
 */
export function isDataItemOption(dataItem: OptionDataItem): boolean {
    return isObject(dataItem)
        && !(dataItem instanceof Array);
        // // markLine data can be array
        // && !(dataItem[0] && isObject(dataItem[0]) && !(dataItem[0] instanceof Array));
}

type MappingExistItem = {id?: string, name?: string} | ComponentModel;
/**
 * The array `MappingResult<T>[]` exactly represents the content of the result
 * components array after merge.
 * The indices are the same as the `existings`.
 * Items will not be `null`/`undefined` even if the corresponding `existings` will be removed.
 */
type MappingResult<T> = MappingResultItem<T>[];
interface MappingResultItem<T> {
    // Existing component instance.
    existing?: T;
    // The mapped new component option.
    newOption?: ComponentOption;
    // Mark that the new component has nothing to do with any of the old components.
    // So they won't share view. Also see `__requireNewView`.
    brandNew?: boolean;
    // id?: string;
    // name?: string;
    // keyInfo for new component option.
    keyInfo?: {
        name?: string,
        id?: string,
        mainType?: ComponentMainType,
        subType?: ComponentSubType
    };
}

/**
 * Mapping to existings for merge.
 * The mapping result (merge result) will keep the order of the existing
 * component, rather than the order of new option. Because we should ensure
 * some specified index reference (like xAxisIndex) keep work.
 * And in most cases, "merge option" is used to update partial option but not
 * be expected to change the order.
 *
 * @return See the comment of <MappingResult>.
 */
export function mappingToExistsInNormalMerge<T extends MappingExistItem>(
    existings: T[],
    newCmptOptions: ComponentOption[]
): MappingResult<T> {
    newCmptOptions = (newCmptOptions || []).slice();
    existings = existings || [];

    const result: MappingResultItem<T>[] = [];
    // Do not use native `map` to in case that the array `existings`
    // contains elided items, which will be ommited.
    for (let index = 0; index < existings.length; index++) {
        // Because of replaceMerge, `existing` may be null/undefined.
        result.push({ existing: existings[index] });
    }

    // Mapping by id or name if specified.
    each(newCmptOptions, function (cmptOption, index) {
        if (!isObject<ComponentOption>(cmptOption)) {
            newCmptOptions[index] = null;
            return;
        }

        // id has highest priority.
        for (let i = 0; i < result.length; i++) {
            const existing = result[i].existing;
            if (!result[i].newOption // Consider name: two map to one.
                && cmptOption.id != null
                && existing
                && existing.id === cmptOption.id + ''
            ) {
                result[i].newOption = cmptOption;
                newCmptOptions[index] = null;
                return;
            }
        }

        for (let i = 0; i < result.length; i++) {
            const existing = result[i].existing;
            if (!result[i].newOption // Consider name: two map to one.
                // Can not match when both ids existing but different.
                && existing
                && (existing.id == null || cmptOption.id == null)
                && cmptOption.name != null
                && !isIdInner(cmptOption)
                && !isIdInner(existing)
                && existing.name === cmptOption.name + ''
            ) {
                result[i].newOption = cmptOption;
                newCmptOptions[index] = null;
                return;
            }
        }
    });

    mappingByIndexFinally(newCmptOptions, result, false);

    return result;
}

/**
 * Mapping to exists for merge.
 * The mode "replaceMerge" means that:
 * (1) Only the id mapped components will be merged.
 * (2) Other existing components (except inner compoonets) will be removed.
 * (3) Other new options will be used to create new component.
 * (4) The index of the existing compoents will not be modified.
 * That means their might be "hole" after the removal.
 * The new components are created first at those available index.
 *
 * @return See the comment of <MappingResult>.
 */
export function mappingToExistsInReplaceMerge<T extends MappingExistItem>(
    existings: T[],
    newCmptOptions: ComponentOption[]
): MappingResult<T> {

    existings = existings || [];
    newCmptOptions = (newCmptOptions || []).slice();
    const existingIdIdxMap = createHashMap<number>();
    const result = [] as MappingResult<T>;

    // Do not use native `each` to in case that the array `existings`
    // contains elided items, which will be ommited.
    for (let index = 0; index < existings.length; index++) {
        const existing = existings[index];
        let innerExisting: T;
        // Because of replaceMerge, `existing` may be null/undefined.
        if (existing) {
            if (isIdInner(existing)) {
                // inner components should not be removed.
                innerExisting = existing;
            }
            // Input with inner id is allowed for convenience of some internal usage.
            existingIdIdxMap.set(existing.id, index);
        }
        result.push({ existing: innerExisting });
    }

    // Mapping by id if specified.
    each(newCmptOptions, function (cmptOption, index) {
        if (!isObject<ComponentOption>(cmptOption)) {
            newCmptOptions[index] = null;
            return;
        }
        const optionId = cmptOption.id + '';
        const existingIdx = existingIdIdxMap.get(optionId);
        if (existingIdx != null) {
            if (__DEV__) {
                assert(
                    !result[existingIdx].newOption,
                    'Duplicated option on id "' + optionId + '".'
                );
            }
            result[existingIdx].newOption = cmptOption;
            // Mark not to be removed but to be merged.
            // In this case the existing component will be merged with the new option if `subType` is the same,
            // or replaced with a new created component if the `subType` is different.
            result[existingIdx].existing = existings[existingIdx];
            newCmptOptions[index] = null;
        }
    });

    mappingByIndexFinally(newCmptOptions, result, true);

    // The array `result` MUST NOT contain elided items, otherwise the
    // forEach will ommit those items and result in incorrect result.
    return result;
}

function mappingByIndexFinally<T extends MappingExistItem>(
    newCmptOptions: ComponentOption[],
    mappingResult: MappingResult<T>,
    allBrandNew: boolean
): void {
    let nextIdx = 0;
    each(newCmptOptions, function (cmptOption) {
        if (!cmptOption) {
            return;
        }

        // Find the first place that not mapped by id and not inner component (consider the "hole").
        let resultItem;
        while (
            // Be `!resultItem` only when `nextIdx >= mappingResult.length`.
            (resultItem = mappingResult[nextIdx])
            // (1) Existing models that already have id should be able to mapped to. Because
            // after mapping performed, model will always be assigned with an id if user not given.
            // After that all models have id.
            // (2) If new option has id, it can only set to a hole or append to the last. It should
            // not be merged to the existings with different id. Because id should not be overwritten.
            // (3) Name can be overwritten, because axis use name as 'show label text'.
            && (
                (cmptOption.id != null && resultItem.existing)
                || resultItem.newOption
                || isIdInner(resultItem.existing)
            )
        ) {
            nextIdx++;
        }

        if (resultItem) {
            resultItem.newOption = cmptOption;
            resultItem.brandNew = allBrandNew;
        }
        else {
            mappingResult.push({ newOption: cmptOption, brandNew: allBrandNew });
        }
        nextIdx++;
    });
}

/**
 * Make id and name for mapping result (result of mappingToExists)
 * into `keyInfo` field.
 */
export function makeIdAndName(
    mapResult: MappingResult<MappingExistItem>
): void {
    // We use this id to hash component models and view instances
    // in echarts. id can be specified by user, or auto generated.

    // The id generation rule ensures new view instance are able
    // to mapped to old instance when setOption are called in
    // no-merge mode. So we generate model id by name and plus
    // type in view id.

    // name can be duplicated among components, which is convenient
    // to specify multi components (like series) by one name.

    // Ensure that each id is distinct.
    const idMap = createHashMap();

    each(mapResult, function (item) {
        const existing = item.existing;
        existing && idMap.set(existing.id, item);
    });

    each(mapResult, function (item) {
        const opt = item.newOption;

        assert(
            !opt || opt.id == null || !idMap.get(opt.id) || idMap.get(opt.id) === item,
            'id duplicates: ' + (opt && opt.id)
        );

        opt && opt.id != null && idMap.set(opt.id, item);
        !item.keyInfo && (item.keyInfo = {});
    });

    // Make name and id.
    each(mapResult, function (item, index) {
        const existing = item.existing;
        const opt = item.newOption;
        const keyInfo = item.keyInfo;

        if (!isObject<ComponentOption>(opt)) {
            return;
        }

        // name can be overwitten. Consider case: axis.name = '20km'.
        // But id generated by name will not be changed, which affect
        // only in that case: setOption with 'not merge mode' and view
        // instance will be recreated, which can be accepted.
        keyInfo.name = opt.name != null
            ? opt.name + ''
            : existing
            ? existing.name
            // Avoid diffferent series has the same name,
            // because name may be used like in color pallet.
            : DUMMY_COMPONENT_NAME_PREFIX + index;

        if (existing) {
            keyInfo.id = existing.id;
        }
        else if (opt.id != null) {
            keyInfo.id = opt.id + '';
        }
        else {
            // Consider this situatoin:
            //  optionA: [{name: 'a'}, {name: 'a'}, {..}]
            //  optionB [{..}, {name: 'a'}, {name: 'a'}]
            // Series with the same name between optionA and optionB
            // should be mapped.
            let idNum = 0;
            do {
                keyInfo.id = '\0' + keyInfo.name + '\0' + idNum++;
            }
            while (idMap.get(keyInfo.id));
        }

        idMap.set(keyInfo.id, item);
    });
}

export function isNameSpecified(componentModel: ComponentModel): boolean {
    const name = componentModel.name;
    // Is specified when `indexOf` get -1 or > 0.
    return !!(name && name.indexOf(DUMMY_COMPONENT_NAME_PREFIX));
}

/**
 * @public
 * @param {Object} cmptOption
 * @return {boolean}
 */
export function isIdInner(cmptOption: ComponentOption): boolean {
    return cmptOption
        && cmptOption.id
        && (cmptOption.id + '').indexOf('\0_ec_\0') === 0;
}

type BatchItem = {
    seriesId: string,
    dataIndex: number[]
};
/**
 * A helper for removing duplicate items between batchA and batchB,
 * and in themselves, and categorize by series.
 *
 * @param batchA Like: [{seriesId: 2, dataIndex: [32, 4, 5]}, ...]
 * @param batchB Like: [{seriesId: 2, dataIndex: [32, 4, 5]}, ...]
 * @return result: [resultBatchA, resultBatchB]
 */
export function compressBatches(
    batchA: BatchItem[],
    batchB: BatchItem[]
): [BatchItem[], BatchItem[]] {

    type InnerMap = {
        [seriesId: string]: {
            [dataIndex: string]: 1
        }
    };
    const mapA = {} as InnerMap;
    const mapB = {} as InnerMap;

    makeMap(batchA || [], mapA);
    makeMap(batchB || [], mapB, mapA);

    return [mapToArray(mapA), mapToArray(mapB)];

    function makeMap(sourceBatch: BatchItem[], map: InnerMap, otherMap?: InnerMap): void {
        for (let i = 0, len = sourceBatch.length; i < len; i++) {
            const seriesId = sourceBatch[i].seriesId;
            const dataIndices = normalizeToArray(sourceBatch[i].dataIndex);
            const otherDataIndices = otherMap && otherMap[seriesId];

            for (let j = 0, lenj = dataIndices.length; j < lenj; j++) {
                const dataIndex = dataIndices[j];

                if (otherDataIndices && otherDataIndices[dataIndex]) {
                    otherDataIndices[dataIndex] = null;
                }
                else {
                    (map[seriesId] || (map[seriesId] = {}))[dataIndex] = 1;
                }
            }
        }
    }

    function mapToArray(map: Dictionary<any>, isData?: boolean): any[] {
        const result = [];
        for (const i in map) {
            if (map.hasOwnProperty(i) && map[i] != null) {
                if (isData) {
                    result.push(+i);
                }
                else {
                    const dataIndices = mapToArray(map[i], true);
                    dataIndices.length && result.push({seriesId: i, dataIndex: dataIndices});
                }
            }
        }
        return result;
    }
}

/**
 * @param payload Contains dataIndex (means rawIndex) / dataIndexInside / name
 *                         each of which can be Array or primary type.
 * @return dataIndex If not found, return undefined/null.
 */
export function queryDataIndex(data: List, payload: Payload & {
    dataIndexInside?: number | number[]
    dataIndex?: number | number[]
    name?: string | string[]
}): number | number[] {
    if (payload.dataIndexInside != null) {
        return payload.dataIndexInside;
    }
    else if (payload.dataIndex != null) {
        return isArray(payload.dataIndex)
            ? map(payload.dataIndex, function (value) {
                return data.indexOfRawIndex(value);
            })
            : data.indexOfRawIndex(payload.dataIndex);
    }
    else if (payload.name != null) {
        return isArray(payload.name)
            ? map(payload.name, function (value) {
                return data.indexOfName(value);
            })
            : data.indexOfName(payload.name);
    }
}

/**
 * Enable property storage to any host object.
 * Notice: Serialization is not supported.
 *
 * For example:
 * let inner = zrUitl.makeInner();
 *
 * function some1(hostObj) {
 *      inner(hostObj).someProperty = 1212;
 *      ...
 * }
 * function some2() {
 *      let fields = inner(this);
 *      fields.someProperty1 = 1212;
 *      fields.someProperty2 = 'xx';
 *      ...
 * }
 *
 * @return {Function}
 */
export function makeInner<T, Host extends object>() {
    const key = '__ec_inner_' + innerUniqueIndex++;
    return function (hostObj: Host): T {
        return (hostObj as any)[key] || ((hostObj as any)[key] = {});
    };
}
// A random start point.
let innerUniqueIndex = Math.round(Math.random() * 5);

/**
 * If string, e.g., 'geo', means {geoIndex: 0}.
 * If Object, could contain some of these properties below:
 * {
 *     seriesIndex, seriesId, seriesName,
 *     geoIndex, geoId, geoName,
 *     bmapIndex, bmapId, bmapName,
 *     xAxisIndex, xAxisId, xAxisName,
 *     yAxisIndex, yAxisId, yAxisName,
 *     gridIndex, gridId, gridName,
 *     ... (can be extended)
 * }
 * Each properties can be number|string|Array.<number>|Array.<string>
 * For example, a finder could be
 * {
 *     seriesIndex: 3,
 *     geoId: ['aa', 'cc'],
 *     gridName: ['xx', 'rr']
 * }
 * xxxIndex can be set as 'all' (means all xxx) or 'none' (means not specify)
 * If nothing or null/undefined specified, return nothing.
 */
export type ModelFinderIndexQuery = number | number[] | 'all' | 'none';
export type ModelFinder = string | ModelFinderObject;
export type ModelFinderObject = {
    seriesIndex?: ModelFinderIndexQuery, seriesId?: string, seriesName?: string,
    geoIndex?: ModelFinderIndexQuery, geoId?: string, geoName?: string,
    bmapIndex?: ModelFinderIndexQuery, bmapId?: string, bmapName?: string,
    xAxisIndex?: ModelFinderIndexQuery, xAxisId?: string, xAxisName?: string,
    yAxisIndex?: ModelFinderIndexQuery, yAxisId?: string, yAxisName?: string,
    gridIndex?: ModelFinderIndexQuery, gridId?: string, gridName?: string,
    // ... (can be extended)
    [key: string]: unknown
};
/**
 * {
 *     seriesModels: [seriesModel1, seriesModel2],
 *     seriesModel: seriesModel1, // The first model
 *     geoModels: [geoModel1, geoModel2],
 *     geoModel: geoModel1, // The first model
 *     ...
 * }
 */
type ParsedModelFinderKnown = {
    seriesModels?: SeriesModel[];
    seriesModel?: SeriesModel;
    xAxisModels?: CartesianAxisModel[];
    xAxisModel?: CartesianAxisModel;
    yAxisModels?: CartesianAxisModel[];
    yAxisModel?: CartesianAxisModel;
    gridModels?: GridModel[];
    gridModel?: GridModel;
    dataIndex?: number;
    dataIndexInside?: number;
};
export type ParsedModelFinder = ParsedModelFinderKnown & {
    // other components
    [key: string]: ComponentModel | ComponentModel[];
};

export function parseFinder(
    ecModel: GlobalModel,
    finderInput: ModelFinder,
    opt?: {defaultMainType?: string, includeMainTypes?: string[]}
): ParsedModelFinder {
    let finder: ModelFinderObject;
    if (isString(finderInput)) {
        const obj = {};
        (obj as any)[finderInput + 'Index'] = 0;
        finder = obj;
    }
    else {
        finder = finderInput;
    }

    const defaultMainType = opt && opt.defaultMainType;
    if (defaultMainType
        && !has(finder, defaultMainType + 'Index')
        && !has(finder, defaultMainType + 'Id')
        && !has(finder, defaultMainType + 'Name')
    ) {
        finder[defaultMainType + 'Index'] = 0;
    }

    const result = {} as ParsedModelFinder;

    each(finder, function (value, key) {
        // Exclude 'dataIndex' and other illgal keys.
        if (key === 'dataIndex' || key === 'dataIndexInside') {
            result[key] = value as number;
            return;
        }

        const parsedKey = key.match(/^(\w+)(Index|Id|Name)$/) || [];
        const mainType = parsedKey[1];
        const queryType = (parsedKey[2] || '').toLowerCase() as ('id' | 'index' | 'name');

        if (!mainType
            || !queryType
            || value == null
            || (queryType === 'index' && value === 'none')
            || (opt && opt.includeMainTypes && indexOf(opt.includeMainTypes, mainType) < 0)
        ) {
            return;
        }

        const queryParam = {mainType: mainType} as QueryConditionKindB;
        if (queryType !== 'index' || value !== 'all') {
            queryParam[queryType] = value as any;
        }

        const models = ecModel.queryComponents(queryParam);
        result[mainType + 'Models'] = models;
        result[mainType + 'Model'] = models[0];
    });

    return result;
}

function has(obj: object, prop: string): boolean {
    return obj && obj.hasOwnProperty(prop);
}

export function setAttribute(dom: HTMLElement, key: string, value: any) {
    dom.setAttribute
        ? dom.setAttribute(key, value)
        : ((dom as any)[key] = value);
}

export function getAttribute(dom: HTMLElement, key: string): any {
    return dom.getAttribute
        ? dom.getAttribute(key)
        : (dom as any)[key];
}

export function getTooltipRenderMode(renderModeOption: TooltipRenderMode | 'auto'): TooltipRenderMode {
    if (renderModeOption === 'auto') {
        // Using html when `document` exists, use richText otherwise
        return env.domSupported ? 'html' : 'richText';
    }
    else {
        return renderModeOption || 'html';
    }
}

/**
 * Group a list by key.
 */
export function groupData<T, R extends string | number>(
    array: T[],
    getKey: (item: T) => R // return key
): {
    keys: R[],
    buckets: HashMap<T[]> // hasmap key: the key returned by `getKey`.
} {
    const buckets = createHashMap<T[]>();
    const keys: R[] = [];

    each(array, function (item) {
        const key = getKey(item);
        (buckets.get(key)
            || (keys.push(key), buckets.set(key, []))
        ).push(item);
    });

    return {
        keys: keys,
        buckets: buckets
    };
}
