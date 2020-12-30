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


import { each, indexOf, curry, assert, map, createHashMap } from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import * as brushHelper from './brushHelper';
import {
    BrushPanelConfig, BrushControllerEvents, BrushType,
    BrushAreaRange, BrushDimensionMinMax
} from './BrushController';
import ExtensionAPI from '../../core/ExtensionAPI';
import GridModel from '../../coord/cartesian/GridModel';
import GeoModel from '../../coord/geo/GeoModel';
import { CoordinateSystemMaster } from '../../coord/CoordinateSystem';
import Cartesian2D from '../../coord/cartesian/Cartesian2D';
import Geo from '../../coord/geo/Geo';
import GlobalModel from '../../model/Global';
import { BrushAreaParam, BrushAreaParamInternal } from '../brush/BrushModel';
import SeriesModel from '../../model/Series';
import { Dictionary } from '../../util/types';
import {
    ModelFinderObject, ParsedModelFinder, ModelFinder,
    parseFinder as modelUtilParseFinder,
    ParsedModelFinderKnown
} from '../../util/model';


const COORD_CONVERTS = ['dataToPoint', 'pointToData'] as const;
type COORD_CONVERTS_INDEX = 0 | 1;

// FIXME
// how to genarialize to more coordinate systems.
const INCLUDE_FINDER_MAIN_TYPES = [
    'grid', 'xAxis', 'yAxis', 'geo', 'graph',
    'polar', 'radiusAxis', 'angleAxis', 'bmap'
];

type BrushableCoordinateSystem = Cartesian2D | Geo;
type BrushTargetBuilderKey = 'grid' | 'geo';

/**
 * There can be multiple axes in a single targetInfo. Consider the case
 * of `grid` component, a targetInfo represents a grid which contains one or more
 * cartesian and one or more axes. And consider the case of parallel system,
 * which has multiple axes in a coordinate system.
 */
interface BrushTargetInfo {
    panelId: string;
    coordSysModel: CoordinateSystemMaster['model'];
    // Use the first one as the representitive coordSys.
    // A representitive cartesian in grid (first cartesian by default).
    coordSys: BrushableCoordinateSystem;
    // All cartesians.
    coordSyses: BrushableCoordinateSystem[];
    getPanelRect: GetPanelRect,
}
export interface BrushTargetInfoCartesian2D extends BrushTargetInfo {
    gridModel: GridModel;
    coordSys: Cartesian2D;
    coordSyses: Cartesian2D[];
    xAxisDeclared: boolean;
    yAxisDeclared: boolean;
}
export interface BrushTargetInfoGeo extends BrushTargetInfo {
    geoModel: GeoModel,
    coordSysModel: GeoModel,
    coordSys: Geo,
    coordSyses: Geo[],
}
type GetPanelRect = () => graphic.BoundingRect;


class BrushTargetManager {

    private _targetInfoList: BrushTargetInfo[] = [];

    /**
     * @param finder contains Index/Id/Name of xAxis/yAxis/geo/grid
     *        Each can be {number|Array.<number>}. like: {xAxisIndex: [3, 4]}
     * @param opt.include include coordinate system types.
     */
    constructor(
        finder: ModelFinderObject,
        ecModel: GlobalModel,
        opt?: {include?: BrushTargetBuilderKey[]}
    ) {
        const foundCpts = parseFinder(ecModel, finder);

        each(targetInfoBuilders, (builder, type) => {
            if (!opt || !opt.include || indexOf(opt.include, type) >= 0) {
                builder(foundCpts, this._targetInfoList);
            }
        });
    }

    setOutputRanges(
        areas: BrushControllerEvents['brush']['areas'],
        ecModel: GlobalModel
    ): BrushAreaParam[] {
        this.matchOutputRanges(areas, ecModel, function (
            area: BrushAreaParam,
            coordRange: ReturnType<ConvertCoord>['values'],
            coordSys: BrushableCoordinateSystem
        ) {
            (area.coordRanges || (area.coordRanges = [])).push(coordRange);
            // area.coordRange is the first of area.coordRanges
            if (!area.coordRange) {
                area.coordRange = coordRange;
                // In 'category' axis, coord to pixel is not reversible, so we can not
                // rebuild range by coordRange accrately, which may bring trouble when
                // brushing only one item. So we use __rangeOffset to rebuilding range
                // by coordRange. And this it only used in brush component so it is no
                // need to be adapted to coordRanges.
                const result = coordConvert[area.brushType](0, coordSys, coordRange);
                area.__rangeOffset = {
                    offset: diffProcessor[area.brushType](result.values, area.range, [1, 1]),
                    xyMinMax: result.xyMinMax
                };
            }
        });
        return areas;
    }

    matchOutputRanges<T extends (
        Parameters<BrushTargetManager['findTargetInfo']>[0] & {
            brushType: BrushType;
            range: BrushAreaRange;
        }
    )>(
        areas: T[],
        ecModel: GlobalModel,
        cb: (
            area: T,
            coordRange: ReturnType<ConvertCoord>['values'],
            coordSys: BrushableCoordinateSystem,
            ecModel: GlobalModel
        ) => void
    ) {
        each(areas, function (area) {
            const targetInfo = this.findTargetInfo(area, ecModel);

            if (targetInfo && targetInfo !== true) {
                each(
                    targetInfo.coordSyses,
                    function (coordSys) {
                        const result = coordConvert[area.brushType](1, coordSys, area.range);
                        cb(area, result.values, coordSys, ecModel);
                    }
                );
            }
        }, this);
    }

    /**
     * the `areas` is `BrushModel.areas`.
     * Called in layout stage.
     * convert `area.coordRange` to global range and set panelId to `area.range`.
     */
    setInputRanges(
        areas: BrushAreaParamInternal[],
        ecModel: GlobalModel
    ): void {
        each(areas, function (area) {
            const targetInfo = this.findTargetInfo(area, ecModel);

            if (__DEV__) {
                assert(
                    !targetInfo || targetInfo === true || area.coordRange,
                    'coordRange must be specified when coord index specified.'
                );
                assert(
                    !targetInfo || targetInfo !== true || area.range,
                    'range must be specified in global brush.'
                );
            }

            area.range = area.range || [];

            // convert coordRange to global range and set panelId.
            if (targetInfo && targetInfo !== true) {
                area.panelId = targetInfo.panelId;
                // (1) area.range shoule always be calculate from coordRange but does
                // not keep its original value, for the sake of the dataZoom scenario,
                // where area.coordRange remains unchanged but area.range may be changed.
                // (2) Only support converting one coordRange to pixel range in brush
                // component. So do not consider `coordRanges`.
                // (3) About __rangeOffset, see comment above.
                const result = coordConvert[area.brushType](0, targetInfo.coordSys, area.coordRange);
                const rangeOffset = area.__rangeOffset;
                area.range = rangeOffset
                    ? diffProcessor[area.brushType](
                        result.values,
                        rangeOffset.offset,
                        getScales(result.xyMinMax, rangeOffset.xyMinMax)
                    )
                    : result.values;
            }
        }, this);
    }

    makePanelOpts(
        api: ExtensionAPI,
        getDefaultBrushType?: (targetInfo: BrushTargetInfo) => BrushType
    ): BrushPanelConfig[] {
        return map(this._targetInfoList, function (targetInfo) {
            const rect = targetInfo.getPanelRect();
            return {
                panelId: targetInfo.panelId,
                defaultBrushType: getDefaultBrushType ? getDefaultBrushType(targetInfo) : null,
                clipPath: brushHelper.makeRectPanelClipPath(rect),
                isTargetByCursor: brushHelper.makeRectIsTargetByCursor(
                    rect, api, targetInfo.coordSysModel
                ),
                getLinearBrushOtherExtent: brushHelper.makeLinearBrushOtherExtent(rect)
            };
        });
    }

    controlSeries(area: BrushAreaParamInternal, seriesModel: SeriesModel, ecModel: GlobalModel): boolean {
        // Check whether area is bound in coord, and series do not belong to that coord.
        // If do not do this check, some brush (like lineX) will controll all axes.
        const targetInfo = this.findTargetInfo(area, ecModel);
        return targetInfo === true || (
            targetInfo && indexOf(
                targetInfo.coordSyses, seriesModel.coordinateSystem as BrushableCoordinateSystem
            ) >= 0
        );
    }

    /**
     * If return Object, a coord found.
     * If reutrn true, global found.
     * Otherwise nothing found.
     */
    findTargetInfo(
        area: ModelFinderObject & {
            panelId?: string
        },
        ecModel: GlobalModel
    ): BrushTargetInfo | true {
        const targetInfoList = this._targetInfoList;
        const foundCpts = parseFinder(ecModel, area);

        for (let i = 0; i < targetInfoList.length; i++) {
            const targetInfo = targetInfoList[i];
            const areaPanelId = area.panelId;
            if (areaPanelId) {
                if (targetInfo.panelId === areaPanelId) {
                    return targetInfo;
                }
            }
            else {
                for (let j = 0; j < targetInfoMatchers.length; j++) {
                    if (targetInfoMatchers[j](foundCpts, targetInfo)) {
                        return targetInfo;
                    }
                }
            }
        }

        return true;
    }

}

function formatMinMax(minMax: BrushDimensionMinMax): BrushDimensionMinMax {
    minMax[0] > minMax[1] && minMax.reverse();
    return minMax;
}

function parseFinder(
    ecModel: GlobalModel, finder: ModelFinder
): ParsedModelFinderKnown {
    return modelUtilParseFinder(
        ecModel, finder, {includeMainTypes: INCLUDE_FINDER_MAIN_TYPES}
    );
}

type TargetInfoBuilder = (
    foundCpts: ParsedModelFinderKnown, targetInfoList: BrushTargetInfo[]
) => void;
const targetInfoBuilders: Record<BrushTargetBuilderKey, TargetInfoBuilder> = {

    grid: function (foundCpts, targetInfoList) {
        const xAxisModels = foundCpts.xAxisModels;
        const yAxisModels = foundCpts.yAxisModels;
        const gridModels = foundCpts.gridModels;
        // Remove duplicated.
        const gridModelMap = createHashMap<GridModel>();
        const xAxesHas = {} as Dictionary<boolean>;
        const yAxesHas = {} as Dictionary<boolean>;

        if (!xAxisModels && !yAxisModels && !gridModels) {
            return;
        }

        each(xAxisModels, function (axisModel) {
            const gridModel = axisModel.axis.grid.model;
            gridModelMap.set(gridModel.id, gridModel);
            xAxesHas[gridModel.id] = true;
        });
        each(yAxisModels, function (axisModel) {
            const gridModel = axisModel.axis.grid.model;
            gridModelMap.set(gridModel.id, gridModel);
            yAxesHas[gridModel.id] = true;
        });
        each(gridModels, function (gridModel) {
            gridModelMap.set(gridModel.id, gridModel);
            xAxesHas[gridModel.id] = true;
            yAxesHas[gridModel.id] = true;
        });

        gridModelMap.each(function (gridModel) {
            const grid = gridModel.coordinateSystem;
            const cartesians = [] as Cartesian2D[];

            each(grid.getCartesians(), function (cartesian, index) {
                if (indexOf(xAxisModels, cartesian.getAxis('x').model) >= 0
                    || indexOf(yAxisModels, cartesian.getAxis('y').model) >= 0
                ) {
                    cartesians.push(cartesian);
                }
            });
            targetInfoList.push({
                panelId: 'grid--' + gridModel.id,
                gridModel: gridModel,
                coordSysModel: gridModel,
                // Use the first one as the representitive coordSys.
                coordSys: cartesians[0],
                coordSyses: cartesians,
                getPanelRect: panelRectBuilders.grid,
                xAxisDeclared: xAxesHas[gridModel.id],
                yAxisDeclared: yAxesHas[gridModel.id]
            } as BrushTargetInfoCartesian2D);
        });
    },

    geo: function (foundCpts, targetInfoList) {
        each(foundCpts.geoModels, function (geoModel: GeoModel) {
            const coordSys = geoModel.coordinateSystem;
            targetInfoList.push({
                panelId: 'geo--' + geoModel.id,
                geoModel: geoModel,
                coordSysModel: geoModel,
                coordSys: coordSys,
                coordSyses: [coordSys],
                getPanelRect: panelRectBuilders.geo
            } as BrushTargetInfoGeo);
        });
    }
};

type TargetInfoMatcher = (
    foundCpts: ParsedModelFinderKnown, targetInfo: BrushTargetInfo
) => boolean;
const targetInfoMatchers: TargetInfoMatcher[] = [

    // grid
    function (foundCpts, targetInfo) {
        const xAxisModel = foundCpts.xAxisModel;
        const yAxisModel = foundCpts.yAxisModel;
        let gridModel = foundCpts.gridModel;

        !gridModel && xAxisModel && (gridModel = xAxisModel.axis.grid.model);
        !gridModel && yAxisModel && (gridModel = yAxisModel.axis.grid.model);

        return gridModel && gridModel === (targetInfo as BrushTargetInfoCartesian2D).gridModel;
    },

    // geo
    function (foundCpts, targetInfo) {
        const geoModel = foundCpts.geoModel;
        return geoModel && geoModel === (targetInfo as BrushTargetInfoGeo).geoModel;
    }
];

type PanelRectBuilder = (this: BrushTargetInfo) => graphic.BoundingRect;
const panelRectBuilders: Record<BrushTargetBuilderKey, PanelRectBuilder> = {

    grid: function (this: BrushTargetInfoCartesian2D) {
        // grid is not Transformable.
        return this.coordSys.master.getRect().clone();
    },

    geo: function (this: BrushTargetInfoGeo) {
        const coordSys = this.coordSys;
        const rect = coordSys.getBoundingRect().clone();
        // geo roam and zoom transform
        rect.applyTransform(graphic.getTransform(coordSys));
        return rect;
    }
};

type ConvertCoord = (
    to: COORD_CONVERTS_INDEX,
    coordSys: BrushableCoordinateSystem,
    rangeOrCoordRange: BrushAreaRange
) => {
    values: BrushAreaRange,
    xyMinMax: BrushDimensionMinMax[]
};
const coordConvert: Record<BrushType, ConvertCoord> = {

    lineX: curry(axisConvert, 0),

    lineY: curry(axisConvert, 1),

    rect: function (to, coordSys, rangeOrCoordRange: BrushDimensionMinMax[]): {
        values: BrushDimensionMinMax[],
        xyMinMax: BrushDimensionMinMax[]
    } {
        const xminymin = coordSys[COORD_CONVERTS[to]]([rangeOrCoordRange[0][0], rangeOrCoordRange[1][0]]);
        const xmaxymax = coordSys[COORD_CONVERTS[to]]([rangeOrCoordRange[0][1], rangeOrCoordRange[1][1]]);
        const values = [
            formatMinMax([xminymin[0], xmaxymax[0]]),
            formatMinMax([xminymin[1], xmaxymax[1]])
        ];
        return {values: values, xyMinMax: values};
    },

    polygon: function (to, coordSys, rangeOrCoordRange: BrushDimensionMinMax[]): {
        values: BrushDimensionMinMax[],
        xyMinMax: BrushDimensionMinMax[]
    } {
        const xyMinMax = [[Infinity, -Infinity], [Infinity, -Infinity]];
        const values = map(rangeOrCoordRange, function (item) {
            const p = coordSys[COORD_CONVERTS[to]](item);
            xyMinMax[0][0] = Math.min(xyMinMax[0][0], p[0]);
            xyMinMax[1][0] = Math.min(xyMinMax[1][0], p[1]);
            xyMinMax[0][1] = Math.max(xyMinMax[0][1], p[0]);
            xyMinMax[1][1] = Math.max(xyMinMax[1][1], p[1]);
            return p;
        });
        return {values: values, xyMinMax: xyMinMax};
    }
};

function axisConvert(
    axisNameIndex: 0 | 1,
    to: COORD_CONVERTS_INDEX,
    coordSys: Cartesian2D,
    rangeOrCoordRange: BrushDimensionMinMax
): {
    values: BrushDimensionMinMax,
    xyMinMax: BrushDimensionMinMax[]
} {
    if (__DEV__) {
        assert(
            coordSys.type === 'cartesian2d',
            'lineX/lineY brush is available only in cartesian2d.'
        );
    }

    const axis = coordSys.getAxis(['x', 'y'][axisNameIndex]);
    const values = formatMinMax(map([0, 1], function (i) {
        return to
            ? axis.coordToData(axis.toLocalCoord(rangeOrCoordRange[i]))
            : axis.toGlobalCoord(axis.dataToCoord(rangeOrCoordRange[i]));
    }));
    const xyMinMax = [];
    xyMinMax[axisNameIndex] = values;
    xyMinMax[1 - axisNameIndex] = [NaN, NaN];

    return {values: values, xyMinMax: xyMinMax};
}


type DiffProcess = (
    values: BrushDimensionMinMax | BrushDimensionMinMax[],
    refer: BrushDimensionMinMax | BrushDimensionMinMax[],
    scales: ReturnType<typeof getScales>
) => BrushDimensionMinMax | BrushDimensionMinMax[];

const diffProcessor: Record<BrushType, DiffProcess> = {

    lineX: curry(axisDiffProcessor, 0),

    lineY: curry(axisDiffProcessor, 1),

    rect: function (
        values: BrushDimensionMinMax[], refer: BrushDimensionMinMax[], scales: ReturnType<typeof getScales>
    ): BrushDimensionMinMax[] {
        return [
            [values[0][0] - scales[0] * refer[0][0], values[0][1] - scales[0] * refer[0][1]],
            [values[1][0] - scales[1] * refer[1][0], values[1][1] - scales[1] * refer[1][1]]
        ];
    },

    polygon: function (
        values: BrushDimensionMinMax[], refer: BrushDimensionMinMax[], scales: ReturnType<typeof getScales>
    ): BrushDimensionMinMax[] {
        return map(values, function (item, idx) {
            return [item[0] - scales[0] * refer[idx][0], item[1] - scales[1] * refer[idx][1]];
        });
    }
};

function axisDiffProcessor(
    axisNameIndex: 0 | 1,
    values: BrushDimensionMinMax,
    refer: BrushDimensionMinMax,
    scales: ReturnType<typeof getScales>
): BrushDimensionMinMax {
    return [
        values[0] - scales[axisNameIndex] * refer[0],
        values[1] - scales[axisNameIndex] * refer[1]
    ];
}

// We have to process scale caused by dataZoom manually,
// although it might be not accurate.
// Return [0~1, 0~1]
function getScales(xyMinMaxCurr: BrushDimensionMinMax[], xyMinMaxOrigin: BrushDimensionMinMax[]): number[] {
    const sizeCurr = getSize(xyMinMaxCurr);
    const sizeOrigin = getSize(xyMinMaxOrigin);
    const scales = [sizeCurr[0] / sizeOrigin[0], sizeCurr[1] / sizeOrigin[1]];
    isNaN(scales[0]) && (scales[0] = 1);
    isNaN(scales[1]) && (scales[1] = 1);
    return scales;
}

function getSize(xyMinMax: BrushDimensionMinMax[]): number[] {
    return xyMinMax
        ? [xyMinMax[0][1] - xyMinMax[0][0], xyMinMax[1][1] - xyMinMax[1][0]]
        : [NaN, NaN];
}

export default BrushTargetManager;
