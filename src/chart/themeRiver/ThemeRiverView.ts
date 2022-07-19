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
import { setStatesStylesFromModel, toggleHoverEmphasis } from '../../util/states';
import {setLabelStyle, getLabelStatesModels} from '../../label/labelStyle';
import {bind} from 'zrender/src/core/util';
import DataDiffer from '../../data/DataDiffer';
import ChartView from '../../view/Chart';
import ThemeRiverSeriesModel from './ThemeRiverSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { RectLike } from 'zrender/src/core/BoundingRect';
import { ColorString } from '../../util/types';
import { saveOldStyle } from '../../animation/basicTransition';

type LayerSeries = ReturnType<ThemeRiverSeriesModel['getLayerSeries']>;

class ThemeRiverView extends ChartView {

    static readonly type = 'themeRiver';
    readonly type = ThemeRiverView.type;

    private _layersSeries: LayerSeries;
    private _layers: graphic.Group[] = [];

    render(seriesModel: ThemeRiverSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();
        const self = this;

        const group = this.group;

        const layersSeries = seriesModel.getLayerSeries();

        const layoutInfo = data.getLayout('layoutInfo');
        const rect = layoutInfo.rect;
        const boundaryGap = layoutInfo.boundaryGap;

        group.x = 0;
        group.y = rect.y + boundaryGap[0];

        function keyGetter(item: LayerSeries[number]) {
            return item.name;
        }
        const dataDiffer = new DataDiffer(
            this._layersSeries || [], layersSeries,
            keyGetter, keyGetter
        );

        const newLayersGroups: graphic.Group[] = [];

        dataDiffer
            .add(bind(process, this, 'add'))
            .update(bind(process, this, 'update'))
            .remove(bind(process, this, 'remove'))
            .execute();

        function process(status: 'add' | 'update' | 'remove', idx: number, oldIdx?: number) {
            const oldLayersGroups = self._layers;
            if (status === 'remove') {
                group.remove(oldLayersGroups[idx]);
                return;
            }
            const points0: number[] = [];
            const points1: number[] = [];
            let style;
            const indices = layersSeries[idx].indices;
            let j = 0;
            for (; j < indices.length; j++) {
                const layout = data.getItemLayout(indices[j]);
                const x = layout.x;
                const y0 = layout.y0;
                const y = layout.y;

                points0.push(x, y0);
                points1.push(x, y0 + y);

                style = data.getItemVisual(indices[j], 'style');
            }

            let polygon: ECPolygon;
            const textLayout = data.getItemLayout(indices[0]);
            const labelModel = seriesModel.getModel('label');
            const margin = labelModel.get('margin');
            const emphasisModel = seriesModel.getModel('emphasis');

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
                layerGroup.add(polygon);
                group.add(layerGroup);

                if (seriesModel.isAnimationEnabled()) {
                    polygon.setClipPath(createGridClipShape(polygon.getBoundingRect(), seriesModel, function () {
                        polygon.removeClipPath();
                    }));
                }
            }
            else {
                const layerGroup = oldLayersGroups[oldIdx];
                polygon = layerGroup.childAt(0) as ECPolygon;
                group.add(layerGroup);

                newLayersGroups[idx] = layerGroup;

                graphic.updateProps(polygon, {
                    shape: {
                        points: points0,
                        stackedOnPoints: points1
                    }
                }, seriesModel);

                saveOldStyle(polygon);
            }

            setLabelStyle(polygon, getLabelStatesModels(seriesModel), {
                labelDataIndex: indices[j - 1],
                defaultText: data.getName(indices[j - 1]),
                inheritColor: style.fill as ColorString
            }, {
                normal: {
                    verticalAlign: 'middle'
                    // align: 'right'
                }
            });
            polygon.setTextConfig({
                position: null,
                local: true
            });

            const labelEl = polygon.getTextContent();
            // TODO More label position options.
            if (labelEl) {
                labelEl.x = textLayout.x - margin;
                labelEl.y = textLayout.y0 + textLayout.y / 2;
            }

            polygon.useStyle(style);

            data.setItemGraphicEl(idx, polygon);

            setStatesStylesFromModel(polygon, seriesModel);
            toggleHoverEmphasis(
                polygon, emphasisModel.get('focus'), emphasisModel.get('blurScope'), emphasisModel.get('disabled')
            );
        }

        this._layersSeries = layersSeries;
        this._layers = newLayersGroups;
    }
};

// add animation to the view
function createGridClipShape(rect: RectLike, seriesModel: ThemeRiverSeriesModel, cb: () => void) {
    const rectEl = new graphic.Rect({
        shape: {
            x: rect.x - 10,
            y: rect.y - 10,
            width: 0,
            height: rect.height + 20
        }
    });
    graphic.initProps(rectEl, {
        shape: {
            x: rect.x - 50,
            width: rect.width + 100,
            height: rect.height + 20
        }
    }, seriesModel, cb);

    return rectEl;
}

export default ThemeRiverView;