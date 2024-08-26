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
    indexOf,
    isStringSafe,
    isNumber
} from 'zrender/src/core/util';
import env from 'zrender/src/core/env';
import GlobalModel from '../model/Global';
import ComponentModel, {ComponentModelConstructor} from '../model/Component';
import SeriesData from '../data/SeriesData';
import {
    ComponentOption,
    ComponentMainType,
    ComponentSubType,
    DisplayStateHostOption,
    OptionDataItem,
    OptionDataValue,
    TooltipRenderMode,
    Payload,
    OptionId,
    OptionName,
    InterpolatableValue
} from './types';
import { Dictionary } from 'zrender/src/core/types';
import SeriesModel from '../model/Series';
import CartesianAxisModel from '../coord/cartesian/AxisModel';
import GridModel from '../coord/cartesian/GridModel';
import { isNumeric, getRandomIdBase, getPrecision, round } from './number';
import { warn } from './log';

function interpolateNumber(p0: number, p1: number, percent: number): number {
    return (p1 - p0) * percent + p0;
}

/**
 * Make the name displayable. But we should
 * make sure it is not duplicated with user
 * specified name, so use '\0';
 */
const DUMMY_COMPONENT_NAME_PREFIX = 'series\0';

const INTERNAL_COMPONENT_ID_PREFIX = '\0_ec_\0';

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
 * The method does not ensure performance.
 * data could be [12, 2323, {value: 223}, [1221, 23], {value: [2, 23]}]
 * This helper method retrieves value from data.
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

// Compatible with previous definition: id could be number (but not recommended).
// number and string are treated the same when compared.
// number id will not be converted to string in option.
// number id will be converted to string in component instance id.
export interface MappingExistingItem {
    id?: OptionId;
    name?: string;
};
/**
 * The array `MappingResult<T>[]` exactly represents the content of the result
 * components array after merge.
 * The indices are the same as the `existings`.
 * Items will not be `null`/`undefined` even if the corresponding `existings` will be removed.
 */
type MappingResult<T> = MappingResultItem<T>[];
interface MappingResultItem<T extends MappingExistingItem = MappingExistingItem> {
    // Existing component instance.
    existing: T;
    // The mapped new component option.
    newOption: ComponentOption;
    // Mark that the new component has nothing to do with any of the old components.
    // So they won't share view. Also see `__requireNewView`.
    brandNew: boolean;
    // keyInfo for new component.
    // All of them will be assigned to a created component instance.
    keyInfo: {
        name: string,
        id: string,
        mainType: ComponentMainType,
        subType: ComponentSubType
    };
}

type MappingToExistsMode = 'normalMerge' | 'replaceMerge' | 'replaceAll';

/**
 * Mapping to existings for merge.
 *
 * Mode "normalMege":
 *     The mapping result (merge result) will keep the order of the existing
 *     component, rather than the order of new option. Because we should ensure
 *     some specified index reference (like xAxisIndex) keep work.
 *     And in most cases, "merge option" is used to update partial option but not
 *     be expected to change the order.
 *
 * Mode "replaceMege":
 *     (1) Only the id mapped components will be merged.
 *     (2) Other existing components (except internal components) will be removed.
 *     (3) Other new options will be used to create new component.
 *     (4) The index of the existing components will not be modified.
 *     That means their might be "hole" after the removal.
 *     The new components are created first at those available index.
 *
 * Mode "replaceAll":
 *     This mode try to support that reproduce an echarts instance from another
 *     echarts instance (via `getOption`) in some simple cases.
 *     In this scenario, the `result` index are exactly the consistent with the `newCmptOptions`,
 *     which ensures the component index referring (like `xAxisIndex: ?`) corrent. That is,
 *     the "hole" in `newCmptOptions` will also be kept.
 *     On the contrary, other modes try best to eliminate holes.
 *     PENDING: This is an experimental mode yet.
 *
 * @return See the comment of <MappingResult>.
 */
export function mappingToExists<T extends MappingExistingItem>(
    existings: T[],
    newCmptOptions: ComponentOption[],
    mode: MappingToExistsMode
): MappingResult<T> {

    const isNormalMergeMode = mode === 'normalMerge';
    const isReplaceMergeMode = mode === 'replaceMerge';
    const isReplaceAllMode = mode === 'replaceAll';
    existings = existings || [];
    newCmptOptions = (newCmptOptions || []).slice();
    const existingIdIdxMap = createHashMap<number>();

    // Validate id and name on user input option.
    each(newCmptOptions, function (cmptOption, index) {
        if (!isObject<ComponentOption>(cmptOption)) {
            newCmptOptions[index] = null;
            return;
        }

        if (__DEV__) {
            // There is some legacy case that name is set as `false`.
            // But should work normally rather than throw error.
            if (cmptOption.id != null && !isValidIdOrName(cmptOption.id)) {
                warnInvalidateIdOrName(cmptOption.id);
            }
            if (cmptOption.name != null && !isValidIdOrName(cmptOption.name)) {
                warnInvalidateIdOrName(cmptOption.name);
            }
        }
    });

    const result = prepareResult(existings, existingIdIdxMap, mode);

    if (isNormalMergeMode || isReplaceMergeMode) {
        mappingById(result, existings, existingIdIdxMap, newCmptOptions);
    }

    if (isNormalMergeMode) {
        mappingByName(result, newCmptOptions);
    }

    if (isNormalMergeMode || isReplaceMergeMode) {
        mappingByIndex(result, newCmptOptions, isReplaceMergeMode);
    }
    else if (isReplaceAllMode) {
        mappingInReplaceAllMode(result, newCmptOptions);
    }

    makeIdAndName(result);

    // The array `result` MUST NOT contain elided items, otherwise the
    // forEach will omit those items and result in incorrect result.
    return result;
}

function prepareResult<T extends MappingExistingItem>(
    existings: T[],
    existingIdIdxMap: HashMap<number>,
    mode: MappingToExistsMode
): MappingResultItem<T>[] {
    const result: MappingResultItem<T>[] = [];

    if (mode === 'replaceAll') {
        return result;
    }

    // Do not use native `map` to in case that the array `existings`
    // contains elided items, which will be omitted.
    for (let index = 0; index < existings.length; index++) {
        const existing = existings[index];
        // Because of replaceMerge, `existing` may be null/undefined.
        if (existing && existing.id != null) {
            existingIdIdxMap.set(existing.id, index);
        }
        // For non-internal-componnets:
        //     Mode "normalMerge": all existings kept.
        //     Mode "replaceMerge": all existing removed unless mapped by id.
        // For internal-components:
        //     go with "replaceMerge" approach in both mode.
        result.push({
            existing: (mode === 'replaceMerge' || isComponentIdInternal(existing))
                ? null
                : existing,
            newOption: null,
            keyInfo: null,
            brandNew: null
        });
    }
    return result;
}

function mappingById<T extends MappingExistingItem>(
    result: MappingResult<T>,
    existings: T[],
    existingIdIdxMap: HashMap<number>,
    newCmptOptions: ComponentOption[]
): void {
    // Mapping by id if specified.
    each(newCmptOptions, function (cmptOption, index) {
        if (!cmptOption || cmptOption.id == null) {
            return;
        }
        const optionId = makeComparableKey(cmptOption.id);
        const existingIdx = existingIdIdxMap.get(optionId);
        if (existingIdx != null) {
            const resultItem = result[existingIdx];
            assert(
                !resultItem.newOption,
                'Duplicated option on id "' + optionId + '".'
            );
            resultItem.newOption = cmptOption;
            // In both mode, if id matched, new option will be merged to
            // the existings rather than creating new component model.
            resultItem.existing = existings[existingIdx];
            newCmptOptions[index] = null;
        }
    });
}

function mappingByName<T extends MappingExistingItem>(
    result: MappingResult<T>,
    newCmptOptions: ComponentOption[]
): void {
    // Mapping by name if specified.
    each(newCmptOptions, function (cmptOption, index) {
        if (!cmptOption || cmptOption.name == null) {
            return;
        }
        for (let i = 0; i < result.length; i++) {
            const existing = result[i].existing;
            if (!result[i].newOption // Consider name: two map to one.
                // Can not match when both ids existing but different.
                && existing
                && (existing.id == null || cmptOption.id == null)
                && !isComponentIdInternal(cmptOption)
                && !isComponentIdInternal(existing)
                && keyExistAndEqual('name', existing, cmptOption)
            ) {
                result[i].newOption = cmptOption;
                newCmptOptions[index] = null;
                return;
            }
        }
    });
}

function mappingByIndex<T extends MappingExistingItem>(
    result: MappingResult<T>,
    newCmptOptions: ComponentOption[],
    brandNew: boolean
): void {
    each(newCmptOptions, function (cmptOption) {
        if (!cmptOption) {
            return;
        }

        // Find the first place that not mapped by id and not internal component (consider the "hole").
        let resultItem;
        let nextIdx = 0;
        while (
            // Be `!resultItem` only when `nextIdx >= result.length`.
            (resultItem = result[nextIdx])
            // (1) Existing models that already have id should be able to mapped to. Because
            // after mapping performed, model will always be assigned with an id if user not given.
            // After that all models have id.
            // (2) If new option has id, it can only set to a hole or append to the last. It should
            // not be merged to the existings with different id. Because id should not be overwritten.
            // (3) Name can be overwritten, because axis use name as 'show label text'.
            && (
                resultItem.newOption
                || isComponentIdInternal(resultItem.existing)
                || (
                    // In mode "replaceMerge", here no not-mapped-non-internal-existing.
                    resultItem.existing
                    && cmptOption.id != null
                    && !keyExistAndEqual('id', cmptOption, resultItem.existing)
                )
            )
        ) {
            nextIdx++;
        }

        if (resultItem) {
            resultItem.newOption = cmptOption;
            resultItem.brandNew = brandNew;
        }
        else {
            result.push({
                newOption: cmptOption,
                brandNew: brandNew,
                existing: null,
                keyInfo: null
            });
        }
        nextIdx++;
    });
}

function mappingInReplaceAllMode<T extends MappingExistingItem>(
    result: MappingResult<T>,
    newCmptOptions: ComponentOption[]
): void {
    each(newCmptOptions, function (cmptOption) {
        // The feature "reproduce" requires "hole" will also reproduced
        // in case that component index referring are broken.
        result.push({
            newOption: cmptOption,
            brandNew: true,
            existing: null,
            keyInfo: null
        });
    });
}

/**
 * Make id and name for mapping result (result of mappingToExists)
 * into `keyInfo` field.
 */
function makeIdAndName(
    mapResult: MappingResult<MappingExistingItem>
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

        // Force ensure id not duplicated.
        assert(
            !opt || opt.id == null || !idMap.get(opt.id) || idMap.get(opt.id) === item,
            'id duplicates: ' + (opt && opt.id)
        );

        opt && opt.id != null && idMap.set(opt.id, item);
        !item.keyInfo && (item.keyInfo = {} as MappingResultItem['keyInfo']);
    });

    // Make name and id.
    each(mapResult, function (item, index) {
        const existing = item.existing;
        const opt = item.newOption;
        const keyInfo = item.keyInfo;

        if (!isObject<ComponentOption>(opt)) {
            return;
        }

        // Name can be overwritten. Consider case: axis.name = '20km'.
        // But id generated by name will not be changed, which affect
        // only in that case: setOption with 'not merge mode' and view
        // instance will be recreated, which can be accepted.
        keyInfo.name = opt.name != null
            ? makeComparableKey(opt.name)
            : existing
            ? existing.name
            // Avoid that different series has the same name,
            // because name may be used like in color pallet.
            : DUMMY_COMPONENT_NAME_PREFIX + index;

        if (existing) {
            keyInfo.id = makeComparableKey(existing.id);
        }
        else if (opt.id != null) {
            keyInfo.id = makeComparableKey(opt.id);
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

function keyExistAndEqual(
    attr: 'id' | 'name',
    obj1: { id?: OptionId, name?: OptionName },
    obj2: { id?: OptionId, name?: OptionName }
): boolean {
    const key1 = convertOptionIdName(obj1[attr], null);
    const key2 = convertOptionIdName(obj2[attr], null);
    // See `MappingExistingItem`. `id` and `name` trade string equals to number.
    return key1 != null && key2 != null && key1 === key2;
}

/**
 * @return return null if not exist.
 */
function makeComparableKey(val: unknown): string {
    if (__DEV__) {
        if (val == null) {
            throw new Error();
        }
    }
    return convertOptionIdName(val, '');
}

export function convertOptionIdName(idOrName: unknown, defaultValue: string): string {
    if (idOrName == null) {
        return defaultValue;
    }
    return isString(idOrName)
        ? idOrName
        : (isNumber(idOrName) || isStringSafe(idOrName))
        ? idOrName + ''
        : defaultValue;
}

function warnInvalidateIdOrName(idOrName: unknown) {
    if (__DEV__) {
        warn('`' + idOrName + '` is invalid id or name. Must be a string or number.');
    }
}

function isValidIdOrName(idOrName: unknown): boolean {
    return isStringSafe(idOrName) || isNumeric(idOrName);
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
export function isComponentIdInternal(cmptOption: { id?: MappingExistingItem['id'] }): boolean {
    return cmptOption
        && cmptOption.id != null
        && makeComparableKey(cmptOption.id).indexOf(INTERNAL_COMPONENT_ID_PREFIX) === 0;
}

export function makeInternalComponentId(idSuffix: string) {
    return INTERNAL_COMPONENT_ID_PREFIX + idSuffix;
}

export function setComponentTypeToKeyInfo(
    mappingResult: MappingResult<MappingExistingItem & { subType?: ComponentSubType }>,
    mainType: ComponentMainType,
    componentModelCtor: ComponentModelConstructor
): void {
    // Set mainType and complete subType.
    each(mappingResult, function (item) {
        const newOption = item.newOption;
        if (isObject(newOption)) {
            item.keyInfo.mainType = mainType;
            item.keyInfo.subType = determineSubType(mainType, newOption, item.existing, componentModelCtor);
        }
    });
}

function determineSubType(
    mainType: ComponentMainType,
    newCmptOption: ComponentOption,
    existComponent: { subType?: ComponentSubType },
    componentModelCtor: ComponentModelConstructor
): ComponentSubType {
    const subType = newCmptOption.type
        ? newCmptOption.type
        : existComponent
        ? existComponent.subType
        // Use determineSubType only when there is no existComponent.
        : (componentModelCtor as ComponentModelConstructor).determineSubType(mainType, newCmptOption);

    // tooltip, markline, markpoint may always has no subType
    return subType;
}


type BatchItem = {
    seriesId: OptionId,
    dataIndex: number | number[]
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
            const seriesId = convertOptionIdName(sourceBatch[i].seriesId, null);
            if (seriesId == null) {
                return;
            }
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
export function queryDataIndex(data: SeriesData, payload: Payload & {
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
let innerUniqueIndex = getRandomIdBase();

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
 * If both `abcIndex`, `abcId`, `abcName` specified, only one work.
 * The priority is: index > id > name, the same with `ecModel.queryComponents`.
 */
export type ModelFinderIndexQuery = number | number[] | 'all' | 'none' | false;
export type ModelFinderIdQuery = OptionId | OptionId[];
export type ModelFinderNameQuery = OptionId | OptionId[];
// If string, like 'series', means { seriesIndex: 0 }.
export type ModelFinder = string | ModelFinderObject;
export type ModelFinderObject = {
    seriesIndex?: ModelFinderIndexQuery, seriesId?: ModelFinderIdQuery, seriesName?: ModelFinderNameQuery
    geoIndex?: ModelFinderIndexQuery, geoId?: ModelFinderIdQuery, geoName?: ModelFinderNameQuery
    bmapIndex?: ModelFinderIndexQuery, bmapId?: ModelFinderIdQuery, bmapName?: ModelFinderNameQuery
    xAxisIndex?: ModelFinderIndexQuery, xAxisId?: ModelFinderIdQuery, xAxisName?: ModelFinderNameQuery
    yAxisIndex?: ModelFinderIndexQuery, yAxisId?: ModelFinderIdQuery, yAxisName?: ModelFinderNameQuery
    gridIndex?: ModelFinderIndexQuery, gridId?: ModelFinderIdQuery, gridName?: ModelFinderNameQuery
    dataIndex?: number, dataIndexInside?: number
    // ... (can be extended)
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
export type ParsedModelFinder = {
    // other components
    [key: string]: ComponentModel | ComponentModel[] | undefined;
};

export type ParsedModelFinderKnown = ParsedModelFinder & {
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

/**
 * The same behavior as `component.getReferringComponents`.
 */
export function parseFinder(
    ecModel: GlobalModel,
    finderInput: ModelFinder,
    opt?: {
        // If no main type specified, use this main type.
        defaultMainType?: ComponentMainType;
        // If pervided, types out of this list will be ignored.
        includeMainTypes?: ComponentMainType[];
        enableAll?: boolean;
        enableNone?: boolean;
    }
): ParsedModelFinder {
    const { mainTypeSpecified, queryOptionMap, others } = preParseFinder(finderInput, opt);
    const result = others as ParsedModelFinderKnown;

    const defaultMainType = opt ? opt.defaultMainType : null;
    if (!mainTypeSpecified && defaultMainType) {
        queryOptionMap.set(defaultMainType, {});
    }

    queryOptionMap.each(function (queryOption, mainType) {
        const queryResult = queryReferringComponents(
            ecModel,
            mainType,
            queryOption,
            {
                useDefault: defaultMainType === mainType,
                enableAll: (opt && opt.enableAll != null) ? opt.enableAll : true,
                enableNone: (opt && opt.enableNone != null) ? opt.enableNone : true
            }
        );
        result[mainType + 'Models'] = queryResult.models;
        result[mainType + 'Model'] = queryResult.models[0];
    });

    return result;
}

export function preParseFinder(
    finderInput: ModelFinder,
    opt?: {
        // If pervided, types out of this list will be ignored.
        includeMainTypes?: ComponentMainType[];
    }
): {
    mainTypeSpecified: boolean;
    queryOptionMap: HashMap<QueryReferringUserOption, ComponentMainType>;
    others: Partial<Pick<ParsedModelFinderKnown, 'dataIndex' | 'dataIndexInside'>>
} {
    let finder: ModelFinderObject;
    if (isString(finderInput)) {
        const obj = {};
        (obj as any)[finderInput + 'Index'] = 0;
        finder = obj;
    }
    else {
        finder = finderInput;
    }

    const queryOptionMap = createHashMap<QueryReferringUserOption, ComponentMainType>();
    const others = {} as Partial<Pick<ParsedModelFinderKnown, 'dataIndex' | 'dataIndexInside'>>;
    let mainTypeSpecified = false;

    each(finder, function (value, key) {
        // Exclude 'dataIndex' and other illgal keys.
        if (key === 'dataIndex' || key === 'dataIndexInside') {
            others[key] = value as number;
            return;
        }

        const parsedKey = key.match(/^(\w+)(Index|Id|Name)$/) || [];
        const mainType = parsedKey[1];
        const queryType = (parsedKey[2] || '').toLowerCase() as keyof QueryReferringUserOption;

        if (
            !mainType
            || !queryType
            || (opt && opt.includeMainTypes && indexOf(opt.includeMainTypes, mainType) < 0)
        ) {
            return;
        }

        mainTypeSpecified = mainTypeSpecified || !!mainType;

        const queryOption = queryOptionMap.get(mainType) || queryOptionMap.set(mainType, {});
        queryOption[queryType] = value as any;
    });

    return { mainTypeSpecified, queryOptionMap, others };
}


export type QueryReferringUserOption = {
    index?: ModelFinderIndexQuery,
    id?: ModelFinderIdQuery,
    name?: ModelFinderNameQuery,
};

export const SINGLE_REFERRING: QueryReferringOpt = { useDefault: true, enableAll: false, enableNone: false };
export const MULTIPLE_REFERRING: QueryReferringOpt = { useDefault: false, enableAll: true, enableNone: true };

export type QueryReferringOpt = {
    // Whether to use the first component as the default if none of index/id/name are specified.
    useDefault?: boolean;
    // Whether to enable `'all'` on index option.
    enableAll?: boolean;
    // Whether to enable `'none'`/`false` on index option.
    enableNone?: boolean;
};

export function queryReferringComponents(
    ecModel: GlobalModel,
    mainType: ComponentMainType,
    userOption: QueryReferringUserOption,
    opt?: QueryReferringOpt
): {
    // Always be array rather than null/undefined, which is convenient to use.
    models: ComponentModel[];
    // Whether there is indexOption/id/name specified
    specified: boolean;
} {
    opt = opt || SINGLE_REFERRING as QueryReferringOpt;
    let indexOption = userOption.index;
    let idOption = userOption.id;
    let nameOption = userOption.name;

    const result = {
        models: null as ComponentModel[],
        specified: indexOption != null || idOption != null || nameOption != null
    };

    if (!result.specified) {
        // Use the first as default if `useDefault`.
        let firstCmpt;
        result.models = (
            opt.useDefault && (firstCmpt = ecModel.getComponent(mainType))
        ) ? [firstCmpt] : [];
        return result;
    }

    if (indexOption === 'none' || indexOption === false) {
        assert(opt.enableNone, '`"none"` or `false` is not a valid value on index option.');
        result.models = [];
        return result;
    }

    // `queryComponents` will return all components if
    // both all of index/id/name are null/undefined.
    if (indexOption === 'all') {
        assert(opt.enableAll, '`"all"` is not a valid value on index option.');
        indexOption = idOption = nameOption = null;
    }
    result.models = ecModel.queryComponents({
        mainType: mainType,
        index: indexOption as number | number[],
        id: idOption,
        name: nameOption
    });
    return result;
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
    buckets: HashMap<T[], R> // hasmap key: the key returned by `getKey`.
} {
    const buckets = createHashMap<T[], R>();
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


/**
 * Interpolate raw values of a series with percent
 *
 * @param data         data
 * @param labelModel   label model of the text element
 * @param sourceValue  start value. May be null/undefined when init.
 * @param targetValue  end value
 * @param percent      0~1 percentage; 0 uses start value while 1 uses end value
 * @return             interpolated values
 *                     If `sourceValue` and `targetValue` are `number`, return `number`.
 *                     If `sourceValue` and `targetValue` are `string`, return `string`.
 *                     If `sourceValue` and `targetValue` are `(string | number)[]`, return `(string | number)[]`.
 *                     Other cases do not supported.
 */
export function interpolateRawValues(
    data: SeriesData,
    precision: number | 'auto',
    sourceValue: InterpolatableValue,
    targetValue: InterpolatableValue,
    percent: number
): InterpolatableValue {
    const isAutoPrecision = precision == null || precision === 'auto';

    if (targetValue == null) {
        return targetValue;
    }

    if (isNumber(targetValue)) {
        const value = interpolateNumber(
            sourceValue as number || 0,
            targetValue as number,
            percent
        );
        return round(
            value,
            isAutoPrecision ? Math.max(
                getPrecision(sourceValue as number || 0),
                getPrecision(targetValue as number)
            )
            : precision as number
        );
    }
    else if (isString(targetValue)) {
        return percent < 1 ? sourceValue : targetValue;
    }
    else {
        const interpolated = [];
        const leftArr = sourceValue as (string | number)[];
        const rightArr = targetValue as (string | number[]);
        const length = Math.max(leftArr ? leftArr.length : 0, rightArr.length);
        for (let i = 0; i < length; ++i) {
            const info = data.getDimensionInfo(i);
            // Don't interpolate ordinal dims
            if (info && info.type === 'ordinal') {
                // In init, there is no `sourceValue`, but should better not to get undefined result.
                interpolated[i] = (percent < 1 && leftArr ? leftArr : rightArr)[i] as number;
            }
            else {
                const leftVal = leftArr && leftArr[i] ? leftArr[i] as number : 0;
                const rightVal = rightArr[i] as number;
                const value = interpolateNumber(leftVal, rightVal, percent);
                interpolated[i] = round(
                    value,
                    isAutoPrecision ? Math.max(
                        getPrecision(leftVal),
                        getPrecision(rightVal)
                    )
                    : precision as number
                );
            }
        }
        return interpolated;
    }
}
