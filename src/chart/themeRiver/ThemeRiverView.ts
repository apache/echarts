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

import {ECPolygon} from '../line/poly';
import * as graphic from '../../util/graphic';
import {bind, extend} from 'zrender/src/core/util';
import DataDiffer from '../../data/DataDiffer';
import ChartView from '../../view/Chart';
import ThemeRiverSeriesModel from './ThemeRiverSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { RectLike } from 'zrender/src/core/BoundingRect';

type LayerSeries = ReturnType<ThemeRiverSeriesModel['getLayerSeries']>;

class ThemeRiverView extends ChartView {

    static readonly type = 'themeRiver';
    readonly type = ThemeRiverView.type;

    private _layersSeries: LayerSeries;
    private _layers: graphic.Group[] = [];

    render(seriesModel: ThemeRiverSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        let data = seriesModel.getData();
        let self = this;

        let group = this.group;

        let layersSeries = seriesModel.getLayerSeries();

        let layoutInfo = data.getLayout('layoutInfo');
        let rect = layoutInfo.rect;
        let boundaryGap = layoutInfo.boundaryGap;

        group.attr('position', [0, rect.y + boundaryGap[0]]);

        function keyGetter(item: LayerSeries[number]) {
            return item.name;
        }
        let dataDiffer = new DataDiffer(
            this._layersSeries || [], layersSeries,
            keyGetter, keyGetter
        );

        let newLayersGroups: graphic.Group[] = [];

        dataDiffer
            .add(bind(process, this, 'add'))
            .update(bind(process, this, 'update'))
            .remove(bind(process, this, 'remove'))
            .execute();

        function process(status: 'add' | 'update' | 'remove', idx: number, oldIdx?: number) {
            let oldLayersGroups = self._layers;
            if (status === 'remove') {
                group.remove(oldLayersGroups[idx]);
                return;
            }
            let points0 = [];
            let points1 = [];
            let color;
            let indices = layersSeries[idx].indices;
            let j = 0;
            for (; j < indices.length; j++) {
                let layout = data.getItemLayout(indices[j]);
                let x = layout.x;
                let y0 = layout.y0;
                let y = layout.y;

                points0.push([x, y0]);
                points1.push([x, y0 + y]);

                color = data.getItemVisual(indices[j], 'color');
            }

            let polygon: ECPolygon;
            let text: graphic.Text;
            let textLayout = data.getItemLayout(indices[0]);
            let labelModel = seriesModel.getModel('label');
            let margin = labelModel.get('margin');

            const commonTextStyle = graphic.createTextStyle(labelModel, {
                text: labelModel.get('show')
                    ? seriesModel.getFormattedLabel(indices[j - 1], 'normal')
                        || data.getName(indices[j - 1])
                    : null,
                verticalAlign: 'middle'
            });
            if (status === 'add') {
                const layerGroup = newLayersGroups[idx] = new graphic.Group();
                polygon = new ECPolygon({
                    shape: {
                        points: points0,
                        stackedOnPoints: points1,
                        smooth: 0.4,
                        stackedOnSmooth: 0.4,
                        smoothConstraint: false
                    },
                    z2: 0
                });
                text = new graphic.Text({
                    style: extend({
                        x: textLayout.x - margin,
                        y: textLayout.y0 + textLayout.y / 2
                    }, commonTextStyle)
                });
                layerGroup.add(polygon);
                layerGroup.add(text);
                group.add(layerGroup);

                polygon.setClipPath(createGridClipShape(polygon.getBoundingRect(), seriesModel, function () {
                    polygon.removeClipPath();
                }));
            }
            else {
                const layerGroup = oldLayersGroups[oldIdx];
                polygon = layerGroup.childAt(0) as ECPolygon;
                text = layerGroup.childAt(1) as graphic.Text;
                group.add(layerGroup);

                newLayersGroups[idx] = layerGroup;

                graphic.updateProps(polygon, {
                    shape: {
                        points: points0,
                        stackedOnPoints: points1
                    }
                }, seriesModel);

                graphic.updateProps(text, {
                    style: extend({
                        x: textLayout.x - margin,
                        y: textLayout.y0 + textLayout.y / 2
                    }, commonTextStyle)
                }, seriesModel);
            }

            let hoverItemStyleModel = seriesModel.getModel(['emphasis', 'itemStyle']);
            let itemStyleModel = seriesModel.getModel('itemStyle');


            polygon.setStyle(extend({
                fill: color
            }, itemStyleModel.getItemStyle(['color'])));

            graphic.enableHoverEmphasis(polygon, hoverItemStyleModel.getItemStyle());
        }

        this._layersSeries = layersSeries;
        this._layers = newLayersGroups;
    }
};

// add animation to the view
function createGridClipShape(rect: RectLike, seriesModel: ThemeRiverSeriesModel, cb: () => void) {
    let rectEl = new graphic.Rect({
        shape: {
            x: rect.x - 10,
            y: rect.y - 10,
            width: 0,
            height: rect.height + 20
        }
    });
    graphic.initProps(rectEl, {
        shape: {
            width: rect.width + 20,
            height: rect.height + 20
        }
    }, seriesModel, cb);

    return rectEl;
}


ChartView.registerClass(ThemeRiverView);