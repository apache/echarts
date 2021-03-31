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
    // <text> <tspan> are also enabled becuase some SVG might paint text itself,
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
            firstGraphic = this._firstGraphic = buildGraphic(this._parsedXML);

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

    const named = [] as GeoSVGGraphicRecord['named'];

    each(result.named, namedItem => {
        if (REGION_AVAILABLE_SVG_TAG_MAP.get(namedItem.svgNodeTagLower) != null) {
            named.push(namedItem);
            setSilent(namedItem.el);
        }
    });

    return { root, boundingRect, named };
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
