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
import ChartView from '../../view/Chart';
import * as graphic from '../../util/graphic';
import { setStatesStylesFromModel } from '../../util/states';
import Path, { PathProps } from 'zrender/src/graphic/Path';
import {createClipPath} from '../helper/createClipPathFromCoordSys';
import CandlestickSeriesModel, { CandlestickDataItemOption } from './CandlestickSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { StageHandlerProgressParams } from '../../util/types';
import List from '../../data/List';
import {CandlestickItemLayout} from './candlestickLayout';
import { CoordinateSystemClipArea } from '../../coord/CoordinateSystem';
import Model from '../../model/Model';

const SKIP_PROPS = ['color', 'borderColor'] as const;

class CandlestickView extends ChartView {

    static readonly type = 'candlestick';
    readonly type = CandlestickView.type;

    private _isLargeDraw: boolean;

    private _data: List;

    render(seriesModel: CandlestickSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        // If there is clipPath created in large mode. Remove it.
        this.group.removeClipPath();

        this._updateDrawMode(seriesModel);

        this._isLargeDraw
            ? this._renderLarge(seriesModel)
            : this._renderNormal(seriesModel);
    }

    incrementalPrepareRender(seriesModel: CandlestickSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this._clear();
        this._updateDrawMode(seriesModel);
    }

    incrementalRender(
        params: StageHandlerProgressParams,
        seriesModel: CandlestickSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        this._isLargeDraw
             ? this._incrementalRenderLarge(params, seriesModel)
             : this._incrementalRenderNormal(params, seriesModel);
    }

    _updateDrawMode(seriesModel: CandlestickSeriesModel) {
        const isLargeDraw = seriesModel.pipelineContext.large;
        if (this._isLargeDraw == null || isLargeDraw !== this._isLargeDraw) {
            this._isLargeDraw = isLargeDraw;
            this._clear();
        }
    }

    _renderNormal(seriesModel: CandlestickSeriesModel) {
        const data = seriesModel.getData();
        const oldData = this._data;
        const group = this.group;
        const isSimpleBox = data.getLayout('isSimpleBox');

        const needsClip = seriesModel.get('clip', true);
        const coord = seriesModel.coordinateSystem;
        const clipArea = coord.getArea && coord.getArea();

        // There is no old data only when first rendering or switching from
        // stream mode to normal mode, where previous elements should be removed.
        if (!this._data) {
            group.removeAll();
        }

        data.diff(oldData)
            .add(function (newIdx) {
                if (data.hasValue(newIdx)) {
                    const itemLayout = data.getItemLayout(newIdx) as CandlestickItemLayout;

                    if (needsClip && isNormalBoxClipped(clipArea, itemLayout)) {
                        return;
                    }

                    const el = createNormalBox(itemLayout, newIdx, true);
                    graphic.initProps(el, {shape: {points: itemLayout.ends}}, seriesModel, newIdx);

                    setBoxCommon(el, data, newIdx, isSimpleBox);

                    group.add(el);

                    data.setItemGraphicEl(newIdx, el);
                }
            })
            .update(function (newIdx, oldIdx) {
                let el = oldData.getItemGraphicEl(oldIdx) as NormalBoxPath;

                // Empty data
                if (!data.hasValue(newIdx)) {
                    group.remove(el);
                    return;
                }

                const itemLayout = data.getItemLayout(newIdx) as CandlestickItemLayout;
                if (needsClip && isNormalBoxClipped(clipArea, itemLayout)) {
                    group.remove(el);
                    return;
                }

                if (!el) {
                    el = createNormalBox(itemLayout, newIdx);
                }
                else {
                    graphic.updateProps(el, {
                        shape: {
                            points: itemLayout.ends
                        }
                    }, seriesModel, newIdx);
                }

                setBoxCommon(el, data, newIdx, isSimpleBox);

                group.add(el);
                data.setItemGraphicEl(newIdx, el);
            })
            .remove(function (oldIdx) {
                const el = oldData.getItemGraphicEl(oldIdx);
                el && group.remove(el);
            })
            .execute();

        this._data = data;
    }

    _renderLarge(seriesModel: CandlestickSeriesModel) {
        this._clear();

        createLarge(seriesModel, this.group);

        const clipPath = seriesModel.get('clip', true)
            ? createClipPath(seriesModel.coordinateSystem, false, seriesModel)
            : null;
        if (clipPath) {
            this.group.setClipPath(clipPath);
        }
        else {
            this.group.removeClipPath();
        }

    }

    _incrementalRenderNormal(params: StageHandlerProgressParams, seriesModel: CandlestickSeriesModel) {
        const data = seriesModel.getData();
        const isSimpleBox = data.getLayout('isSimpleBox');

        let dataIndex;
        while ((dataIndex = params.next()) != null) {
            const itemLayout = data.getItemLayout(dataIndex) as CandlestickItemLayout;
            const el = createNormalBox(itemLayout, dataIndex);
            setBoxCommon(el, data, dataIndex, isSimpleBox);

            el.incremental = true;
            this.group.add(el);
        }
    }

    _incrementalRenderLarge(params: StageHandlerProgressParams, seriesModel: CandlestickSeriesModel) {
        createLarge(seriesModel, this.group, true);
    }

    remove(ecModel: GlobalModel) {
        this._clear();
    }

    _clear() {
        this.group.removeAll();
        this._data = null;
    }
}

class NormalBoxPathShape {
    points: number[][];
}

interface NormalBoxPathProps extends PathProps {
    shape?: Partial<NormalBoxPathShape>
}

class NormalBoxPath extends Path<NormalBoxPathProps> {

    readonly type = 'normalCandlestickBox';

    shape: NormalBoxPathShape;

    __simpleBox: boolean;

    constructor(opts?: NormalBoxPathProps) {
        super(opts);
    }

    getDefaultShape() {
        return new NormalBoxPathShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: NormalBoxPathShape) {
        const ends = shape.points;

        if (this.__simpleBox) {
            ctx.moveTo(ends[4][0], ends[4][1]);
            ctx.lineTo(ends[6][0], ends[6][1]);
        }
        else {
            ctx.moveTo(ends[0][0], ends[0][1]);
            ctx.lineTo(ends[1][0], ends[1][1]);
            ctx.lineTo(ends[2][0], ends[2][1]);
            ctx.lineTo(ends[3][0], ends[3][1]);
            ctx.closePath();

            ctx.moveTo(ends[4][0], ends[4][1]);
            ctx.lineTo(ends[5][0], ends[5][1]);
            ctx.moveTo(ends[6][0], ends[6][1]);
            ctx.lineTo(ends[7][0], ends[7][1]);
        }
    }
}


function createNormalBox(itemLayout: CandlestickItemLayout, dataIndex: number, isInit?: boolean) {
    const ends = itemLayout.ends;
    return new NormalBoxPath({
        shape: {
            points: isInit
                ? transInit(ends, itemLayout)
                : ends
        },
        z2: 100
    });
}

function isNormalBoxClipped(clipArea: CoordinateSystemClipArea, itemLayout: CandlestickItemLayout) {
    let clipped = true;
    for (let i = 0; i < itemLayout.ends.length; i++) {
        // If any point are in the region.
        if (clipArea.contain(itemLayout.ends[i][0], itemLayout.ends[i][1])) {
            clipped = false;
            break;
        }
    }
    return clipped;
}

function setBoxCommon(el: NormalBoxPath, data: List, dataIndex: number, isSimpleBox?: boolean) {
    const itemModel = data.getItemModel(dataIndex) as Model<CandlestickDataItemOption>;

    el.useStyle(data.getItemVisual(dataIndex, 'style'));
    el.style.strokeNoScale = true;

    el.__simpleBox = isSimpleBox;

    setStatesStylesFromModel(el, itemModel);
}

function transInit(points: number[][], itemLayout: CandlestickItemLayout) {
    return zrUtil.map(points, function (point) {
        point = point.slice();
        point[1] = itemLayout.initBaseline;
        return point;
    });
}



class LargeBoxPathShape {
    points: ArrayLike<number>;
}

interface LargeBoxPathProps extends PathProps {
    shape?: Partial<LargeBoxPathShape>
    __sign?: number
}

class LargeBoxPath extends Path {
    readonly type = 'largeCandlestickBox';

    shape: LargeBoxPathShape;

    __sign: number;

    constructor(opts?: LargeBoxPathProps) {
        super(opts);
    }

    getDefaultShape() {
        return new LargeBoxPathShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: LargeBoxPathShape) {
        // Drawing lines is more efficient than drawing
        // a whole line or drawing rects.
        const points = shape.points;
        for (let i = 0; i < points.length;) {
            if (this.__sign === points[i++]) {
                const x = points[i++];
                ctx.moveTo(x, points[i++]);
                ctx.lineTo(x, points[i++]);
            }
            else {
                i += 3;
            }
        }
    }
}

function createLarge(seriesModel: CandlestickSeriesModel, group: graphic.Group, incremental?: boolean) {
    const data = seriesModel.getData();
    const largePoints = data.getLayout('largePoints');

    const elP = new LargeBoxPath({
        shape: {points: largePoints},
        __sign: 1
    });
    group.add(elP);
    const elN = new LargeBoxPath({
        shape: {points: largePoints},
        __sign: -1
    });
    group.add(elN);

    setLargeStyle(1, elP, seriesModel, data);
    setLargeStyle(-1, elN, seriesModel, data);

    if (incremental) {
        elP.incremental = true;
        elN.incremental = true;
    }
}

function setLargeStyle(sign: number, el: LargeBoxPath, seriesModel: CandlestickSeriesModel, data: List) {
    // TODO put in visual?
    const borderColor = seriesModel.get(['itemStyle', sign > 0 ? 'borderColor' : 'borderColor0'])
        || seriesModel.get(['itemStyle', sign > 0 ? 'color' : 'color0']);

    // Color must be excluded.
    // Because symbol provide setColor individually to set fill and stroke
    const itemStyle = seriesModel.getModel('itemStyle').getItemStyle(SKIP_PROPS);

    el.useStyle(itemStyle);
    el.style.fill = null;
    el.style.stroke = borderColor;
}



export default CandlestickView;

