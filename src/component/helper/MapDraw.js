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
import RoamController from './RoamController';
import * as roamHelper from '../../component/helper/roamHelper';
import {onIrrelevantElement} from '../../component/helper/cursorHelper';
import * as graphic from '../../util/graphic';
import geoSourceManager from '../../coord/geo/geoSourceManager';
import {getUID} from '../../util/component';

function getFixedItemStyle(model, scale) {
    var itemStyle = model.getItemStyle();
    var areaColor = model.get('areaColor');

    // If user want the color not to be changed when hover,
    // they should both set areaColor and color to be null.
    if (areaColor != null) {
        itemStyle.fill = areaColor;
    }

    return itemStyle;
}

function updateMapSelectHandler(mapDraw, mapOrGeoModel, regionsGroup, api, fromView) {
    regionsGroup.off('click');
    regionsGroup.off('mousedown');

    if (mapOrGeoModel.get('selectedMode')) {

        regionsGroup.on('mousedown', function () {
            mapDraw._mouseDownFlag = true;
        });

        regionsGroup.on('click', function (e) {
            if (!mapDraw._mouseDownFlag) {
                return;
            }
            mapDraw._mouseDownFlag = false;

            var el = e.target;
            while (!el.__regions) {
                el = el.parent;
            }
            if (!el) {
                return;
            }

            var action = {
                type: (mapOrGeoModel.mainType === 'geo' ? 'geo' : 'map') + 'ToggleSelect',
                batch: zrUtil.map(el.__regions, function (region) {
                    return {
                        name: region.name,
                        from: fromView.uid
                    };
                })
            };
            action[mapOrGeoModel.mainType + 'Id'] = mapOrGeoModel.id;

            api.dispatchAction(action);

            updateMapSelected(mapOrGeoModel, regionsGroup);
        });
    }
}

function updateMapSelected(mapOrGeoModel, regionsGroup) {
    // FIXME
    regionsGroup.eachChild(function (otherRegionEl) {
        zrUtil.each(otherRegionEl.__regions, function (region) {
            otherRegionEl.trigger(mapOrGeoModel.isSelected(region.name) ? 'emphasis' : 'normal');
        });
    });
}

/**
 * @alias module:echarts/component/helper/MapDraw
 * @param {module:echarts/ExtensionAPI} api
 * @param {boolean} updateGroup
 */
function MapDraw(api, updateGroup) {

    var group = new graphic.Group();

    /**
     * @type {string}
     * @private
     */
    this.uid = getUID('ec_map_draw');

    /**
     * @type {module:echarts/component/helper/RoamController}
     * @private
     */
    this._controller = new RoamController(api.getZr());

    /**
     * @type {Object} {target, zoom, zoomLimit}
     * @private
     */
    this._controllerHost = {target: updateGroup ? group : null};

    /**
     * @type {module:zrender/container/Group}
     * @readOnly
     */
    this.group = group;

    /**
     * @type {boolean}
     * @private
     */
    this._updateGroup = updateGroup;

    /**
     * This flag is used to make sure that only one among
     * `pan`, `zoom`, `click` can occurs, otherwise 'selected'
     * action may be triggered when `pan`, which is unexpected.
     * @type {booelan}
     */
    this._mouseDownFlag;

    /**
     * @type {string}
     */
    this._mapName;

    /**
     * @type {boolean}
     */
    this._initialized;

    /**
     * @type {module:zrender/container/Group}
     */
    group.add(this._regionsGroup = new graphic.Group());

    /**
     * @type {module:zrender/container/Group}
     */
    group.add(this._backgroundGroup = new graphic.Group());
}

MapDraw.prototype = {

    constructor: MapDraw,

    draw: function (mapOrGeoModel, ecModel, api, fromView, payload) {

        var isGeo = mapOrGeoModel.mainType === 'geo';

        // Map series has data. GEO model that controlled by map series
        // will be assigned with map data. Other GEO model has no data.
        var data = mapOrGeoModel.getData && mapOrGeoModel.getData();
        isGeo && ecModel.eachComponent({mainType: 'series', subType: 'map'}, function (mapSeries) {
            if (!data && mapSeries.getHostGeoModel() === mapOrGeoModel) {
                data = mapSeries.getData();
            }
        });

        var geo = mapOrGeoModel.coordinateSystem;

        this._updateBackground(geo);

        var regionsGroup = this._regionsGroup;
        var group = this.group;

        var scale = geo.scale;
        var transform = {
            position: geo.position,
            scale: scale
        };

        // No animation when first draw or in action
        if (!regionsGroup.childAt(0) || payload) {
            group.attr(transform);
        }
        else {
            graphic.updateProps(group, transform, mapOrGeoModel);
        }

        regionsGroup.removeAll();

        var itemStyleAccessPath = ['itemStyle'];
        var hoverItemStyleAccessPath = ['emphasis', 'itemStyle'];
        var labelAccessPath = ['label'];
        var hoverLabelAccessPath = ['emphasis', 'label'];
        var nameMap = zrUtil.createHashMap();

        zrUtil.each(geo.regions, function (region) {

            // Consider in GeoJson properties.name may be duplicated, for example,
            // there is multiple region named "United Kindom" or "France" (so many
            // colonies). And it is not appropriate to merge them in geo, which
            // will make them share the same label and bring trouble in label
            // location calculation.
            var regionGroup = nameMap.get(region.name)
                || nameMap.set(region.name, new graphic.Group());

            var compoundPath = new graphic.CompoundPath({
                shape: {
                    paths: []
                }
            });
            regionGroup.add(compoundPath);

            var regionModel = mapOrGeoModel.getRegionModel(region.name) || mapOrGeoModel;

            var itemStyleModel = regionModel.getModel(itemStyleAccessPath);
            var hoverItemStyleModel = regionModel.getModel(hoverItemStyleAccessPath);
            var itemStyle = getFixedItemStyle(itemStyleModel, scale);
            var hoverItemStyle = getFixedItemStyle(hoverItemStyleModel, scale);

            var labelModel = regionModel.getModel(labelAccessPath);
            var hoverLabelModel = regionModel.getModel(hoverLabelAccessPath);

            var dataIdx;
            // Use the itemStyle in data if has data
            if (data) {
                dataIdx = data.indexOfName(region.name);
                // Only visual color of each item will be used. It can be encoded by dataRange
                // But visual color of series is used in symbol drawing
                //
                // Visual color for each series is for the symbol draw
                var visualColor = data.getItemVisual(dataIdx, 'color', true);
                if (visualColor) {
                    itemStyle.fill = visualColor;
                }
            }

            zrUtil.each(region.geometries, function (geometry) {
                if (geometry.type !== 'polygon') {
                    return;
                }
                compoundPath.shape.paths.push(new graphic.Polygon({
                    shape: {
                        points: geometry.exterior
                    }
                }));

                for (var i = 0; i < (geometry.interiors ? geometry.interiors.length : 0); i++) {
                    compoundPath.shape.paths.push(new graphic.Polygon({
                        shape: {
                            points: geometry.interiors[i]
                        }
                    }));
                }
            });

            compoundPath.setStyle(itemStyle);
            compoundPath.style.strokeNoScale = true;
            compoundPath.culling = true;
            // Label
            var showLabel = labelModel.get('show');
            var hoverShowLabel = hoverLabelModel.get('show');

            var isDataNaN = data && isNaN(data.get(data.mapDimension('value'), dataIdx));
            var itemLayout = data && data.getItemLayout(dataIdx);
            // In the following cases label will be drawn
            // 1. In map series and data value is NaN
            // 2. In geo component
            // 4. Region has no series legendSymbol, which will be add a showLabel flag in mapSymbolLayout
            if (
                (isGeo || isDataNaN && (showLabel || hoverShowLabel))
                || (itemLayout && itemLayout.showLabel)
                ) {
                var query = !isGeo ? dataIdx : region.name;
                var labelFetcher;

                // Consider dataIdx not found.
                if (!data || dataIdx >= 0) {
                    labelFetcher = mapOrGeoModel;
                }

                var textEl = new graphic.Text({
                    position: region.center.slice(),
                    scale: [1 / scale[0], 1 / scale[1]],
                    z2: 10,
                    silent: true
                });

                graphic.setLabelStyle(
                    textEl.style, textEl.hoverStyle = {}, labelModel, hoverLabelModel,
                    {
                        labelFetcher: labelFetcher,
                        labelDataIndex: query,
                        defaultText: region.name,
                        useInsideStyle: false
                    },
                    {
                        textAlign: 'center',
                        textVerticalAlign: 'middle'
                    }
                );

                regionGroup.add(textEl);
            }

            // setItemGraphicEl, setHoverStyle after all polygons and labels
            // are added to the rigionGroup
            if (data) {
                data.setItemGraphicEl(dataIdx, regionGroup);
            }
            else {
                var regionModel = mapOrGeoModel.getRegionModel(region.name);
                // Package custom mouse event for geo component
                compoundPath.eventData = {
                    componentType: 'geo',
                    componentIndex: mapOrGeoModel.componentIndex,
                    geoIndex: mapOrGeoModel.componentIndex,
                    name: region.name,
                    region: (regionModel && regionModel.option) || {}
                };
            }

            var groupRegions = regionGroup.__regions || (regionGroup.__regions = []);
            groupRegions.push(region);

            graphic.setHoverStyle(
                regionGroup,
                hoverItemStyle,
                {hoverSilentOnTouch: !!mapOrGeoModel.get('selectedMode')}
            );

            regionsGroup.add(regionGroup);
        });

        this._updateController(mapOrGeoModel, ecModel, api);

        updateMapSelectHandler(this, mapOrGeoModel, regionsGroup, api, fromView);

        updateMapSelected(mapOrGeoModel, regionsGroup);
    },

    remove: function () {
        this._regionsGroup.removeAll();
        this._backgroundGroup.removeAll();
        this._controller.dispose();
        this._mapName && geoSourceManager.removeGraphic(this._mapName, this.uid);
        this._mapName = null;
        this._controllerHost = {};
    },

    _updateBackground: function (geo) {
        var mapName = geo.map;

        if (this._mapName !== mapName) {
            zrUtil.each(geoSourceManager.makeGraphic(mapName, this.uid), function (root) {
                this._backgroundGroup.add(root);
            }, this);
        }

        this._mapName = mapName;
    },

    _updateController: function (mapOrGeoModel, ecModel, api) {
        var geo = mapOrGeoModel.coordinateSystem;
        var controller = this._controller;
        var controllerHost = this._controllerHost;

        controllerHost.zoomLimit = mapOrGeoModel.get('scaleLimit');
        controllerHost.zoom = geo.getZoom();

        // roamType is will be set default true if it is null
        controller.enable(mapOrGeoModel.get('roam') || false);
        var mainType = mapOrGeoModel.mainType;

        function makeActionBase() {
            var action = {
                type: 'geoRoam',
                componentType: mainType
            };
            action[mainType + 'Id'] = mapOrGeoModel.id;
            return action;
        }

        controller.off('pan').on('pan', function (e) {
            this._mouseDownFlag = false;

            roamHelper.updateViewOnPan(controllerHost, e.dx, e.dy);

            api.dispatchAction(zrUtil.extend(makeActionBase(), {
                dx: e.dx,
                dy: e.dy
            }));
        }, this);

        controller.off('zoom').on('zoom', function (e) {
            this._mouseDownFlag = false;

            roamHelper.updateViewOnZoom(controllerHost, e.scale, e.originX, e.originY);

            api.dispatchAction(zrUtil.extend(makeActionBase(), {
                zoom: e.scale,
                originX: e.originX,
                originY: e.originY
            }));

            if (this._updateGroup) {
                var scale = this.group.scale;
                this._regionsGroup.traverse(function (el) {
                    if (el.type === 'text') {
                        el.attr('scale', [1 / scale[0], 1 / scale[1]]);
                    }
                });
            }
        }, this);

        controller.setPointerChecker(function (e, x, y) {
            return geo.getViewRectAfterRoam().contain(x, y)
                && !onIrrelevantElement(e, api, mapOrGeoModel);
        });
    }
};

export default MapDraw;