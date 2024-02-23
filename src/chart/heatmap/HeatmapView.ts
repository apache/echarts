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

import * as graphic from '../../util/graphic';
import { toggleHoverEmphasis } from '../../util/states';
import HeatmapLayer from './HeatmapLayer';
import * as zrUtil from 'zrender/src/core/util';
import ChartView from '../../view/Chart';
import HeatmapSeriesModel, { HeatmapDataItemOption } from './HeatmapSeries';
import type GlobalModel from '../../model/Global';
import type ExtensionAPI from '../../core/ExtensionAPI';
import type VisualMapModel from '../../component/visualMap/VisualMapModel';
import type PiecewiseModel from '../../component/visualMap/PiecewiseModel';
import type ContinuousModel from '../../component/visualMap/ContinuousModel';
import { CoordinateSystem, isCoordinateSystemType } from '../../coord/CoordinateSystem';
import { StageHandlerProgressParams, Dictionary, OptionDataValue } from '../../util/types';
import type Cartesian2D from '../../coord/cartesian/Cartesian2D';
import type Calendar from '../../coord/calendar/Calendar';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import type Element from 'zrender/src/Element';

// Coord can be 'geo' 'bmap' 'amap' 'leaflet'...
interface GeoLikeCoordSys extends CoordinateSystem {
    dimensions: ['lng', 'lat']
    getViewRect(): graphic.BoundingRect
}

function getIsInPiecewiseRange(
    dataExtent: number[],
    pieceList: ReturnType<PiecewiseModel['getPieceList']>,
    selected: Dictionary<boolean>
) {
    const dataSpan = dataExtent[1] - dataExtent[0];
    pieceList = zrUtil.map(pieceList, function (piece) {
        return {
            interval: [
                (piece.interval[0] - dataExtent[0]) / dataSpan,
                (piece.interval[1] - dataExtent[0]) / dataSpan
            ]
        };
    });
    const len = pieceList.length;
    let lastIndex = 0;

    return function (val: number) {
        let i;
        // Try to find in the location of the last found
        for (i = lastIndex; i < len; i++) {
            const interval = pieceList[i].interval;
            if (interval[0] <= val && val <= interval[1]) {
                lastIndex = i;
                break;
            }
        }
        if (i === len) { // Not found, back interation
            for (i = lastIndex - 1; i >= 0; i--) {
                const interval = pieceList[i].interval;
                if (interval[0] <= val && val <= interval[1]) {
                    lastIndex = i;
                    break;
                }
            }
        }
        return i >= 0 && i < len && selected[i];
    };
}

function getIsInContinuousRange(dataExtent: number[], range: number[]) {
    const dataSpan = dataExtent[1] - dataExtent[0];
    range = [
        (range[0] - dataExtent[0]) / dataSpan,
        (range[1] - dataExtent[0]) / dataSpan
    ];
    return function (val: number) {
        return val >= range[0] && val <= range[1];
    };
}

function isGeoCoordSys(coordSys: CoordinateSystem): coordSys is GeoLikeCoordSys {
    const dimensions = coordSys.dimensions;
    // Not use coordSys.type === 'geo' because coordSys maybe extended
    return dimensions[0] === 'lng' && dimensions[1] === 'lat';
}

class HeatmapView extends ChartView {

    static readonly type = 'heatmap';
    readonly type = HeatmapView.type;

    private _hmLayer: HeatmapLayer;

    private _progressiveEls: Element[];

    render(seriesModel: HeatmapSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        let visualMapOfThisSeries;
        ecModel.eachComponent('visualMap', function (visualMap: VisualMapModel) {
            visualMap.eachTargetSeries(function (targetSeries) {
                if (targetSeries === seriesModel) {
                    visualMapOfThisSeries = visualMap;
                }
            });
        });

        if (__DEV__) {
            if (!visualMapOfThisSeries) {
                throw new Error('Heatmap must use with visualMap');
            }
        }

        // Clear previously rendered progressive elements.
        this._progressiveEls = null;

        this.group.removeAll();

        const coordSys = seriesModel.coordinateSystem;
        if (coordSys.type === 'cartesian2d' || coordSys.type === 'calendar') {
            this._renderOnCartesianAndCalendar(seriesModel, api, 0, seriesModel.getData().count());
        }
        else if (isGeoCoordSys(coordSys)) {
            this._renderOnGeo(
                coordSys, seriesModel, visualMapOfThisSeries, api
            );
        }
    }

    incrementalPrepareRender(seriesModel: HeatmapSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this.group.removeAll();
    }

    incrementalRender(
        params: StageHandlerProgressParams,
        seriesModel: HeatmapSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        const coordSys = seriesModel.coordinateSystem;
        if (coordSys) {
            // geo does not support incremental rendering?
            if (isGeoCoordSys(coordSys)) {
                this.render(seriesModel, ecModel, api);
            }
            else {
                this._progressiveEls = [];
                this._renderOnCartesianAndCalendar(seriesModel, api, params.start, params.end, true);
            }
        }
    }

    eachRendered(cb: (el: Element) => boolean | void) {
        graphic.traverseElements(this._progressiveEls || this.group, cb);
    }

    _renderOnCartesianAndCalendar(
        seriesModel: HeatmapSeriesModel,
        api: ExtensionAPI,
        start: number,
        end: number,
        incremental?: boolean
    ) {

        const coordSys = seriesModel.coordinateSystem as Cartesian2D | Calendar;
        const isCartesian2d = isCoordinateSystemType<Cartesian2D>(coordSys, 'cartesian2d');
        let width;
        let height;
        let xAxisExtent;
        let yAxisExtent;

        if (isCartesian2d) {
            const xAxis = coordSys.getAxis('x');
            const yAxis = coordSys.getAxis('y');

            if (__DEV__) {
                if (!(xAxis.type === 'category' && yAxis.type === 'category')) {
                    throw new Error('Heatmap on cartesian must have two category axes');
                }
                if (!(xAxis.onBand && yAxis.onBand)) {
                    throw new Error('Heatmap on cartesian must have two axes with boundaryGap true');
                }
            }

            // add 0.5px to avoid the gaps
            width = xAxis.getBandWidth() + .5;
            height = yAxis.getBandWidth() + .5;
            xAxisExtent = xAxis.scale.getExtent();
            yAxisExtent = yAxis.scale.getExtent();
        }

        const group = this.group;
        const data = seriesModel.getData();

        let emphasisStyle = seriesModel.getModel(['emphasis', 'itemStyle']).getItemStyle();
        let blurStyle = seriesModel.getModel(['blur', 'itemStyle']).getItemStyle();
        let selectStyle = seriesModel.getModel(['select', 'itemStyle']).getItemStyle();
        let borderRadius = seriesModel.get(['itemStyle', 'borderRadius']);
        let labelStatesModels = getLabelStatesModels(seriesModel);
        const emphasisModel = seriesModel.getModel('emphasis');
        let focus = emphasisModel.get('focus');
        let blurScope = emphasisModel.get('blurScope');
        let emphasisDisabled = emphasisModel.get('disabled');

        const dataDims = isCartesian2d
            ? [
                data.mapDimension('x'),
                data.mapDimension('y'),
                data.mapDimension('value')
            ]
            : [
                data.mapDimension('time'),
                data.mapDimension('value')
            ];

        for (let idx = start; idx < end; idx++) {
            let rect;
            const style = data.getItemVisual(idx, 'style');

            if (isCartesian2d) {
                const dataDimX = data.get(dataDims[0], idx);
                const dataDimY = data.get(dataDims[1], idx);

                // Ignore empty data and out of extent data
                if (isNaN(data.get(dataDims[2], idx) as number)
                    || isNaN(dataDimX as number)
                    || isNaN(dataDimY as number)
                    || dataDimX < xAxisExtent[0]
                    || dataDimX > xAxisExtent[1]
                    || dataDimY < yAxisExtent[0]
                    || dataDimY > yAxisExtent[1]
                ) {
                    continue;
                }

                const point = coordSys.dataToPoint([
                    dataDimX,
                    dataDimY
                ]);

                rect = new graphic.Rect({
                    shape: {
                        x: point[0] - width / 2,
                        y: point[1] - height / 2,
                        width,
                        height
                    },
                    style
                });
            }
            else {
                // Ignore empty data
                if (isNaN(data.get(dataDims[1], idx) as number)) {
                    continue;
                }

                rect = new graphic.Rect({
                    z2: 1,
                    shape: coordSys.dataToRect([data.get(dataDims[0], idx)]).contentShape,
                    style
                });
            }

            // Optimization for large dataset
            if (data.hasItemOption) {
                const itemModel = data.getItemModel<HeatmapDataItemOption>(idx);
                const emphasisModel = itemModel.getModel('emphasis');
                emphasisStyle = emphasisModel.getModel('itemStyle').getItemStyle();
                blurStyle = itemModel.getModel(['blur', 'itemStyle']).getItemStyle();
                selectStyle = itemModel.getModel(['select', 'itemStyle']).getItemStyle();

                // Each item value struct in the data would be firstly
                // {
                //     itemStyle: { borderRadius: [30, 30] },
                //     value: [2022, 02, 22]
                // }
                borderRadius = itemModel.get(['itemStyle', 'borderRadius']);

                focus = emphasisModel.get('focus');
                blurScope = emphasisModel.get('blurScope');
                emphasisDisabled = emphasisModel.get('disabled');

                labelStatesModels = getLabelStatesModels(itemModel);
            }

            rect.shape.r = borderRadius;

            const rawValue = seriesModel.getRawValue(idx) as OptionDataValue[];
            let defaultText = '-';
            if (rawValue && rawValue[2] != null) {
                defaultText = rawValue[2] + '';
            }

            setLabelStyle(
                rect, labelStatesModels,
                {
                    labelFetcher: seriesModel,
                    labelDataIndex: idx,
                    defaultOpacity: style.opacity,
                    defaultText: defaultText
                }
            );

            rect.ensureState('emphasis').style = emphasisStyle;
            rect.ensureState('blur').style = blurStyle;
            rect.ensureState('select').style = selectStyle;

            toggleHoverEmphasis(rect, focus, blurScope, emphasisDisabled);

            rect.incremental = incremental;
            // PENDING
            if (incremental) {
                // Rect must use hover layer if it's incremental.
                rect.states.emphasis.hoverLayer = true;
            }

            group.add(rect);
            data.setItemGraphicEl(idx, rect);

            if (this._progressiveEls) {
                this._progressiveEls.push(rect);
            }
        }
    }

    _renderOnGeo(
        geo: GeoLikeCoordSys,
        seriesModel: HeatmapSeriesModel,
        visualMapModel: VisualMapModel,
        api: ExtensionAPI
    ) {
        const inRangeVisuals = visualMapModel.targetVisuals.inRange;
        const outOfRangeVisuals = visualMapModel.targetVisuals.outOfRange;
        // if (!visualMapping) {
        //     throw new Error('Data range must have color visuals');
        // }

        const data = seriesModel.getData();
        const hmLayer = this._hmLayer || (this._hmLayer || new HeatmapLayer());
        hmLayer.blurSize = seriesModel.get('blurSize');
        hmLayer.pointSize = seriesModel.get('pointSize');
        hmLayer.minOpacity = seriesModel.get('minOpacity');
        hmLayer.maxOpacity = seriesModel.get('maxOpacity');

        const rect = geo.getViewRect().clone();
        const roamTransform = geo.getRoamTransform();
        rect.applyTransform(roamTransform);

        // Clamp on viewport
        const x = Math.max(rect.x, 0);
        const y = Math.max(rect.y, 0);
        const x2 = Math.min(rect.width + rect.x, api.getWidth());
        const y2 = Math.min(rect.height + rect.y, api.getHeight());
        const width = x2 - x;
        const height = y2 - y;

        const dims = [
            data.mapDimension('lng'),
            data.mapDimension('lat'),
            data.mapDimension('value')
        ];

        const points = data.mapArray(dims, function (lng: number, lat: number, value: number) {
            const pt = geo.dataToPoint([lng, lat]);
            pt[0] -= x;
            pt[1] -= y;
            pt.push(value);
            return pt;
        });

        const dataExtent = visualMapModel.getExtent();
        const isInRange = visualMapModel.type === 'visualMap.continuous'
            ? getIsInContinuousRange(dataExtent, (visualMapModel as ContinuousModel).option.range)
            : getIsInPiecewiseRange(
                dataExtent,
                (visualMapModel as PiecewiseModel).getPieceList(),
                (visualMapModel as PiecewiseModel).option.selected
            );

        hmLayer.update(
            points, width, height,
            inRangeVisuals.color.getNormalizer(),
            {
                inRange: inRangeVisuals.color.getColorMapper(),
                outOfRange: outOfRangeVisuals.color.getColorMapper()
            },
            isInRange
        );
        const img = new graphic.Image({
            style: {
                width: width,
                height: height,
                x: x,
                y: y,
                image: hmLayer.canvas
            },
            silent: true
        });
        this.group.add(img);
    }
}

export default HeatmapView;
