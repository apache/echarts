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

import {parseSVG, makeViewBoxTransform} from 'zrender/src/tool/parseSVG';
import Group from 'zrender/src/graphic/Group';
import Rect from 'zrender/src/graphic/shape/Rect';
import {assert, createHashMap, HashMap} from 'zrender/src/core/util';
import BoundingRect from 'zrender/src/core/BoundingRect';
import { GeoResource, GeoSVGSourceInput } from './geoTypes';
import { parseXML } from 'zrender/src/tool/parseXML';
import Element from 'zrender/src/Element';

export interface GeoSVGGraphic {
    root: Group;
    namedElements: Element[];
}

export class GeoSVGResource implements GeoResource {

    readonly type = 'svg';
    private _mapName: string;
    private _parsedXML: SVGElement;
    private _rootForRect: GeoSVGGraphic;
    private _boundingRect: BoundingRect;
    // key: hostKey, value: root
    private _usedRootMap: HashMap<GeoSVGGraphic> = createHashMap();
    private _freedRoots: GeoSVGGraphic[] = [];

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

    load(): { boundingRect: BoundingRect } {
        // In the "load" stage, graphic need to be built to
        // get boundingRect for geo coordinate system.
        const rootForRect = this._rootForRect;
        if (rootForRect) {
            return { boundingRect: this._boundingRect };
        }

        const graphic = buildGraphic(this._parsedXML);

        this._rootForRect = graphic;
        this._boundingRect = graphic.boundingRect;

        this._freedRoots.push(graphic);

        return { boundingRect: graphic.boundingRect };
    }

    // Consider:
    // (1) One graphic element can not be shared by different `geoView` running simultaneously.
    //     Notice, also need to consider multiple echarts instances share a `mapRecord`.
    // (2) Converting SVG to graphic elements is time consuming.
    // (3) In the current architecture, `load` should be called frequently to get boundingRect,
    //     and it is called without view info.
    // So we maintain graphic elements in this module, and enables `view` to use/return these
    // graphics from/to the pool with it's uid.
    useGraphic(hostKey: string): GeoSVGGraphic {
        const usedRootMap = this._usedRootMap;

        let svgGraphic = usedRootMap.get(hostKey);
        if (svgGraphic) {
            return svgGraphic;
        }

        svgGraphic = this._freedRoots.pop() || buildGraphic(this._parsedXML, this._boundingRect);

        return usedRootMap.set(hostKey, svgGraphic);
    }

    freeGraphic(hostKey: string): void {
        const usedRootMap = this._usedRootMap;

        const svgGraphic = usedRootMap.get(hostKey);
        if (svgGraphic) {
            usedRootMap.removeKey(hostKey);
            this._freedRoots.push(svgGraphic);
        }
    }

}


function buildGraphic(
    svgXML: SVGElement,
    boundingRect?: BoundingRect
): {
    root: Group;
    boundingRect: BoundingRect;
    namedElements: Element[]
} {
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

    return {
        root: root,
        boundingRect: boundingRect,
        namedElements: result.namedElements
    };
}
