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

import { parseSVG, makeViewBoxTransform, SVGNodeTagLower, SVGParserResultNamedItem } from 'zrender/src/tool/parseSVG';
import Group from 'zrender/src/graphic/Group';
import Rect from 'zrender/src/graphic/shape/Rect';
import {assert, createHashMap, each, HashMap} from 'zrender/src/core/util';
import BoundingRect from 'zrender/src/core/BoundingRect';
import { GeoResource, GeoSVGGraphicRoot, GeoSVGSourceInput } from './geoTypes';
import { parseXML } from 'zrender/src/tool/parseXML';
import { GeoSVGRegion } from './Region';
import Element from 'zrender/src/Element';

export interface GeoSVGGraphicRecord {
    root: Group;
    boundingRect: BoundingRect;
    named: SVGParserResultNamedItem[];
}

/**
 * "region available" means that: enable users to set attribute `name="xxx"` on those tags
 * to make it be a region.
 * 1. region styles and its label styles can be defined in echarts opton:
 * ```js
 * geo: {
 *     regions: [{
 *         name: 'xxx',
 *         itemStyle: { ... },
 *         label: { ... }
 *     }, {
 *         ...
 *     },
 *     ...]
 * };
 * ```
 * 2. name can be duplicated in different SVG tag. All of the tags with the same name share
 * a region option. For exampel if there are two <path> representing two lung lobes. They have
 * no common parents but both of them need to display label "lung" inside.
 */
const REGION_AVAILABLE_SVG_TAG_MAP = createHashMap<number, SVGNodeTagLower>([
    'rect', 'circle', 'line', 'ellipse', 'polygon', 'polyline', 'path',
    // <text> <tspan> are also enabled because some SVG might paint text itself,
    // but still need to trigger events or tooltip.
    'text', 'tspan',
    // <g> is also enabled because this case: if multiple tags share one name
    // and need label displayed, every tags will display the name, which is not
    // expected. So we can put them into a <g name="xxx">. Thereby only one label
    // displayed and located based on the bounding rect of the <g>.
    'g'
]);

export class GeoSVGResource implements GeoResource {

    readonly type = 'geoSVG';
    private _mapName: string;
    private _parsedXML: SVGElement;

    private _firstGraphic: GeoSVGGraphicRecord;
    private _boundingRect: BoundingRect;
    private _regions: GeoSVGRegion[];
    // Key: region.name
    private _regionsMap: HashMap<GeoSVGRegion>;

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
            firstGraphic = this._firstGraphic = this._buildGraphic(this._parsedXML);

            this._freedGraphics.push(firstGraphic);

            this._boundingRect = this._firstGraphic.boundingRect.clone();

            // PENDING: `nameMap` will not be supported until some real requirement come.
            // if (nameMap) {
            //     named = applyNameMap(named, nameMap);
            // }

            const { regions, regionsMap } = createRegions(firstGraphic.named);
            this._regions = regions;
            this._regionsMap = regionsMap;
        }

        return {
            boundingRect: this._boundingRect,
            regions: this._regions,
            regionsMap: this._regionsMap
        };
    }

    private _buildGraphic(
        svgXML: SVGElement
    ): GeoSVGGraphicRecord {
        let result;
        let rootFromParse;

        try {
            result = svgXML && parseSVG(svgXML, {
                ignoreViewBox: true,
                ignoreRootClip: true
            }) || {};
            rootFromParse = result.root;
            assert(rootFromParse != null);
        }
        catch (e) {
            throw new Error('Invalid svg format\n' + e.message);
        }

        // Note: we keep the covenant that the root has no transform. So always add an extra root.
        const root = new Group();
        root.add(rootFromParse);
        (root as GeoSVGGraphicRoot).isGeoSVGGraphicRoot = true;

        // [THE_RULE_OF_VIEWPORT_AND_VIEWBOX]
        //
        // Consider: `<svg width="..." height="..." viewBox="...">`
        // - the `width/height` we call it `svgWidth/svgHeight` for short.
        // - `(0, 0, svgWidth, svgHeight)` defines the viewport of the SVG, or say,
        //   "viewport boundingRect", or `boundingRect` for short.
        // - `viewBox` defines the transform from the real content ot the viewport.
        //   `viewBox` has the same unit as the content of SVG.
        //   If `viewBox` exists, a transform is defined, so the unit of `svgWidth/svgHeight` become
        //   different from the content of SVG. Otherwise, they are the same.
        //
        // If both `svgWidth/svgHeight/viewBox` are specified in a SVG file, the transform rule will be:
        // 0. `boundingRect` is `(0, 0, svgWidth, svgHeight)`. Set it to Geo['_rect'] (View['_rect']).
        // 1. Make a transform from `viewBox` to `boundingRect`.
        //    Note: only support `preserveAspectRatio 'xMidYMid'` here. That is, this transform will preserve
        //    the aspect ratio.
        // 2. Make a transform from boundingRect to Geo['_viewRect'] (View['_viewRect'])
        //    (`Geo`/`View` will do this job).
        //    Note: this transform might not preserve aspect radio, which depending on how users specify
        //    viewRect in echarts option (e.g., `geo.left/top/width/height` will not preserve aspect ratio,
        //    but `geo.layoutCenter/layoutSize` will preserve aspect ratio).
        //
        // If `svgWidth/svgHeight` not specified, we use `viewBox` as the `boundingRect` to make the SVG
        // layout look good.
        //
        // If neither `svgWidth/svgHeight` nor `viewBox` are not specified, we calculate the boundingRect
        // of the SVG content and use them to make SVG layout look good.

        const svgWidth = result.width;
        const svgHeight = result.height;
        const viewBoxRect = result.viewBoxRect;

        let boundingRect = this._boundingRect;
        if (!boundingRect) {
            let bRectX;
            let bRectY;
            let bRectWidth;
            let bRectHeight;

            if (svgWidth != null) {
                bRectX = 0;
                bRectWidth = svgWidth;
            }
            else if (viewBoxRect) {
                bRectX = viewBoxRect.x;
                bRectWidth = viewBoxRect.width;
            }

            if (svgHeight != null) {
                bRectY = 0;
                bRectHeight = svgHeight;
            }
            else if (viewBoxRect) {
                bRectY = viewBoxRect.y;
                bRectHeight = viewBoxRect.height;
            }

            // If both viewBox and svgWidth/svgHeight not specified,
            // we have to determine how to layout those element to make them look good.
            if (bRectX == null || bRectY == null) {
                const calculatedBoundingRect = rootFromParse.getBoundingRect();
                if (bRectX == null) {
                    bRectX = calculatedBoundingRect.x;
                    bRectWidth = calculatedBoundingRect.width;
                }
                if (bRectY == null) {
                    bRectY = calculatedBoundingRect.y;
                    bRectHeight = calculatedBoundingRect.height;
                }
            }

            boundingRect = this._boundingRect = new BoundingRect(bRectX, bRectY, bRectWidth, bRectHeight);
        }

        if (viewBoxRect) {
            const viewBoxTransform = makeViewBoxTransform(viewBoxRect, boundingRect);
            // Only support `preserveAspectRatio 'xMidYMid'`
            rootFromParse.scaleX = rootFromParse.scaleY = viewBoxTransform.scale;
            rootFromParse.x = viewBoxTransform.x;
            rootFromParse.y = viewBoxTransform.y;
        }

        // SVG needs to clip based on `viewBox`. And some SVG files really rely on this feature.
        // They do not strictly confine all of the content inside a display rect, but deliberately
        // use a `viewBox` to define a displayable rect.
        // PENDING:
        // The drawback of the `setClipPath` here is: the region label (genereted by echarts) near the
        // edge might also be clipped, because region labels are put as `textContent` of the SVG path.
        root.setClipPath(new Rect({
            shape: boundingRect.plain()
        }));

        const named = [] as GeoSVGGraphicRecord['named'];
        each(result.named, namedItem => {
            if (REGION_AVAILABLE_SVG_TAG_MAP.get(namedItem.svgNodeTagLower) != null) {
                named.push(namedItem);
                setSilent(namedItem.el);
            }
        });

        return { root, boundingRect, named };
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
    useGraphic(hostKey: string /* , nameMap: NameMap */): GeoSVGGraphicRecord {
        const usedRootMap = this._usedGraphicMap;

        let svgGraphic = usedRootMap.get(hostKey);
        if (svgGraphic) {
            return svgGraphic;
        }

        svgGraphic = this._freedGraphics.pop()
            // use the first boundingRect to avoid duplicated boundingRect calculation.
            || this._buildGraphic(this._parsedXML);

        usedRootMap.set(hostKey, svgGraphic);

        // PENDING: `nameMap` will not be supported until some real requirement come.
        // `nameMap` can only be obtained from echarts option.
        // The original `named` must not be modified.
        // if (nameMap) {
        //     svgGraphic = extend({}, svgGraphic);
        //     svgGraphic.named = applyNameMap(svgGraphic.named, nameMap);
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


function setSilent(el: Element): void {
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

function createRegions(
    named: SVGParserResultNamedItem[]
): {
    regions: GeoSVGRegion[];
    regionsMap: HashMap<GeoSVGRegion>;
} {

    const regions: GeoSVGRegion[] = [];
    const regionsMap = createHashMap<GeoSVGRegion>();

    // Create resions only for the first graphic.
    each(named, namedItem => {
        // Region has feature to calculate center for tooltip or other features.
        // If there is a <g name="xxx">, the center should be the center of the
        // bounding rect of the g.
        if (namedItem.namedFrom != null) {
            return;
        }

        const region = new GeoSVGRegion(namedItem.name, namedItem.el);
        // PENDING: if `nameMap` supported, this region can not be mounted on
        // `this`, but can only be created each time `load()` called.
        regions.push(region);
        // PENDING: if multiple tag named with the same name, only one will be
        // found by `_regionsMap`. `_regionsMap` is used to find a coordinate
        // by name. We use `region.getCenter()` as the coordinate.
        regionsMap.set(namedItem.name, region);
    });

    return { regions, regionsMap };
}


// PENDING: `nameMap` will not be supported until some real requirement come.
// /**
//  * Use the alias in geoNameMap.
//  * The input `named` must not be modified.
//  */
// function applyNameMap(
//     named: GeoSVGGraphicRecord['named'],
//     nameMap: NameMap
// ): GeoSVGGraphicRecord['named'] {
//     const result = [] as GeoSVGGraphicRecord['named'];
//     for (let i = 0; i < named.length; i++) {
//         let regionGraphic = named[i];
//         const name = regionGraphic.name;
//         if (nameMap && nameMap.hasOwnProperty(name)) {
//             regionGraphic = extend({}, regionGraphic);
//             regionGraphic.name = name;
//         }
//         result.push(regionGraphic);
//     }
//     return result;
// }
