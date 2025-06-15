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

import type GlobalModel from '../model/Global';
import type ExtensionAPI from './ExtensionAPI';
import type { CoordinateSystem, CoordinateSystemCreator, CoordinateSystemMaster } from '../coord/CoordinateSystem';
import { SINGLE_REFERRING } from '../util/model';
import ComponentModel from '../model/Component';
import SeriesModel from '../model/Series';
import { error } from '../util/log';
import { CoordinateSystemDataCoord, NullUndefined } from '../util/types';

type CoordinateSystemCreatorMap = {[type: string]: CoordinateSystemCreator};

/**
 * FIXME:
 * `nonSeriesBoxCoordSysCreators` and `_nonSeriesBoxMasterList` are hardcoded implementations.
 * Regarding "coord sys layout based on another coord sys", currently we only exprimentally support one level
 * dpendency, such as, "grid(cartesian)s can be laid out based on matrix/calendar coord sys."
 * But a comprehensive implementation may need to support:
 *  - Recursive dependencies. e.g., a matrix coord sys lays out based on another matrix coord sys.
 *    That requires in the implementation `create` and `update` of coord sys are called by a dependency graph.
 *    (@see enableTopologicalTravel in `util/component.ts`)
 */
const nonSeriesBoxCoordSysCreators: CoordinateSystemCreatorMap = {};
const normalCoordSysCreators: CoordinateSystemCreatorMap = {};

class CoordinateSystemManager {

    private _normalMasterList: CoordinateSystemMaster[] = [];
    private _nonSeriesBoxMasterList: CoordinateSystemMaster[] = [];

    /**
     * Typically,
     *  - in `create`, a coord sys lays out based on a given rect;
     *  - in `update`, update the pixel and data extent of there axes (if any) based on processed `series.data`.
     * After that, a coord sys can serve (typically by `dataToPoint`/`dataToLayout`/`pointToData`).
     * If the coordinate system do not lay out based on `series.data`, `update` is not needed.
     */
    create(ecModel: GlobalModel, api: ExtensionAPI): void {
        this._nonSeriesBoxMasterList = dealCreate(nonSeriesBoxCoordSysCreators, true);
        this._normalMasterList = dealCreate(normalCoordSysCreators, false);

        function dealCreate(creatorMap: CoordinateSystemCreatorMap, canBeNonSeriesBox: boolean) {
            let coordinateSystems: CoordinateSystemMaster[] = [];
            zrUtil.each(creatorMap, function (creator, type) {
                const list = creator.create(ecModel, api);
                coordinateSystems = coordinateSystems.concat(list || []);

                if (__DEV__) {
                    if (canBeNonSeriesBox) {
                        // Disallow `update` is a brutal way to ensure `_nonSeriesBoxMasterList`s are ready to
                        // serve after `create`. But if `update` has to be involved in `_nonSeriesBoxMasterList`
                        // for some future case, more complicated mechanisms need to be introduced.
                        zrUtil.each(list, master => zrUtil.assert(!master.update));
                    }
                }
            });
            return coordinateSystems;
        }
    }

    /**
     * @see CoordinateSystem['create']
     */
    update(ecModel: GlobalModel, api: ExtensionAPI): void {
        zrUtil.each(this._normalMasterList, function (coordSys) {
            coordSys.update && coordSys.update(ecModel, api);
        });
    }

    getCoordinateSystems(): CoordinateSystemMaster[] {
        return this._normalMasterList.concat(this._nonSeriesBoxMasterList);
    }

    static register = function (type: string, creator: CoordinateSystemCreator): void {
        if (type === 'matrix' || type === 'calendar') { // FIXME: hardcode, @see nonSeriesBoxCoordSysCreators
            nonSeriesBoxCoordSysCreators[type] = creator;
            return;
        }
        normalCoordSysCreators[type] = creator;
    };

    static get = function (type: string): CoordinateSystemCreator {
        return normalCoordSysCreators[type] || nonSeriesBoxCoordSysCreators[type];
    };

}

function canBeNonSeriesBoxCoordSys(coordSysType: string): boolean {
    return !!nonSeriesBoxCoordSysCreators[coordSysType];
}


export const BoxCoordinateSystemCoordFrom = {
    // By default fetch coord from `model.get('coord')`.
    coord: 1,
    // Some model/series, such as pie, is allowed to also get coord from `model.get('center')`,
    // if cannot get from `model.get('coord')`. But historically pie use `center` option, but
    // geo use `layoutCenter` option to specify layout center; they are not able to be unified.
    // Therefor it is not recommended.
    coord2: 2,
} as const;
export type BoxCoordinateSystemCoordFrom =
    (typeof BoxCoordinateSystemCoordFrom)[keyof typeof BoxCoordinateSystemCoordFrom];

type BoxCoordinateSystemGetCoord2 = (model: ComponentModel) => CoordinateSystemDataCoord;

/**
 * @see_also `createBoxLayoutReference`
 * @see_also `injectCoordSysByOption`
 */
export function registerLayOutOnCoordSysUsage(opt: {
    // `SomeSeries.type` or `SomeComponent.type`
    fullType: ComponentModel['type'],
    // @see BoxCoordinateSystemCoordFrom . Be `false` by default.
    getCoord2?: BoxCoordinateSystemGetCoord2
}) {
    if (__DEV__) {
        zrUtil.assert(!coordSysUseMap.get(opt.fullType));
    }
    coordSysUseMap.set(opt.fullType, {getCoord2: undefined}).getCoord2 = opt.getCoord2;
}
const coordSysUseMap = zrUtil.createHashMap<
    {getCoord2: BoxCoordinateSystemGetCoord2 | NullUndefined},
    ComponentModel['type']
>();

/**
 * @return Be an object, but never be NullUndefined.
 */
export function getCoordForBoxCoordSys(
    model: ComponentModel
): {
    coord: CoordinateSystemDataCoord | NullUndefined
    from: BoxCoordinateSystemCoordFrom
} {
    let coord: CoordinateSystemDataCoord = model.getShallow('coord', true);
    let from: BoxCoordinateSystemCoordFrom = BoxCoordinateSystemCoordFrom.coord;
    if (coord == null) {
        const store = coordSysUseMap.get(model.type);
        if (store && store.getCoord2) {
            from = BoxCoordinateSystemCoordFrom.coord2;
            coord = store.getCoord2(model);
        }
    }
    return {coord, from};
}

/**
 * - "dataCoordSys": each data item is laid out based on a coord sys.
 * - "boxCoordSys": the overall bounding rect or anchor point is calculated based on a coord sys.
 *   e.g.,
 *      grid rect (cartesian rect) is calculate based on matrix/calendar coord sys;
 *      pie center is calculated based on calendar/cartesian;
 *
 * The default value (if not declared in option `coordinateSystemUsage`):
 *  For series, use `dataCoordSys`, since this is the most case and backward compatible.
 *  For non-series components, use `boxCoordSys`, since `dataCoordSys` is not applicable.
 */
export const CoordinateSystemUsageKind = {
    none: 0,
    dataCoordSys: 1,
    boxCoordSys: 2,
} as const;
export type CoordinateSystemUsageKind = (typeof CoordinateSystemUsageKind)[keyof typeof CoordinateSystemUsageKind];

export function decideCoordSysUsageKind(
    // Component or series
    model: ComponentModel,
    printError?: boolean
): {
    kind: CoordinateSystemUsageKind;
    coordSysType: string | NullUndefined;
} {
    // For backward compat, still not use `true` in model.get.
    const coordSysType = model.getShallow('coordinateSystem');
    let coordSysUsageOption = model.getShallow('coordinateSystemUsage', true);
    const isDeclaredExplicitly = coordSysUsageOption != null;
    let kind: CoordinateSystemUsageKind = CoordinateSystemUsageKind.none;

    if (coordSysType) {
        const isSeries = model.mainType === 'series';
        if (coordSysUsageOption == null) {
            coordSysUsageOption = isSeries ? 'data' : 'box';
        }

        if (coordSysUsageOption === 'data') {
            kind = CoordinateSystemUsageKind.dataCoordSys;
            if (!isSeries) {
                if (__DEV__) {
                    if (isDeclaredExplicitly && printError) {
                        error('coordinateSystemUsage "data" is not supported in non-series components.');
                    }
                }
                kind = CoordinateSystemUsageKind.none;
            }
        }
        else if (coordSysUsageOption === 'box') {
            kind = CoordinateSystemUsageKind.boxCoordSys;
            if (!isSeries && !canBeNonSeriesBoxCoordSys(coordSysType)) {
                if (__DEV__) {
                    if (isDeclaredExplicitly && printError) {
                        error(`coordinateSystem "${coordSysType}" cannot be used`
                            + ` as coordinateSystemUsage "box" for "${model.type}" yet.`
                        );
                    }
                }
                kind = CoordinateSystemUsageKind.none;
            }
        }
    }

    return {coordSysType, kind};
}

/**
 * These cases are considered:
 *  (A) Most series can use only "dataCoordSys", but "boxCoordSys" is not applicable:
 *    - e.g., series.heatmap, series.line, series.bar, series.scatter, ...
 *  (B) Some series and most components can use only "boxCoordSys", but "dataCoordSys" is not applicable:
 *    - e.g., series.pie, series.funnel, ...
 *    - e.g., grid, polar, geo, title, ...
 *  (C) Several series can use both "boxCoordSys" and "dataCoordSys", even at the same time:
 *    - e.g., series.graph, series.map
 *      - If graph or map series use a "boxCoordSys", it creates a internal "dataCoordSys" to lay out its data.
 *      - Graph series can use matrix coord sys as either the "dataCoordSys" (each item layout on one cell)
 *        or "boxCoordSys" (the entire series are layout within one cell).
 *    - To achieve this effect,
 *      `series.coordinateSystemUsage: 'box'` needs to be specified explicitly.
 *
 * Check these echarts option settings:
 *  - If `series: {type: 'bar'}`:
 *      dataCoordSys: "cartesian2d", boxCoordSys: "none".
 *      (since `coordinateSystem: 'cartesian2d'` is the default option in bar.)
 *  - If `grid: {coordinateSystem: 'matrix'}`
 *      dataCoordSys: "none", boxCoordSys: "matrix".
 *  - If `series: {type: 'pie', coordinateSystem: 'matrix'}`:
 *      dataCoordSys: "none", boxCoordSys: "matrix".
 *      (since `coordinateSystemUsage: 'box'` is the default option in pie.)
 *  - If `series: {type: 'graph', coordinateSystem: 'matrix'}`:
 *      dataCoordSys: "matrix", boxCoordSys: "none"
 *  - If `series: {type: 'graph', coordinateSystem: 'matrix', coordinateSystemUsage: 'box'}`:
 *      dataCoordSys: "an internal view", boxCoordSys: "the internal view is laid out on a matrix"
 *  - If `series: {type: 'map'}`:
 *      dataCoordSys: "a internal geo", boxCoordSys: "none"
 *  - If `series: {type: 'map', coordinateSystem: 'geo', geoIndex: 0}`:
 *      dataCoordSys: "a geo", boxCoordSys: "none"
 *  - If `series: {type: 'map', coordinateSystem: 'matrix'}`:
 *      not_applicable
 *  - If `series: {type: 'map', coordinateSystem: 'matrix', coordinateSystemUsage: 'box'}`:
 *      dataCoordSys: "an internal geo", boxCoordSys: "the internal geo is laid out on a matrix"
 *
 * @usage
 * For case (A) & (B),
 *  call `injectCoordSysByOption({coordSysType: 'aaa', ...})` once for each series/components.
 * For case (C),
 *  call `injectCoordSysByOption({coordSysType: 'aaa', ...})` once for each series/components,
 *  and then call `injectCoordSysByOption({coordSysType: 'bbb', ..., isDefaultDataCoordSys: true})`
 *  once for each series/components.
 *
 * @return Whether injected.
 */
export function injectCoordSysByOption(opt: {
    // series or component
    targetModel: ComponentModel;
    coordSysType: string;
    coordSysProvider: CoordSysInjectionProvider;
    isDefaultDataCoordSys?: boolean;
    allowNotFound?: boolean
}): boolean {
    const {
        targetModel,
        coordSysType,
        coordSysProvider,
        isDefaultDataCoordSys,
        allowNotFound,
    } = opt;
    if (__DEV__) {
        zrUtil.assert(!!coordSysType);
    }

    let {kind, coordSysType: declaredType} = decideCoordSysUsageKind(targetModel, true);

    if (isDefaultDataCoordSys
        && kind !== CoordinateSystemUsageKind.dataCoordSys
    ) {
        // If both dataCoordSys and boxCoordSys declared in one model.
        // There is the only case in series-graph, and no other cases yet.
        kind = CoordinateSystemUsageKind.dataCoordSys;
        declaredType = coordSysType;
    }

    if (kind === CoordinateSystemUsageKind.none || declaredType !== coordSysType) {
        return false;
    }

    const coordSys = coordSysProvider(coordSysType, targetModel);
    if (!coordSys) {
        if (__DEV__) {
            if (!allowNotFound) {
                error(`${coordSysType} cannot be found for`
                    + ` ${targetModel.type} (index: ${targetModel.componentIndex}).`
                );
            }
        }
        return false;
    }

    if (kind === CoordinateSystemUsageKind.dataCoordSys) {
        if (__DEV__) {
            zrUtil.assert(targetModel.mainType === 'series');
        }
        (targetModel as SeriesModel).coordinateSystem = coordSys;
    }
    else { // kind === 'boxCoordSys'
        targetModel.boxCoordinateSystem = coordSys;
    }

    return true;
}

type CoordSysInjectionProvider = (
    coordSysType: string, injectTargetModel: ComponentModel
) => CoordinateSystem | NullUndefined;

export const simpleCoordSysInjectionProvider: CoordSysInjectionProvider = function (coordSysType, injectTargetModel) {
    const coordSysModel = injectTargetModel.getReferringComponents(
        coordSysType, SINGLE_REFERRING
    ).models[0] as (ComponentModel & {coordinateSystem: CoordinateSystem});
    return coordSysModel && coordSysModel.coordinateSystem;
};


export default CoordinateSystemManager;
