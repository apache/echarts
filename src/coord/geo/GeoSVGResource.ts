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

import { parseSVG, makeViewBoxTransform, SVGNodeTagLower } from 'zrender/src/tool/parseSVG';
import Group from 'zrender/src/graphic/Group';
import Rect from 'zrender/src/graphic/shape/Rect';
import {assert, createHashMap, HashMap, hasOwn} from 'zrender/src/core/util';
import BoundingRect from 'zrender/src/core/BoundingRect';
import { GeoResource, GeoSVGGraphicRoot, GeoSVGSourceInput, RegionGraphic } from './geoTypes';
import { parseXML } from 'zrender/src/tool/parseXML';
import { GeoSVGRegion } from './Region';

export interface GeoSVGGraphicRecord {
    root: Group;
    boundingRect: BoundingRect;
    regionGraphics: RegionGraphic[];
}

const REGION_AVAILABLE_SVG_TAG_MAP = createHashMap<number, SVGNodeTagLower>([
    'rect', 'circle', 'line', 'ellipse', 'polygon', 'polyline', 'text', 'tspan', 'path'
]);
const STYLE_OPTION_KEY = createHashMap<'itemStyle' | 'lineStyle', SVGNodeTagLower>({
    'rect': 'itemStyle',
    'circle': 'itemStyle',
    'line': 'lineStyle',
    'ellipse': 'itemStyle',
    'polygon': 'itemStyle',
    'polyline': 'lineStyle',
    // 'image': '?', // TODO
    // 'text': '?', // TODO
    // 'tspan': '?', // TODO
    'path': 'itemStyle'
});
const LABEL_HOST_MAP = createHashMap<number, SVGNodeTagLower>([
    'rect', 'circle', 'line', 'ellipse', 'polygon', 'polyline', 'path'
]);


export class GeoSVGResource implements GeoResource {

    readonly type = 'geoSVG';
    private _mapName: string;
    private _parsedXML: SVGElement;

    private _firstGraphic: GeoSVGGraphicRecord;
    private _boundingRect: BoundingRect;
    private _regions: GeoSVGRegion[] = [];
    // Key: region.name
    private _regionsMap: HashMap<GeoSVGRegion> = createHashMap<GeoSVGRegion>();

    // All used graphics. key: hostKey, value: root
    private _usedGraphicMap: HashMap<GeoSVGGraphicRecord> = createHashMap();
    // All unused graphics.
    private _freedGraphics: GeoSVGGraphicRecord[] = [];

    constructor(
        mapName: string,
        svg: GeoSVGSourceInput
    ) {
        this._mapName = mapName;

        // Only perform parse to XML object here, which might be time
        // consiming for large SVG.
        // Although convert XML to zrender element is also time consiming,
        // if we do it here, the clone of zrender elements has to be
        // required. So we do it once for each geo instance, util real
        // performance issues call for optimizing it.
        this._parsedXML = parseXML(svg);
    }

    load(/* nameMap: NameMap */) {
        // In the "load" stage, graphic need to be built to
        // get boundingRect for geo coordinate system.
        let firstGraphic = this._firstGraphic;

        // Create the return data structure only when first graphic created.
        // Because they will be used in geo coordinate system update stage,
        // and `regions` will be mounted at `geo` coordinate system,
        // in which there is no "view" info, so that it should better not to
        // make references to graphic elements.
        if (!firstGraphic) {
            firstGraphic = this._firstGraphic = buildGraphic(this._parsedXML);

            this._freedGraphics.push(firstGraphic);

            this._boundingRect = this._firstGraphic.boundingRect.clone();

            const regionGraphics = firstGraphic.regionGraphics;
            // PENDING: `nameMap` will not be supported until some real requirement come.
            // if (nameMap) {
            //     regionGraphics = applyNameMap(regionGraphics, nameMap);
            // }

            // Create resions only for the first graphic.
            for (let i = 0; i < regionGraphics.length; i++) {
                const regionGraphic = regionGraphics[i];
                const region = new GeoSVGRegion(regionGraphic.name, regionGraphic.el);
                // PENDING: if `nameMap` supported, this region can not be mounted on
                // `this`, but can only be created each time `load()` called.
                this._regions.push(region);
                this._regionsMap.set(regionGraphic.name, region);
            }
        }

        return {
            boundingRect: this._boundingRect,
            regions: this._regions,
            regionsMap: this._regionsMap
        };
    }

    /**
     * Consider:
     * (1) One graphic element can not be shared by different `geoView` running simultaneously.
     *     Notice, also need to consider multiple echarts instances share a `mapRecord`.
     * (2) Converting SVG to graphic elements is time consuming.
     * (3) In the current architecture, `load` should be called frequently to get boundingRect,
     *     and it is called without view info.
     * So we maintain graphic elements in this module, and enables `view` to use/return these
     * graphics from/to the pool with it's uid.
     */
    useGraphic(hostKey: string /*, nameMap: NameMap */): GeoSVGGraphicRecord {
        const usedRootMap = this._usedGraphicMap;

        let svgGraphic = usedRootMap.get(hostKey);
        if (svgGraphic) {
            return svgGraphic;
        }

        svgGraphic = this._freedGraphics.pop()
            // use the first boundingRect to avoid duplicated boundingRect calculation.
            || buildGraphic(this._parsedXML, this._boundingRect);

        usedRootMap.set(hostKey, svgGraphic);

        // PENDING: `nameMap` will not be supported until some real requirement come.
        // `nameMap` can only be obtained from echarts option.
        // The original `regionGraphics` must not be modified.
        // if (nameMap) {
        //     svgGraphic = extend({}, svgGraphic);
        //     svgGraphic.regionGraphics = applyNameMap(svgGraphic.regionGraphics, nameMap);
        // }

        return svgGraphic;
    }

    freeGraphic(hostKey: string): void {
        const usedRootMap = this._usedGraphicMap;

        const svgGraphic = usedRootMap.get(hostKey);
        if (svgGraphic) {
            usedRootMap.removeKey(hostKey);
            this._freedGraphics.push(svgGraphic);
        }
    }

}


function buildGraphic(
    svgXML: SVGElement,
    // If input boundingRect, avoid boundingRect calculation,
    // which might be time-consuming.
    boundingRect?: BoundingRect
): GeoSVGGraphicRecord {
    let result;
    let root;

    try {
        result = svgXML && parseSVG(svgXML, {
            ignoreViewBox: true,
            ignoreRootClip: true
        }) || {};
        root = result.root;
        assert(root != null);
    }
    catch (e) {
        throw new Error('Invalid svg format\n' + e.message);
    }

    const svgWidth = result.width;
    const svgHeight = result.height;
    const viewBoxRect = result.viewBoxRect;

    if (!boundingRect) {
        boundingRect = (svgWidth == null || svgHeight == null)
            // If svg width / height not specified, calculate
            // bounding rect as the width / height
            ? root.getBoundingRect()
            : new BoundingRect(0, 0, 0, 0);

        if (svgWidth != null) {
            boundingRect.width = svgWidth;
        }
        if (svgHeight != null) {
            boundingRect.height = svgHeight;
        }
    }

    // Note: we keep the covenant that the root has no transform.
    if (viewBoxRect) {
        const viewBoxTransform = makeViewBoxTransform(viewBoxRect, boundingRect.width, boundingRect.height);
        const elRoot = root;
        root = new Group();
        root.add(elRoot);
        elRoot.scaleX = elRoot.scaleY = viewBoxTransform.scale;
        elRoot.x = viewBoxTransform.x;
        elRoot.y = viewBoxTransform.y;
    }

    root.setClipPath(new Rect({
        shape: boundingRect.plain()
    }));

    (root as GeoSVGGraphicRoot).isGeoSVGGraphicRoot = true;

    const regionGraphics = [] as GeoSVGGraphicRecord['regionGraphics'];
    const named = result.named;
    for (let i = 0; i < named.length; i++) {
        const namedItem = named[i];
        const svgNodeTagLower = namedItem.svgNodeTagLower;

        if (REGION_AVAILABLE_SVG_TAG_MAP.get(svgNodeTagLower) != null) {
            const styleOptionKey = STYLE_OPTION_KEY.get(svgNodeTagLower);
            const el = namedItem.el;

            regionGraphics.push({
                name: namedItem.name,
                el: el,
                styleOptionKey: styleOptionKey,
                stateTrigger: styleOptionKey != null ? el : null,
                // text/tspan/image do not suport style but support event.
                eventTrigger: el,
                useLabel: LABEL_HOST_MAP.get(svgNodeTagLower) != null
            });

            // Only named element has silent: false, other elements should
            // act as background and has no user interaction.
            el.silent = false;
            // text|tspan will be converted to group.
            if (el.isGroup) {
                el.traverse(child => {
                    child.silent = false;
                });
            }
        }
    }

    return { root, boundingRect, regionGraphics };
}


// PENDING: `nameMap` will not be supported until some real requirement come.
// /**
//  * Use the alias in geoNameMap.
//  * The input `regionGraphics` must not be modified.
//  */
// function applyNameMap(
//     regionGraphics: GeoSVGGraphicRecord['regionGraphics'],
//     nameMap: NameMap
// ): GeoSVGGraphicRecord['regionGraphics'] {
//     const result = [] as GeoSVGGraphicRecord['regionGraphics'];
//     for (let i = 0; i < regionGraphics.length; i++) {
//         let regionGraphic = regionGraphics[i];
//         const name = regionGraphic.name;
//         if (nameMap && nameMap.hasOwnProperty(name)) {
//             regionGraphic = extend({}, regionGraphic);
//             regionGraphic.name = name;
//         }
//         result.push(regionGraphic);
//     }
//     return result;
// }
