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
import {
    toggleHoverEmphasis,
    enableComponentHighDownFeatures,
    setDefaultStateProxy
} from '../../util/states';
import geoSourceManager from '../../coord/geo/geoSourceManager';
import {getUID} from '../../util/component';
import ExtensionAPI from '../../core/ExtensionAPI';
import GeoModel, { GeoCommonOptionMixin, GeoItemStyleOption, RegoinOption } from '../../coord/geo/GeoModel';
import MapSeries, { MapDataItemOption } from '../../chart/map/MapSeries';
import GlobalModel from '../../model/Global';
import { Payload, ECElement, LineStyleOption, InnerFocus, DisplayState } from '../../util/types';
import GeoView from '../geo/GeoView';
import MapView from '../../chart/map/MapView';
import Geo from '../../coord/geo/Geo';
import Model from '../../model/Model';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import { getECData } from '../../util/innerStore';
import { createOrUpdatePatternFromDecal } from '../../util/decal';
import ZRText, {TextStyleProps} from 'zrender/src/graphic/Text';
import { ViewCoordSysTransformInfoPart } from '../../coord/View';
import { GeoSVGGraphicRecord, GeoSVGResource } from '../../coord/geo/GeoSVGResource';
import Displayable from 'zrender/src/graphic/Displayable';
import Element from 'zrender/src/Element';
import SeriesData from '../../data/SeriesData';
import { GeoJSONRegion } from '../../coord/geo/Region';
import { SVGNodeTagLower } from 'zrender/src/tool/parseSVG';
import { makeInner } from '../../util/model';
import { GeoProjection, ProjectionStream } from '../../coord/geo/geoTypes';

interface RegionsGroup extends graphic.Group {
}

type RegionModel = ReturnType<GeoModel['getRegionModel']> | ReturnType<MapSeries['getRegionModel']>;

type MapOrGeoModel = GeoModel | MapSeries;

interface ViewBuildContext {
    api: ExtensionAPI;
    geo: Geo;
    mapOrGeoModel: GeoModel | MapSeries;
    data: SeriesData;
    isVisualEncodedByVisualMap: boolean;
    isGeo: boolean;
    transformInfoRaw: ViewCoordSysTransformInfoPart;
}

interface GeoStyleableOption {
    itemStyle?: GeoItemStyleOption;
    lineStyle?: LineStyleOption;
}
type RegionName = string;

/**
 * Only these tags enable use `itemStyle` if they are named in SVG.
 * Other tags like <text> <tspan> <image> might not suitable for `itemStyle`.
 * They will not be considered to be styled until some requirements come.
 */
const OPTION_STYLE_ENABLED_TAGS: SVGNodeTagLower[] = [
    'rect', 'circle', 'line', 'ellipse', 'polygon', 'polyline', 'path'
];
const OPTION_STYLE_ENABLED_TAG_MAP = zrUtil.createHashMap<number, SVGNodeTagLower>(
    OPTION_STYLE_ENABLED_TAGS
);
const STATE_TRIGGER_TAG_MAP = zrUtil.createHashMap<number, SVGNodeTagLower>(
    OPTION_STYLE_ENABLED_TAGS.concat(['g']) as SVGNodeTagLower[]
);
const LABEL_HOST_MAP = zrUtil.createHashMap<number, SVGNodeTagLower>(
    OPTION_STYLE_ENABLED_TAGS.concat(['g']) as SVGNodeTagLower[]
);
const mapLabelRaw = makeInner<{
    ignore: boolean
}, ZRText>();


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
// Only stroke can be used for line.
// Using fill in style if stroke not exits.
// TODO Not sure yet. Perhaps a separate `lineStyle`?
function fixLineStyle(styleHost: { style: graphic.Path['style'] }) {
    const style = styleHost.style;
    if (style) {
        style.stroke = (style.stroke || style.fill);
        style.fill = null;
    }
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

    private _regionsGroupByName: zrUtil.HashMap<RegionsGroup>;

    private _svgMapName: string;

    private _svgGroup: graphic.Group;

    private _svgGraphicRecord: GeoSVGGraphicRecord;

    // A name may correspond to multiple graphics.
    // Used as event dispatcher.
    private _svgDispatcherMap: zrUtil.HashMap<Element[], RegionName>;


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
        const regionsGroupByName = this._regionsGroupByName = zrUtil.createHashMap<RegionsGroup, string>();
        const regionsInfoByName = zrUtil.createHashMap<{
            dataIdx: number;
            regionModel: Model<RegoinOption> | Model<MapDataItemOption>;
        }, string>();
        const regionsGroup = this._regionsGroup;
        const transformInfoRaw = viewBuildCtx.transformInfoRaw;
        const mapOrGeoModel = viewBuildCtx.mapOrGeoModel;
        const data = viewBuildCtx.data;
        const projection = viewBuildCtx.geo.projection;
        const projectionStream = projection && projection.stream;

        function transformPoint(point: number[], project: GeoProjection['project']): number[] {
            if (project) {
                // projection may return null point.
                point = project(point);
            }
            return point && [
                point[0] * transformInfoRaw.scaleX + transformInfoRaw.x,
                point[1] * transformInfoRaw.scaleY + transformInfoRaw.y
            ];
        };

        function transformPolygonPoints(inPoints: number[][]): number[][] {
            const outPoints = [];
            // If projectionStream is provided. Use it instead of single point project.
            const project = !projectionStream && projection && projection.project;
            for (let i = 0; i < inPoints.length; ++i) {
                const newPt = transformPoint(inPoints[i], project);
                newPt && outPoints.push(newPt);
            }
            return outPoints;
        }

        function getPolyShape(points: number[][]) {
            return {
                shape: {
                    points: transformPolygonPoints(points)
                }
            };
        }

        regionsGroup.removeAll();

        // Only when the resource is GeoJSON, there is `geo.regions`.
        zrUtil.each(viewBuildCtx.geo.regions, function (region: GeoJSONRegion) {
            const regionName = region.name;

            // Consider in GeoJson properties.name may be duplicated, for example,
            // there is multiple region named "United Kindom" or "France" (so many
            // colonies). And it is not appropriate to merge them in geo, which
            // will make them share the same label and bring trouble in label
            // location calculation.
            let regionGroup = regionsGroupByName.get(regionName);
            let { dataIdx, regionModel } = regionsInfoByName.get(regionName) || {};

            if (!regionGroup) {
                regionGroup = regionsGroupByName.set(regionName, new graphic.Group() as RegionsGroup);
                regionsGroup.add(regionGroup);

                dataIdx = data ? data.indexOfName(regionName) : null;
                regionModel = viewBuildCtx.isGeo
                    ? mapOrGeoModel.getRegionModel(regionName)
                    : (data ? data.getItemModel(dataIdx) as Model<MapDataItemOption> : null);

                regionsInfoByName.set(regionName, { dataIdx, regionModel });
            }

            const polygonSubpaths: graphic.Polygon[] = [];
            const polylineSubpaths: graphic.Polyline[] = [];

            zrUtil.each(region.geometries, function (geometry) {
                // Polygon and MultiPolygon
                if (geometry.type === 'polygon') {
                    let polys = [geometry.exterior].concat(geometry.interiors || []);
                    if (projectionStream) {
                        polys = projectPolys(polys, projectionStream);
                    }
                    zrUtil.each(polys, (poly) => {
                        polygonSubpaths.push(new graphic.Polygon(getPolyShape(poly)));
                    });
                }
                // LineString and MultiLineString
                else {
                    let points = geometry.points;
                    if (projectionStream) {
                        points = projectPolys(points, projectionStream, true);
                    }
                    zrUtil.each(points, points => {
                        polylineSubpaths.push(new graphic.Polyline(getPolyShape(points)));
                    });
                }
            });

            const centerPt = transformPoint(region.getCenter(), projection && projection.project);

            function createCompoundPath(subpaths: graphic.Path[], isLine?: boolean) {
                if (!subpaths.length) {
                    return;
                }
                const compoundPath = new graphic.CompoundPath({
                    culling: true,
                    segmentIgnoreThreshold: 1,
                    shape: {
                        paths: subpaths
                    }
                });
                regionGroup.add(compoundPath);
                applyOptionStyleForRegion(
                    viewBuildCtx, compoundPath, dataIdx, regionModel
                );
                resetLabelForRegion(
                    viewBuildCtx, compoundPath, regionName, regionModel, mapOrGeoModel, dataIdx, centerPt
                );

                if (isLine) {
                    fixLineStyle(compoundPath);
                    zrUtil.each(compoundPath.states, fixLineStyle);
                }
            }

            createCompoundPath(polygonSubpaths);
            createCompoundPath(polylineSubpaths, true);
        });

        // Ensure children have been added to `regionGroup` before calling them.
        regionsGroupByName.each(function (regionGroup, regionName) {
            const { dataIdx, regionModel } = regionsInfoByName.get(regionName);

            resetEventTriggerForRegion(
                viewBuildCtx, regionGroup, regionName, regionModel, mapOrGeoModel, dataIdx
            );
            resetTooltipForRegion(
                viewBuildCtx, regionGroup, regionName, regionModel, mapOrGeoModel
            );
            resetStateTriggerForRegion(
                viewBuildCtx, regionGroup, regionName, regionModel, mapOrGeoModel
            );

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

        const svgDispatcherMap = this._svgDispatcherMap = zrUtil.createHashMap<Element[], RegionName>();

        let focusSelf = false;
        zrUtil.each(this._svgGraphicRecord.named, function (namedItem) {
            // Note that we also allow different elements have the same name.
            // For example, a glyph of a city and the label of the city have
            // the same name and their tooltip info can be defined in a single
            // region option.

            const regionName = namedItem.name;
            const mapOrGeoModel = viewBuildCtx.mapOrGeoModel;
            const data = viewBuildCtx.data;
            const svgNodeTagLower = namedItem.svgNodeTagLower;
            const el = namedItem.el;

            const dataIdx = data ? data.indexOfName(regionName) : null;
            const regionModel = mapOrGeoModel.getRegionModel(regionName);

            if (OPTION_STYLE_ENABLED_TAG_MAP.get(svgNodeTagLower) != null
                && (el instanceof Displayable)
            ) {
                applyOptionStyleForRegion(viewBuildCtx, el, dataIdx, regionModel);
            }

            if (el instanceof Displayable) {
                el.culling = true;
            }

            // We do not know how the SVG like so we'd better not to change z2.
            // Otherwise it might bring some unexpected result. For example,
            // an area hovered that make some inner city can not be clicked.
            (el as ECElement).z2EmphasisLift = 0;

            // If self named:
            if (!namedItem.namedFrom) {
                // label should batter to be displayed based on the center of <g>
                // if it is named rather than displayed on each child.
                if (LABEL_HOST_MAP.get(svgNodeTagLower) != null) {
                    resetLabelForRegion(
                        viewBuildCtx, el, regionName, regionModel, mapOrGeoModel, dataIdx, null
                    );
                }

                resetEventTriggerForRegion(
                    viewBuildCtx, el, regionName, regionModel, mapOrGeoModel, dataIdx
                );

                resetTooltipForRegion(
                    viewBuildCtx, el, regionName, regionModel, mapOrGeoModel
                );

                if (STATE_TRIGGER_TAG_MAP.get(svgNodeTagLower) != null) {
                    const focus = resetStateTriggerForRegion(
                        viewBuildCtx, el, regionName, regionModel, mapOrGeoModel
                    );
                    if (focus === 'self') {
                        focusSelf = true;
                    }
                    const els = svgDispatcherMap.get(regionName) || svgDispatcherMap.set(regionName, []);
                    els.push(el);
                }
            }

        }, this);

        this._enableBlurEntireSVG(focusSelf, viewBuildCtx);
    }

    private _enableBlurEntireSVG(
        focusSelf: boolean,
        viewBuildCtx: ViewBuildContext
    ): void {
        // It's a little complicated to support blurring the entire geoSVG in series-map.
        // So do not support it until some requirements come.
        // At present, in series-map, only regions can be blurred.
        if (focusSelf && viewBuildCtx.isGeo) {
            const blurStyle = (viewBuildCtx.mapOrGeoModel as GeoModel).getModel(['blur', 'itemStyle']).getItemStyle();
            // Only support `opacity` here. Because not sure that other props are suitable for
            // all of the elements generated by SVG (especially for Text/TSpan/Image/... ).
            const opacity = blurStyle.opacity;
            this._svgGraphicRecord.root.traverse(el => {
                if (!el.isGroup) {
                    // PENDING: clear those settings to SVG elements when `_freeSVG`.
                    // (Currently it happen not to be needed.)
                    setDefaultStateProxy(el as Displayable);
                    const style = (el as Displayable).ensureState('blur').style || {};
                    // Do not overwrite the region style that already set from region option.
                    if (style.opacity == null && opacity != null) {
                        style.opacity = opacity;
                    }
                    // If `ensureState('blur').style = {}`, there will be default opacity.

                    // Enable `stateTransition` (animation).
                    (el as Displayable).ensureState('emphasis');
                }
            });
        }
    }

    remove(): void {
        this._regionsGroup.removeAll();
        this._regionsGroupByName = null;
        this._svgGroup.removeAll();
        this._freeSVG();
        this._controller.dispose();
        this._controllerHost = null;
    }

    findHighDownDispatchers(name: string, geoModel: GeoModel): Element[] {
        if (name == null) {
            return [];
        }

        const geo = geoModel.coordinateSystem;

        if (geo.resourceType === 'geoJSON') {
            const regionsGroupByName = this._regionsGroupByName;
            if (regionsGroupByName) {
                const regionGroup = regionsGroupByName.get(name);
                return regionGroup ? [regionGroup] : [];
            }
        }
        else if (geo.resourceType === 'geoSVG') {
            return this._svgDispatcherMap && this._svgDispatcherMap.get(name) || [];
        }
    }

    private _svgResourceChanged(mapName: string): boolean {
        return this._svgMapName !== mapName;
    }

    private _useSVG(mapName: string): void {
        const resource = geoSourceManager.getGeoResource(mapName);
        if (resource && resource.type === 'geoSVG') {
            const svgGraphic = (resource as GeoSVGResource).useGraphic(this.uid);
            this._svgGroup.add(svgGraphic.root);
            this._svgGraphicRecord = svgGraphic;
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
        this._svgGraphicRecord = null;
        this._svgDispatcherMap = null;
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
                dy: e.dy,
                animation: {
                    duration: 0
                }
            }));
        }, this);

        controller.off('zoom').on('zoom', function (e) {
            this._mouseDownFlag = false;

            roamHelper.updateViewOnZoom(controllerHost, e.scale, e.originX, e.originY);

            api.dispatchAction(zrUtil.extend(makeActionBase(), {
                totalZoom: controllerHost.zoom,
                zoom: e.scale,
                originX: e.originX,
                originY: e.originY,
                animation: {
                    duration: 0
                }
            }));

        }, this);

        controller.setPointerChecker(function (e, x, y) {
            return geo.containPoint([x, y])
                && !onIrrelevantElement(e, api, mapOrGeoModel);
        });
    }

    /**
     * FIXME: this is a temporarily workaround.
     * When `geoRoam` the elements need to be reset in `MapView['render']`, because the props like
     * `ignore` might have been modified by `LabelManager`, and `LabelManager#addLabelsOfSeries`
     * will subsequently cache `defaultAttr` like `ignore`. If do not do this reset, the modified
     * props will have no chance to be restored.
     * Note: This reset should be after `clearStates` in `renderSeries` because `useStates` in
     * `renderSeries` will cache the modified `ignore` to `el._normalState`.
     * TODO:
     * Use clone/immutable in `LabelManager`?
     */
    resetForLabelLayout() {
        this.group.traverse(el => {
            const label = el.getTextContent();
            if (label) {
                label.ignore = mapLabelRaw(label).ignore;
            }
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

function applyOptionStyleForRegion(
    viewBuildCtx: ViewBuildContext,
    el: Displayable,
    dataIndex: number,
    regionModel: Model<
        GeoStyleableOption & {
            emphasis?: GeoStyleableOption;
            select?: GeoStyleableOption;
            blur?: GeoStyleableOption;
        }
    >
): void {
    // All of the path are using `itemStyle`, because
    // (1) Some SVG also use fill on polyline (The different between
    // polyline and polygon is "open" or "close" but not fill or not).
    // (2) For the common props like opacity, if some use itemStyle
    // and some use `lineStyle`, it might confuse users.
    // (3) Most SVG use <path>, where can not detect whether to draw a "line"
    // or a filled shape, so use `itemStyle` for <path>.

    const normalStyleModel = regionModel.getModel('itemStyle');
    const emphasisStyleModel = regionModel.getModel(['emphasis', 'itemStyle']);
    const blurStyleModel = regionModel.getModel(['blur', 'itemStyle']);
    const selectStyleModel = regionModel.getModel(['select', 'itemStyle']);

    // NOTE: DON'T use 'style' in visual when drawing map.
    // This component is used for drawing underlying map for both geo component and map series.
    const normalStyle = getFixedItemStyle(normalStyleModel);
    const emphasisStyle = getFixedItemStyle(emphasisStyleModel);
    const selectStyle = getFixedItemStyle(selectStyleModel);
    const blurStyle = getFixedItemStyle(blurStyleModel);

    // Update the itemStyle if has data visual
    const data = viewBuildCtx.data;
    if (data) {
        // Only visual color of each item will be used. It can be encoded by visualMap
        // But visual color of series is used in symbol drawing

        // Visual color for each series is for the symbol draw
        const style = data.getItemVisual(dataIndex, 'style');
        const decal = data.getItemVisual(dataIndex, 'decal');
        if (viewBuildCtx.isVisualEncodedByVisualMap && style.fill) {
            normalStyle.fill = style.fill;
        }
        if (decal) {
            normalStyle.decal = createOrUpdatePatternFromDecal(decal, viewBuildCtx.api);
        }
    }

    // SVG text, tspan and image can be named but not supporeted
    // to be styled by region option yet.
    el.setStyle(normalStyle);
    el.style.strokeNoScale = true;
    el.ensureState('emphasis').style = emphasisStyle;
    el.ensureState('select').style = selectStyle;
    el.ensureState('blur').style = blurStyle;

    // Enable blur
    setDefaultStateProxy(el);
}

function resetLabelForRegion(
    viewBuildCtx: ViewBuildContext,
    el: Element,
    regionName: string,
    regionModel: RegionModel,
    mapOrGeoModel: MapOrGeoModel,
    // Exist only if `viewBuildCtx.data` exists.
    dataIdx: number,
    // If labelXY not provided, use `textConfig.position: 'inside'`
    labelXY: number[]
): void {
    const data = viewBuildCtx.data;
    const isGeo = viewBuildCtx.isGeo;

    const isDataNaN = data && isNaN(data.get(data.mapDimension('value'), dataIdx) as number);
    const itemLayout = data && data.getItemLayout(dataIdx);

    // In the following cases label will be drawn
    // 1. In map series and data value is NaN
    // 2. In geo component
    // 3. Region has no series legendIcon, which will be add a showLabel flag in mapSymbolLayout
    if (
        ((isGeo || isDataNaN))
        || (itemLayout && itemLayout.showLabel)
    ) {

        const query = !isGeo ? dataIdx : regionName;
        let labelFetcher;

        // Consider dataIdx not found.
        if (!data || dataIdx >= 0) {
            labelFetcher = mapOrGeoModel;
        }

        const specifiedTextOpt: Partial<Record<DisplayState, TextStyleProps>> = labelXY ? {
            normal: {
                align: 'center',
                verticalAlign: 'middle'
            }
        } : null;

        // Caveat: must be called after `setDefaultStateProxy(el);` called.
        // because textContent will be assign with `el.stateProxy` inside.
        setLabelStyle<typeof query>(
            el,
            getLabelStatesModels(regionModel),
            {
                labelFetcher,
                labelDataIndex: query,
                defaultText: regionName
            },
            specifiedTextOpt
        );

        const textEl = el.getTextContent();
        if (textEl) {
            mapLabelRaw(textEl).ignore = textEl.ignore;

            if (el.textConfig && labelXY) {
                // Compute a relative offset based on the el bounding rect.
                const rect = el.getBoundingRect().clone();
                // Need to make sure the percent position base on the same rect in normal and
                // emphasis state. Otherwise if using boundingRect of el, but the emphasis state
                // has borderWidth (even 0.5px), the text position will be changed obviously
                // if the position is very big like ['1234%', '1345%'].
                el.textConfig.layoutRect = rect;
                el.textConfig.position = [
                    ((labelXY[0] - rect.x) / rect.width * 100) + '%',
                    ((labelXY[1] - rect.y) / rect.height * 100) + '%'
                ];
            }
        }

        // PENDING:
        // If labelLayout is enabled (test/label-layout.html), el.dataIndex should be specified.
        // But el.dataIndex is also used to determine whether user event should be triggered,
        // where el.seriesIndex or el.dataModel must be specified. At present for a single el
        // there is not case that "only label layout enabled but user event disabled", so here
        // we depends `resetEventTriggerForRegion` to do the job of setting `el.dataIndex`.

        (el as ECElement).disableLabelAnimation = true;
    }
    else {
        el.removeTextContent();
        el.removeTextConfig();
        (el as ECElement).disableLabelAnimation = null;
    }
}

function resetEventTriggerForRegion(
    viewBuildCtx: ViewBuildContext,
    eventTrigger: Element,
    regionName: string,
    regionModel: RegionModel,
    mapOrGeoModel: MapOrGeoModel,
    // Exist only if `viewBuildCtx.data` exists.
    dataIdx: number
): void {
    // setItemGraphicEl, setHoverStyle after all polygons and labels
    // are added to the regionGroup
    if (viewBuildCtx.data) {
        // FIXME: when series-map use a SVG map, and there are duplicated name specified
        // on different SVG elements, after `data.setItemGraphicEl(...)`:
        // (1) all of them will be mounted with `dataIndex`, `seriesIndex`, so that tooltip
        // can be triggered only mouse hover. That's correct.
        // (2) only the last element will be kept in `data`, so that if trigger tooltip
        // by `dispatchAction`, only the last one can be found and triggered. That might be
        // not correct. We will fix it in future if anyone demanding that.
        viewBuildCtx.data.setItemGraphicEl(dataIdx, eventTrigger);
    }
    // series-map will not trigger "geoselectchange" no matter it is
    // based on a declared geo component. Because series-map will
    // trigger "selectchange". If it trigger both the two events,
    // If users call `chart.dispatchAction({type: 'toggleSelect'})`,
    // it not easy to also fire event "geoselectchanged".
    else {
        // Package custom mouse event for geo component
        getECData(eventTrigger).eventData = {
            componentType: 'geo',
            componentIndex: mapOrGeoModel.componentIndex,
            geoIndex: mapOrGeoModel.componentIndex,
            name: regionName,
            region: (regionModel && regionModel.option) || {}
        };
    }
}

function resetTooltipForRegion(
    viewBuildCtx: ViewBuildContext,
    el: Element,
    regionName: string,
    regionModel: RegionModel,
    mapOrGeoModel: MapOrGeoModel
): void {
    if (!viewBuildCtx.data) {
        graphic.setTooltipConfig({
            el: el,
            componentModel: mapOrGeoModel,
            itemName: regionName,
            // @ts-ignore FIXME:TS fix the "compatible with each other"?
            itemTooltipOption: regionModel.get('tooltip')
        });
    }
}

function resetStateTriggerForRegion(
    viewBuildCtx: ViewBuildContext,
    el: Element,
    regionName: string,
    regionModel: RegionModel,
    mapOrGeoModel: MapOrGeoModel
): InnerFocus {
    // @ts-ignore FIXME:TS fix the "compatible with each other"?
    el.highDownSilentOnTouch = !!mapOrGeoModel.get('selectedMode');
    // @ts-ignore FIXME:TS fix the "compatible with each other"?
    const emphasisModel = regionModel.getModel('emphasis');
    const focus = emphasisModel.get('focus');
    toggleHoverEmphasis(el, focus, emphasisModel.get('blurScope'), emphasisModel.get('disabled'));
    if (viewBuildCtx.isGeo) {
        enableComponentHighDownFeatures(el, mapOrGeoModel as GeoModel, regionName);
    }

    return focus;
}

function projectPolys(
    rings: number[][][], // Polygons include exterior and interiors. Or polylines.
    createStream: (outStream: ProjectionStream) => ProjectionStream,
    isLine?: boolean
) {
    const polygons: number[][][] = [];
    let curPoly: number[][];

    function startPolygon() {
        curPoly = [];
    }
    function endPolygon() {
        if (curPoly.length) {
            polygons.push(curPoly);
            curPoly = [];
        }
    }
    const stream = createStream({
        polygonStart: startPolygon,
        polygonEnd: endPolygon,
        lineStart: startPolygon,
        lineEnd: endPolygon,
        point(x, y) {
            // May have NaN values from stream.
            if (isFinite(x) && isFinite(y)) {
                curPoly.push([x, y]);
            }
        },
        sphere() {}
    });
    !isLine && stream.polygonStart();
    zrUtil.each(rings, ring => {
        stream.lineStart();
        for (let i = 0; i < ring.length; i++) {
            stream.point(ring[i][0], ring[i][1]);
        }
        stream.lineEnd();
    });
    !isLine && stream.polygonEnd();
    return polygons;
}

export default MapDraw;


// @ts-ignore FIXME:TS fix the "compatible with each other"?
