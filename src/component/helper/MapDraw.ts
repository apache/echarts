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
import { enableHoverEmphasis, DISPLAY_STATES } from '../../util/states';
import geoSourceManager from '../../coord/geo/geoSourceManager';
import {getUID} from '../../util/component';
import ExtensionAPI from '../../core/ExtensionAPI';
import GeoModel, { GeoCommonOptionMixin, GeoItemStyleOption } from '../../coord/geo/GeoModel';
import MapSeries from '../../chart/map/MapSeries';
import GlobalModel from '../../model/Global';
import { Payload, ECElement } from '../../util/types';
import GeoView from '../geo/GeoView';
import MapView from '../../chart/map/MapView';
import Region from '../../coord/geo/Region';
import Geo from '../../coord/geo/Geo';
import Model from '../../model/Model';
import Transformable from 'zrender/src/core/Transformable';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import { getECData } from '../../util/innerStore';
import { createOrUpdatePatternFromDecal } from '../../util/decal';


interface RegionsGroup extends graphic.Group {
    __regions: Region[];
}

function getFixedItemStyle(model: Model<GeoItemStyleOption>) {
    const itemStyle = model.getItemStyle();
    const areaColor = model.get('areaColor');

    // If user want the color not to be changed when hover,
    // they should both set areaColor and color to be null.
    if (areaColor != null) {
        itemStyle.fill = areaColor;
    }

    return itemStyle;
}
class MapDraw {

    private uid: string;

    // @ts-ignore FIXME:TS
    private _controller: RoamController;

    private _controllerHost: {
        target: graphic.Group;
        zoom?: number;
        zoomLimit?: GeoCommonOptionMixin['scaleLimit'];
    };

    readonly group: graphic.Group;


    /**
     * This flag is used to make sure that only one among
     * `pan`, `zoom`, `click` can occurs, otherwise 'selected'
     * action may be triggered when `pan`, which is unexpected.
     */
    private _mouseDownFlag: boolean;

    private _mapName: string;

    private _initialized: string;

    private _regionsGroup: RegionsGroup;

    private _backgroundGroup: graphic.Group;


    constructor(api: ExtensionAPI) {
        const group = new graphic.Group();
        this.uid = getUID('ec_map_draw');
        // @ts-ignore FIXME:TS
        this._controller = new RoamController(api.getZr());
        this._controllerHost = { target: group };
        this.group = group;

        group.add(this._regionsGroup = new graphic.Group() as RegionsGroup);
        group.add(this._backgroundGroup = new graphic.Group());
    }

    draw(
        mapOrGeoModel: GeoModel | MapSeries,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        fromView: MapView | GeoView,
        payload: Payload
    ): void {

        const isGeo = mapOrGeoModel.mainType === 'geo';

        // Map series has data. GEO model that controlled by map series
        // will be assigned with map data. Other GEO model has no data.
        let data = (mapOrGeoModel as MapSeries).getData && (mapOrGeoModel as MapSeries).getData();
        isGeo && ecModel.eachComponent({mainType: 'series', subType: 'map'}, function (mapSeries: MapSeries) {
            if (!data && mapSeries.getHostGeoModel() === mapOrGeoModel) {
                data = mapSeries.getData();
            }
        });

        const geo = mapOrGeoModel.coordinateSystem;

        this._updateBackground(geo);

        const regionsGroup = this._regionsGroup;
        const group = this.group;

        const transformInfo = geo.getTransformInfo();

        // No animation when first draw or in action
        const isFirstDraw = !regionsGroup.childAt(0) || payload;
        let targetScaleX: number;
        let targetScaleY: number;
        if (isFirstDraw) {
            group.transform = transformInfo.roamTransform;
            group.decomposeTransform();
            group.dirty();
        }
        else {
            const target = new Transformable();
            target.transform = transformInfo.roamTransform;
            target.decomposeTransform();
            const props = {
                scaleX: target.scaleX,
                scaleY: target.scaleY,
                x: target.x,
                y: target.y
            };
            targetScaleX = target.scaleX;
            targetScaleY = target.scaleY;
            graphic.updateProps(group, props, mapOrGeoModel);
        }

        regionsGroup.removeAll();

        const nameMap = zrUtil.createHashMap<RegionsGroup>();


        const isVisualEncodedByVisualMap = data
            && data.getVisual('visualMeta')
            && data.getVisual('visualMeta').length > 0;

        zrUtil.each(geo.regions, function (region) {
            // Consider in GeoJson properties.name may be duplicated, for example,
            // there is multiple region named "United Kindom" or "France" (so many
            // colonies). And it is not appropriate to merge them in geo, which
            // will make them share the same label and bring trouble in label
            // location calculation.
            const regionGroup = nameMap.get(region.name)
                || nameMap.set(region.name, new graphic.Group() as RegionsGroup);

            const compoundPath = new graphic.CompoundPath({
                segmentIgnoreThreshold: 1,
                shape: {
                    paths: []
                }
            });
            regionGroup.add(compoundPath);

            const regionModel = mapOrGeoModel.getRegionModel(region.name) || mapOrGeoModel;

            // @ts-ignore FIXME:TS fix the "compatible with each other"?
            const itemStyleModel = regionModel.getModel('itemStyle');
            // @ts-ignore FIXME:TS fix the "compatible with each other"?
            const emphasisModel = regionModel.getModel('emphasis');
            const emphasisItemStyleModel = emphasisModel.getModel('itemStyle');
            // @ts-ignore FIXME:TS fix the "compatible with each other"?
            const blurItemStyleModel = regionModel.getModel(['blur', 'itemStyle']);
            // @ts-ignore FIXME:TS fix the "compatible with each other"?
            const selectItemStyleModel = regionModel.getModel(['select', 'itemStyle']);

            // NOTE: DONT use 'style' in visual when drawing map.
            // This component is used for drawing underlying map for both geo component and map series.
            const itemStyle = getFixedItemStyle(itemStyleModel);
            const emphasisItemStyle = getFixedItemStyle(emphasisItemStyleModel);
            const blurItemStyle = getFixedItemStyle(blurItemStyleModel);
            const selectItemStyle = getFixedItemStyle(selectItemStyleModel);

            let dataIdx;
            // Use the itemStyle in data if has data
            if (data) {
                dataIdx = data.indexOfName(region.name);
                // Only visual color of each item will be used. It can be encoded by visualMap
                // But visual color of series is used in symbol drawing
                //
                // Visual color for each series is for the symbol draw
                const style = data.getItemVisual(dataIdx, 'style');
                const decal = data.getItemVisual(dataIdx, 'decal');
                if (isVisualEncodedByVisualMap && style.fill) {
                    itemStyle.fill = style.fill;
                }
                if (decal) {
                    itemStyle.decal = createOrUpdatePatternFromDecal(decal, api);
                }
            }

            const sx = transformInfo.rawScaleX;
            const sy = transformInfo.rawScaleY;
            const offsetX = transformInfo.rawX;
            const offsetY = transformInfo.rawY;
            const transformPoint = function (point: number[]): number[] {
                return [
                    point[0] * sx + offsetX,
                    point[1] * sy + offsetY
                ];
            };

            zrUtil.each(region.geometries, function (geometry) {
                if (geometry.type !== 'polygon') {
                    return;
                }
                const points = [];
                for (let i = 0; i < geometry.exterior.length; ++i) {
                    points.push(transformPoint(geometry.exterior[i]));
                }
                compoundPath.shape.paths.push(new graphic.Polygon({
                    segmentIgnoreThreshold: 1,
                    shape: {
                        points: points
                    }
                }));

                for (let i = 0; i < (geometry.interiors ? geometry.interiors.length : 0); ++i) {
                    const interior = geometry.interiors[i];
                    const points = [];
                    for (let j = 0; j < interior.length; ++j) {
                        points.push(transformPoint(interior[j]));
                    }
                    compoundPath.shape.paths.push(new graphic.Polygon({
                        segmentIgnoreThreshold: 1,
                        shape: {
                            points: points
                        }
                    }));
                }
            });

            compoundPath.setStyle(itemStyle);
            compoundPath.style.strokeNoScale = true;
            compoundPath.culling = true;

            compoundPath.ensureState('emphasis').style = emphasisItemStyle;
            compoundPath.ensureState('blur').style = blurItemStyle;
            compoundPath.ensureState('select').style = selectItemStyle;

            let showLabel = false;
            for (let i = 0; i < DISPLAY_STATES.length; i++) {
                const stateName = DISPLAY_STATES[i];
                // @ts-ignore FIXME:TS fix the "compatible with each other"?
                if (regionModel.get(
                    stateName === 'normal' ? ['label', 'show'] : [stateName, 'label', 'show']
                )) {
                    showLabel = true;
                    break;
                }
            }

            const isDataNaN = data && isNaN(data.get(data.mapDimension('value'), dataIdx) as number);
            const itemLayout = data && data.getItemLayout(dataIdx);

            // In the following cases label will be drawn
            // 1. In map series and data value is NaN
            // 2. In geo component
            // 4. Region has no series legendSymbol, which will be add a showLabel flag in mapSymbolLayout
            if (
                (isGeo || isDataNaN && (showLabel))
                || (itemLayout && itemLayout.showLabel)
            ) {
                const query = !isGeo ? dataIdx : region.name;
                let labelFetcher;

                // Consider dataIdx not found.
                if (!data || dataIdx >= 0) {
                    labelFetcher = mapOrGeoModel;
                }

                const centerPt = transformPoint(region.center);
                const textEl = new graphic.Text({
                    x: centerPt[0],
                    y: centerPt[1],
                    // FIXME
                    // label rotation is not support yet in geo or regions of series-map
                    // that has no data. The rotation will be effected by this `scale`.
                    // So needed to change to RectText?
                    scaleX: 1 / group.scaleX,
                    scaleY: 1 / group.scaleY,
                    z2: 10,
                    silent: true
                });

                setLabelStyle<typeof query>(
                    textEl, getLabelStatesModels(regionModel),
                    {
                        labelFetcher: labelFetcher,
                        labelDataIndex: query,
                        defaultText: region.name
                    },
                    { normal: {
                        align: 'center',
                        verticalAlign: 'middle'
                    } }
                );

                compoundPath.setTextContent(textEl);
                compoundPath.setTextConfig({
                    local: true
                });

                (compoundPath as ECElement).disableLabelAnimation = true;

                if (!isFirstDraw) {
                    // Text animation
                    graphic.updateProps(textEl, {
                        scaleX: 1 / targetScaleX,
                        scaleY: 1 / targetScaleY
                    }, mapOrGeoModel);
                }
            }

            // setItemGraphicEl, setHoverStyle after all polygons and labels
            // are added to the rigionGroup
            if (data) {
                data.setItemGraphicEl(dataIdx, regionGroup);
            }
            else {
                const regionModel = mapOrGeoModel.getRegionModel(region.name);
                // Package custom mouse event for geo component
                getECData(compoundPath).eventData = {
                    componentType: 'geo',
                    componentIndex: mapOrGeoModel.componentIndex,
                    geoIndex: mapOrGeoModel.componentIndex,
                    name: region.name,
                    region: (regionModel && regionModel.option) || {}
                };
            }

            const groupRegions = regionGroup.__regions || (regionGroup.__regions = []);
            groupRegions.push(region);

            // @ts-ignore FIXME:TS fix the "compatible with each other"?
            regionGroup.highDownSilentOnTouch = !!mapOrGeoModel.get('selectedMode');
            enableHoverEmphasis(regionGroup, emphasisModel.get('focus'), emphasisModel.get('blurScope'));

            regionsGroup.add(regionGroup);
        });

        this._updateController(mapOrGeoModel, ecModel, api);

        this._updateMapSelectHandler(mapOrGeoModel, regionsGroup, api, fromView);
    }

    remove(): void {
        this._regionsGroup.removeAll();
        this._backgroundGroup.removeAll();
        this._controller.dispose();
        this._mapName && geoSourceManager.removeGraphic(this._mapName, this.uid);
        this._mapName = null;
        this._controllerHost = null;
    }

    private _updateBackground(geo: Geo): void {
        const mapName = geo.map;

        if (this._mapName !== mapName) {
            zrUtil.each(geoSourceManager.makeGraphic(mapName, this.uid), function (root) {
                this._backgroundGroup.add(root);
            }, this);
        }

        this._mapName = mapName;
    }

    private _updateController(
        this: MapDraw, mapOrGeoModel: GeoModel | MapSeries, ecModel: GlobalModel, api: ExtensionAPI
    ): void {
        const geo = mapOrGeoModel.coordinateSystem;
        const controller = this._controller;
        const controllerHost = this._controllerHost;

        // @ts-ignore FIXME:TS
        controllerHost.zoomLimit = mapOrGeoModel.get('scaleLimit');
        controllerHost.zoom = geo.getZoom();

        // roamType is will be set default true if it is null
        // @ts-ignore FIXME:TS
        controller.enable(mapOrGeoModel.get('roam') || false);
        const mainType = mapOrGeoModel.mainType;

        function makeActionBase(): Payload {
            const action = {
                type: 'geoRoam',
                componentType: mainType
            } as Payload;
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

            const group = this.group;
            this._regionsGroup.traverse(function (el) {
                const textContent = el.getTextContent();
                if (textContent) {
                    textContent.scaleX = 1 / group.scaleX;
                    textContent.scaleY = 1 / group.scaleY;
                    textContent.markRedraw();
                }
            });
        }, this);

        controller.setPointerChecker(function (e, x, y) {
            return geo.getViewRectAfterRoam().contain(x, y)
                && !onIrrelevantElement(e, api, mapOrGeoModel);
        });
    }

    private _updateMapSelectHandler(
        mapOrGeoModel: GeoModel | MapSeries,
        regionsGroup: RegionsGroup,
        api: ExtensionAPI,
        fromView: MapView | GeoView
    ): void {
        const mapDraw = this;

        regionsGroup.off('mousedown');

        // @ts-ignore FIXME:TS resolve type conflict
        if (mapOrGeoModel.get('selectedMode')) {

            regionsGroup.on('mousedown', function () {
                mapDraw._mouseDownFlag = true;
            });

            regionsGroup.on('click', function (e) {
                if (!mapDraw._mouseDownFlag) {
                    return;
                }
                mapDraw._mouseDownFlag = false;
            });
        }
    }

};

export default MapDraw;
