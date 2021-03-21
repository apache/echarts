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
import { Payload, ECElement, LineStyleOption } from '../../util/types';
import GeoView from '../geo/GeoView';
import MapView from '../../chart/map/MapView';
import Geo from '../../coord/geo/Geo';
import Model from '../../model/Model';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import { getECData } from '../../util/innerStore';
import { createOrUpdatePatternFromDecal } from '../../util/decal';
import { ViewCoordSysTransformInfoPart } from '../../coord/View';
import { GeoSVGGraphicRecord, GeoSVGResource } from '../../coord/geo/GeoSVGResource';
import Displayable from 'zrender/src/graphic/Displayable';
import { ElementTextConfig } from 'zrender/src/Element';
import List from '../../data/List';
import { GeoJSONRegion } from '../../coord/geo/Region';
import { RegionGraphic } from '../../coord/geo/geoTypes';
import { ItemStyleProps } from '../../model/mixin/itemStyle';
import { LineStyleProps } from '../../model/mixin/lineStyle';


interface RegionsGroup extends graphic.Group {
}

interface ViewBuildContext {
    api: ExtensionAPI;
    geo: Geo;
    mapOrGeoModel: GeoModel | MapSeries;
    data: List;
    isVisualEncodedByVisualMap: boolean;
    isGeo: boolean;
    transformInfoRaw: ViewCoordSysTransformInfoPart;
}

interface GeoStyleableOption {
    itemStyle?: GeoItemStyleOption;
    lineStyle?: LineStyleOption;
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

    private _regionsGroup: RegionsGroup;

    private _svgMapName: string;

    private _svgGroup: graphic.Group;

    private _svgRegionGraphics: GeoSVGGraphicRecord['regionGraphics'];


    constructor(api: ExtensionAPI) {
        const group = new graphic.Group();
        this.uid = getUID('ec_map_draw');
        this._controller = new RoamController(api.getZr());
        this._controllerHost = { target: group };
        this.group = group;

        group.add(this._regionsGroup = new graphic.Group() as RegionsGroup);
        group.add(this._svgGroup = new graphic.Group());
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

        const regionsGroup = this._regionsGroup;
        const group = this.group;

        const transformInfo = geo.getTransformInfo();
        const transformInfoRaw = transformInfo.raw;
        const transformInfoRoam = transformInfo.roam;

        // No animation when first draw or in action
        const isFirstDraw = !regionsGroup.childAt(0) || payload;

        if (isFirstDraw) {
            group.x = transformInfoRoam.x;
            group.y = transformInfoRoam.y;
            group.scaleX = transformInfoRoam.scaleX;
            group.scaleY = transformInfoRoam.scaleY;
            group.dirty();
        }
        else {
            graphic.updateProps(group, transformInfoRoam, mapOrGeoModel);
        }

        const isVisualEncodedByVisualMap = data
            && data.getVisual('visualMeta')
            && data.getVisual('visualMeta').length > 0;

        const viewBuildCtx = {
            api,
            geo,
            mapOrGeoModel,
            data,
            isVisualEncodedByVisualMap,
            isGeo,
            transformInfoRaw
        };

        if (geo.resourceType === 'geoJSON') {
            this._buildGeoJSON(viewBuildCtx);
        }
        else if (geo.resourceType === 'geoSVG') {
            this._buildSVG(viewBuildCtx);
        }

        this._updateController(mapOrGeoModel, ecModel, api);

        this._updateMapSelectHandler(mapOrGeoModel, regionsGroup, api, fromView);
    }

    private _buildGeoJSON(viewBuildCtx: ViewBuildContext): void {
        const nameMap = zrUtil.createHashMap<RegionsGroup>();
        const regionsGroup = this._regionsGroup;
        const transformInfoRaw = viewBuildCtx.transformInfoRaw;

        const transformPoint = function (point: number[]): number[] {
            return [
                point[0] * transformInfoRaw.scaleX + transformInfoRaw.x,
                point[1] * transformInfoRaw.scaleY + transformInfoRaw.y
            ];
        };

        regionsGroup.removeAll();

        // Only when the resource is GeoJSON, there is `geo.regions`.
        zrUtil.each(viewBuildCtx.geo.regions, function (region: GeoJSONRegion) {

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

            const centerPt = transformPoint(region.getCenter());
            const regionGraphic: RegionGraphic = {
                name: region.name,
                el: compoundPath,
                styleOptionKey: 'itemStyle',
                stateTrigger: regionGroup,
                eventTrigger: regionGroup,
                useLabel: true
            };
            this._resetSingleRegionGraphic(viewBuildCtx, regionGraphic, centerPt, null, false);

            regionsGroup.add(regionGroup);

        }, this);
    }

    private _buildSVG(viewBuildCtx: ViewBuildContext): void {
        const mapName = viewBuildCtx.geo.map;
        const transformInfoRaw = viewBuildCtx.transformInfoRaw;

        this._svgGroup.x = transformInfoRaw.x;
        this._svgGroup.y = transformInfoRaw.y;
        this._svgGroup.scaleX = transformInfoRaw.scaleX;
        this._svgGroup.scaleY = transformInfoRaw.scaleY;

        if (this._svgResourceChanged(mapName)) {
            this._freeSVG();
            this._useSVG(mapName);
        }

        zrUtil.each(this._svgRegionGraphics, function (regionGraphic) {
            // Note that we also allow different elements have the same name.
            // For example, a glyph of a city and the label of the city have
            // the same name and their tooltip info can be defined in a single
            // region option.
            this._resetSingleRegionGraphic(
                viewBuildCtx, regionGraphic, [0, 0], 'inside',
                // We do not know how the SVG like so we'd better not to change z2.
                // Otherwise it might bring some unexpected result. For example,
                // an area hovered that make some inner city can not be clicked.
                true
            );
        }, this);
    }

    private _resetSingleRegionGraphic(
        viewBuildCtx: ViewBuildContext,
        regionGraphic: RegionGraphic,
        labelXY: number[],
        labelPosition: ElementTextConfig['position'],
        noZ2EmphasisLift: boolean
    ): void {

        const regionName = regionGraphic.name;
        const mapOrGeoModel = viewBuildCtx.mapOrGeoModel;
        const data = viewBuildCtx.data;
        const isVisualEncodedByVisualMap = viewBuildCtx.isVisualEncodedByVisualMap;
        const isGeo = viewBuildCtx.isGeo;

        const dataIdx = data ? data.indexOfName(regionName) : null;
        const regionModel = mapOrGeoModel.getRegionModel(regionName);
        const styles = makeStyleForRegion(regionGraphic.styleOptionKey, regionModel);

        // Use the itemStyle in data if has data
        if (styles && styles.styleOptionKey === 'itemStyle' && data) {
            // Only visual color of each item will be used. It can be encoded by visualMap
            // But visual color of series is used in symbol drawing

            // Visual color for each series is for the symbol draw
            const style = data.getItemVisual(dataIdx, 'style');
            const decal = data.getItemVisual(dataIdx, 'decal');
            if (isVisualEncodedByVisualMap && style.fill) {
                styles.normal.fill = style.fill;
            }
            if (decal) {
                styles.normal.decal = createOrUpdatePatternFromDecal(decal, viewBuildCtx.api);
            }
        }

        // PENDING: SVG text, tspan and image can be named but not supporeted
        // to be styled by region option yet.
        if (styles && regionGraphic.el instanceof graphic.Path) {
            regionGraphic.el.setStyle(styles.normal);
            regionGraphic.el.style.strokeNoScale = true;
            regionGraphic.el.ensureState('emphasis').style = styles.emphasis;
            regionGraphic.el.ensureState('select').style = styles.select;
            regionGraphic.el.ensureState('blur').style = styles.blur;
        }

        if (regionGraphic.el instanceof Displayable) {
            regionGraphic.el.culling = true;
        }

        if (noZ2EmphasisLift) {
            (regionGraphic.el as ECElement).z2EmphasisLift = 0;
        }

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
        // 3. Region has no series legendSymbol, which will be add a showLabel flag in mapSymbolLayout
        if (
            regionGraphic.useLabel
            && (
                ((isGeo || isDataNaN) && showLabel)
                || (itemLayout && itemLayout.showLabel)
            )
        ) {
            const query = !isGeo ? dataIdx : regionName;
            let labelFetcher;

            // Consider dataIdx not found.
            if (!data || dataIdx >= 0) {
                labelFetcher = mapOrGeoModel;
            }

            const textEl = new graphic.Text({
                x: labelXY[0],
                y: labelXY[1],
                z2: 10,
                silent: true
            });
            textEl.afterUpdate = labelTextAfterUpdate;

            setLabelStyle<typeof query>(
                textEl, getLabelStatesModels(regionModel),
                {
                    labelFetcher: labelFetcher,
                    labelDataIndex: query,
                    defaultText: regionName
                },
                { normal: {
                    align: 'center',
                    verticalAlign: 'middle'
                } }
            );

            regionGraphic.el.setTextContent(textEl);
            regionGraphic.el.setTextConfig({
                local: true,
                insideFill: textEl.style.fill,
                position: labelPosition
            });
            (regionGraphic.el as ECElement).disableLabelAnimation = true;
        }
        else {
            regionGraphic.el.removeTextContent();
            regionGraphic.el.removeTextConfig();
            (regionGraphic.el as ECElement).disableLabelAnimation = null;
        }

        // setItemGraphicEl, setHoverStyle after all polygons and labels
        // are added to the rigionGroup
        if (data) {
            // FIXME: when series-map use a SVG map, and there are duplicated name specified
            // on different SVG elements, after `data.setItemGraphicEl(...)`:
            // (1) all of them will be mounted with `dataIndex`, `seriesIndex`, so that tooltip
            // can be triggered only mouse hover. That's correct.
            // (2) only the last element will be kept in `data`, so that if trigger tooltip
            // by `dispatchAction`, only the last one can be found and triggered. That might be
            // not correct. We will fix it in future if anyone demanding that.
            data.setItemGraphicEl(dataIdx, regionGraphic.eventTrigger);
        }
        // series-map will not trigger "geoselectchange" no matter it is
        // based on a declared geo component. Becuause series-map will
        // trigger "selectchange". If it trigger both the two events,
        // If users call `chart.dispatchAction({type: 'toggleSelect'})`,
        // it not easy to also fire event "geoselectchanged".
        else {
            // Package custom mouse event for geo component
            getECData(regionGraphic.eventTrigger).eventData = {
                componentType: 'geo',
                componentIndex: mapOrGeoModel.componentIndex,
                geoIndex: mapOrGeoModel.componentIndex,
                name: regionName,
                region: (regionModel && regionModel.option) || {}
            };
        }

        if (!data) {
            graphic.setTooltipConfig({
                el: regionGraphic.el,
                componentModel: mapOrGeoModel,
                itemName: regionName,
                // @ts-ignore FIXME:TS fix the "compatible with each other"?
                itemTooltipOption: regionModel.get('tooltip')
            });
        }

        if (regionGraphic.stateTrigger) {
            // @ts-ignore FIXME:TS fix the "compatible with each other"?
            regionGraphic.stateTrigger.highDownSilentOnTouch = !!mapOrGeoModel.get('selectedMode');
            // @ts-ignore FIXME:TS fix the "compatible with each other"?
            const emphasisModel = regionModel.getModel('emphasis');
            enableHoverEmphasis(
                regionGraphic.stateTrigger, emphasisModel.get('focus'), emphasisModel.get('blurScope')
            );
        }
    }

    remove(): void {
        this._regionsGroup.removeAll();
        this._svgGroup.removeAll();
        this._controller.dispose();
        this._freeSVG();
        this._controllerHost = null;
    }

    private _svgResourceChanged(mapName: string): boolean {
        return this._svgMapName !== mapName;
    }

    private _useSVG(mapName: string): void {
        const resource = geoSourceManager.getGeoResource(mapName);
        if (resource && resource.type === 'geoSVG') {
            const svgGraphic = (resource as GeoSVGResource).useGraphic(this.uid);
            this._svgGroup.add(svgGraphic.root);
            this._svgRegionGraphics = svgGraphic.regionGraphics;
            this._svgMapName = mapName;
        }
    }

    private _freeSVG(): void {
        const mapName = this._svgMapName;
        if (mapName == null) {
            return;
        }
        const resource = geoSourceManager.getGeoResource(mapName);
        if (resource && resource.type === 'geoSVG') {
            (resource as GeoSVGResource).freeGraphic(this.uid);
        }
        this._svgRegionGraphics = null;
        this._svgGroup.removeAll();
        this._svgMapName = null;
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

        }, this);

        controller.setPointerChecker(function (e, x, y) {
            return geo.containPoint([x, y])
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
        regionsGroup.off('click');

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

function labelTextAfterUpdate(this: graphic.Text) {
    // Make the label text do not scale but perform translate
    // based on its host el.
    const m = this.transform;
    const scaleX = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
    const scaleY = Math.sqrt(m[2] * m[2] + m[3] * m[3]);

    m[0] /= scaleX;
    m[1] /= scaleX;
    m[2] /= scaleY;
    m[3] /= scaleY;
}

function makeStyleForRegion(
    styleOptionKey: RegionGraphic['styleOptionKey'],
    regionModel: Model<
        GeoStyleableOption & {
            emphasis?: GeoStyleableOption;
            select?: GeoStyleableOption;
            blur?: GeoStyleableOption;
        }
    >
): {
    styleOptionKey: 'itemStyle';
    normal: ItemStyleProps;
    emphasis: ItemStyleProps;
    select: ItemStyleProps;
    blur: ItemStyleProps;
} | {
    styleOptionKey: 'lineStyle';
    normal: LineStyleProps;
    emphasis: LineStyleProps;
    select: LineStyleProps;
    blur: LineStyleProps;
} {
    if (!styleOptionKey) {
        return;
    }

    const normalStyleModel = regionModel.getModel(styleOptionKey);
    const emphasisStyleModel = regionModel.getModel(['emphasis', styleOptionKey]);
    const blurStyleModel = regionModel.getModel(['blur', styleOptionKey]);
    const selectStyleModel = regionModel.getModel(['select', styleOptionKey]);

    // NOTE: DONT use 'style' in visual when drawing map.
    // This component is used for drawing underlying map for both geo component and map series.
    if (styleOptionKey === 'itemStyle') {
        return {
            styleOptionKey,
            normal: getFixedItemStyle(normalStyleModel),
            emphasis: getFixedItemStyle(emphasisStyleModel),
            select: getFixedItemStyle(selectStyleModel),
            blur: getFixedItemStyle(blurStyleModel)
        };
    }
    else if (styleOptionKey === 'lineStyle') {
        return {
            styleOptionKey,
            normal: normalStyleModel.getLineStyle(),
            emphasis: emphasisStyleModel.getLineStyle(),
            select: selectStyleModel.getLineStyle(),
            blur: blurStyleModel.getLineStyle()
        };
    }
}

export default MapDraw;


// @ts-ignore FIXME:TS fix the "compatible with each other"?
