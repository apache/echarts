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

import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import MapDraw from '../../component/helper/MapDraw';

var HIGH_DOWN_PROP = '__seriesMapHighDown';
var RECORD_VERSION_PROP = '__seriesMapCallKey';

export default echarts.extendChartView({

    type: 'map',

    render: function (mapModel, ecModel, api, payload) {
        // Not render if it is an toggleSelect action from self
        if (payload && payload.type === 'mapToggleSelect'
            && payload.from === this.uid
        ) {
            return;
        }

        var group = this.group;
        group.removeAll();

        if (mapModel.getHostGeoModel()) {
            return;
        }

        // Not update map if it is an roam action from self
        if (!(payload && payload.type === 'geoRoam'
                && payload.componentType === 'series'
                && payload.seriesId === mapModel.id
            )
        ) {
            if (mapModel.needsDrawMap) {
                var mapDraw = this._mapDraw || new MapDraw(api, true);
                group.add(mapDraw.group);

                mapDraw.draw(mapModel, ecModel, api, this, payload);

                this._mapDraw = mapDraw;
            }
            else {
                // Remove drawed map
                this._mapDraw && this._mapDraw.remove();
                this._mapDraw = null;
            }
        }
        else {
            var mapDraw = this._mapDraw;
            mapDraw && group.add(mapDraw.group);
        }

        mapModel.get('showLegendSymbol') && ecModel.getComponent('legend')
            && this._renderSymbols(mapModel, ecModel, api);
    },

    remove: function () {
        this._mapDraw && this._mapDraw.remove();
        this._mapDraw = null;
        this.group.removeAll();
    },

    dispose: function () {
        this._mapDraw && this._mapDraw.remove();
        this._mapDraw = null;
    },

    _renderSymbols: function (mapModel, ecModel, api) {
        var originalData = mapModel.originalData;
        var group = this.group;

        originalData.each(originalData.mapDimension('value'), function (value, originalDataIndex) {
            if (isNaN(value)) {
                return;
            }

            var layout = originalData.getItemLayout(originalDataIndex);

            if (!layout || !layout.point) {
                // Not exists in map
                return;
            }

            var point = layout.point;
            var offset = layout.offset;

            var circle = new graphic.Circle({
                style: {
                    // Because the special of map draw.
                    // Which needs statistic of multiple series and draw on one map.
                    // And each series also need a symbol with legend color
                    //
                    // Layout and visual are put one the different data
                    fill: mapModel.getData().getVisual('color')
                },
                shape: {
                    cx: point[0] + offset * 9,
                    cy: point[1],
                    r: 3
                },
                silent: true,
                // Do not overlap the first series, on which labels are displayed.
                z2: 8 + (!offset ? graphic.Z2_EMPHASIS_LIFT + 1 : 0)
            });

            // Only the series that has the first value on the same region is in charge of rendering the label.
            // But consider the case:
            // series: [
            //     {id: 'X', type: 'map', map: 'm', {data: [{name: 'A', value: 11}, {name: 'B', {value: 22}]},
            //     {id: 'Y', type: 'map', map: 'm', {data: [{name: 'A', value: 21}, {name: 'C', {value: 33}]}
            // ]
            // The offset `0` of item `A` is at series `X`, but of item `C` is at series `Y`.
            // For backward compatibility, we follow the rule that render label `A` by the
            // settings on series `X` but render label `C` by the settings on series `Y`.
            if (!offset) {

                var fullData = mapModel.mainSeries.getData();
                var name = originalData.getName(originalDataIndex);

                var fullIndex = fullData.indexOfName(name);

                var itemModel = originalData.getItemModel(originalDataIndex);
                var labelModel = itemModel.getModel('label');
                var hoverLabelModel = itemModel.getModel('emphasis.label');

                var regionGroup = fullData.getItemGraphicEl(fullIndex);

                // `getFormattedLabel` needs to use `getData` inside. Here
                // `mapModel.getData()` is shallow cloned from `mainSeries.getData()`.
                // FIXME
                // If this is not the `mainSeries`, the item model (like label formatter)
                // set on original data item will never get. But it has been working
                // like that from the begining, and this scenario is rarely encountered.
                // So it won't be fixed until have to.
                var normalText = zrUtil.retrieve2(
                    mapModel.getFormattedLabel(fullIndex, 'normal'),
                    name
                );
                var emphasisText = zrUtil.retrieve2(
                    mapModel.getFormattedLabel(fullIndex, 'emphasis'),
                    normalText
                );

                var highDownRecord = regionGroup[HIGH_DOWN_PROP];
                var recordVersion = Math.random();

                // Prevent from register listeners duplicatedly when roaming.
                if (!highDownRecord) {
                    highDownRecord = regionGroup[HIGH_DOWN_PROP] = {};
                    var onEmphasis = zrUtil.curry(onRegionHighDown, true);
                    var onNormal = zrUtil.curry(onRegionHighDown, false);
                    regionGroup.on('mouseover', onEmphasis)
                        .on('mouseout', onNormal)
                        .on('emphasis', onEmphasis)
                        .on('normal', onNormal);
                }

                // Prevent removed regions effect current grapics.
                regionGroup[RECORD_VERSION_PROP] = recordVersion;
                zrUtil.extend(highDownRecord, {
                    recordVersion: recordVersion,
                    circle: circle,
                    labelModel: labelModel,
                    hoverLabelModel: hoverLabelModel,
                    emphasisText: emphasisText,
                    normalText: normalText
                });

                // FIXME
                // Consider set option when emphasis.
                enterRegionHighDown(highDownRecord, false);
            }

            group.add(circle);
        });
    }
});

function onRegionHighDown(toHighOrDown) {
    var highDownRecord = this[HIGH_DOWN_PROP];
    if (highDownRecord && highDownRecord.recordVersion === this[RECORD_VERSION_PROP]) {
        enterRegionHighDown(highDownRecord, toHighOrDown);
    }
}

function enterRegionHighDown(highDownRecord, toHighOrDown) {
    var circle = highDownRecord.circle;
    var labelModel = highDownRecord.labelModel;
    var hoverLabelModel = highDownRecord.hoverLabelModel;
    var emphasisText = highDownRecord.emphasisText;
    var normalText = highDownRecord.normalText;

    if (toHighOrDown) {
        circle.style.extendFrom(
            graphic.setTextStyle({}, hoverLabelModel, {
                text: hoverLabelModel.get('show') ? emphasisText : null
            }, {isRectText: true, useInsideStyle: false}, true)
        );
        // Make label upper than others if overlaps.
        circle.__mapOriginalZ2 = circle.z2;
        circle.z2 += graphic.Z2_EMPHASIS_LIFT;
    }
    else {
        graphic.setTextStyle(circle.style, labelModel, {
            text: labelModel.get('show') ? normalText : null,
            textPosition: labelModel.getShallow('position') || 'bottom'
        }, {isRectText: true, useInsideStyle: false});
        // Trigger normalize style like padding.
        circle.dirty(false);

        if (circle.__mapOriginalZ2 != null) {
            circle.z2 = circle.__mapOriginalZ2;
            circle.__mapOriginalZ2 = null;
        }
    }
}
