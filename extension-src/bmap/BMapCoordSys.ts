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

// @ts-nocheck
/* global BMap */
/* global BMapGL */

import {
    util as zrUtil,
    graphic,
    matrix
} from 'echarts';

let BMAP_NS;

function BMapCoordSys(bmap, api) {
    this._bmap = bmap;
    this.dimensions = ['lng', 'lat'];
    this._mapOffset = [0, 0];
    this._api = api;
}

BMapCoordSys.prototype.dimensions = ['lng', 'lat'];

BMapCoordSys.prototype.setZoom = function (zoom) {
    this._zoom = zoom;
};

BMapCoordSys.prototype.setCenter = function (center) {
    this._center = this._bmap.pointToOverlayPixel(new BMAP_NS.Point(center[0], center[1]));
};

BMapCoordSys.prototype.setMapOffset = function (mapOffset) {
    this._mapOffset = mapOffset;
};

BMapCoordSys.prototype.getBMap = function () {
    return this._bmap;
};

BMapCoordSys.prototype.dataToPoint = function (data) {
    const point = new BMAP_NS.Point(data[0], data[1]);
    const px = this._bmap.pointToOverlayPixel(point);
    const mapOffset = this._mapOffset;
    return [px.x - mapOffset[0], px.y - mapOffset[1]];
};

BMapCoordSys.prototype.pointToData = function (pt) {
    const mapOffset = this._mapOffset;
    pt = this._bmap.overlayPixelToPoint({
        x: pt[0] + mapOffset[0],
        y: pt[1] + mapOffset[1]
    });
    return [pt.lng, pt.lat];
};

BMapCoordSys.prototype.getViewRect = function () {
    const api = this._api;
    return new graphic.BoundingRect(0, 0, api.getWidth(), api.getHeight());
};

BMapCoordSys.prototype.getRoamTransform = function () {
    return matrix.create();
};

BMapCoordSys.prototype.prepareCustoms = function () {
    const rect = this.getViewRect();
    return {
        coordSys: {
            // The name exposed to user is always 'cartesian2d' but not 'grid'.
            type: 'bmap',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        },
        api: {
            coord: zrUtil.bind(this.dataToPoint, this),
            size: zrUtil.bind(dataToCoordSize, this)
        }
    };
};

function dataToCoordSize(dataSize, dataItem) {
    dataItem = dataItem || [0, 0];
    return zrUtil.map([0, 1], function (dimIdx) {
        const val = dataItem[dimIdx];
        const halfSize = dataSize[dimIdx] / 2;
        const p1 = [];
        const p2 = [];
        p1[dimIdx] = val - halfSize;
        p2[dimIdx] = val + halfSize;
        p1[1 - dimIdx] = p2[1 - dimIdx] = dataItem[1 - dimIdx];
        return Math.abs(this.dataToPoint(p1)[dimIdx] - this.dataToPoint(p2)[dimIdx]);
    }, this);
}

let Overlay;

// For deciding which dimensions to use when creating list data
BMapCoordSys.dimensions = BMapCoordSys.prototype.dimensions;

function createOverlayCtor() {
    function Overlay(root) {
        this._root = root;
    }

    Overlay.prototype = new BMAP_NS.Overlay();

    Overlay.prototype.initialize = function (map) {
        map.getPanes().labelPane.appendChild(this._root);
        return this._root;
    };

    Overlay.prototype.draw = function () {};

    return Overlay;
}

BMapCoordSys.create = function (ecModel, api) {
    let bmapCoordSys;
    const root = api.getDom();

    // TODO Dispose
    ecModel.eachComponent('bmap', function (bmapModel) {
        const painter = api.getZr().painter;
        const viewportRoot = painter.getViewportRoot();
        const isGL = bmapModel.get('isGL');
        BMAP_NS = isGL ? BMapGL : BMap;

        if (typeof BMAP_NS === 'undefined') {
            throw new Error('BMap' + (isGL ? 'GL' : '') + ' api is not loaded');
        }
        Overlay = Overlay || createOverlayCtor();
        if (bmapCoordSys) {
            throw new Error('Only one bmap component can exist');
        }
        let bmap;
        if (!bmapModel.__bmap) {
            // Not support IE8
            let bmapRoot = root.querySelector('.ec-extension-bmap');
            if (bmapRoot) {
                // Reset viewport left and top, which will be changed
                // in moving handler in BMapView
                viewportRoot.style.left = '0px';
                viewportRoot.style.top = '0px';
                root.removeChild(bmapRoot);
            }
            bmapRoot = document.createElement('div');
            bmapRoot.className = 'ec-extension-bmap';
            // fix #13424
            bmapRoot.style.cssText = 'position:absolute;width:100%;height:100%';
            root.appendChild(bmapRoot);

            // initializes bmap
            let mapOptions = bmapModel.get('mapOptions');
            if (mapOptions) {
                mapOptions = zrUtil.clone(mapOptions);
                // Not support `mapType`, use `bmap.setMapType(MapType)` instead.
                delete mapOptions.mapType;
            }

            bmap = bmapModel.__bmap = new BMAP_NS.Map(bmapRoot, mapOptions);

            const overlay = new Overlay(viewportRoot);
            bmap.addOverlay(overlay);

            // Override
            painter.getViewportRootOffset = function () {
                return {offsetLeft: 0, offsetTop: 0};
            };
        }
        bmap = bmapModel.__bmap;

        // Set bmap options
        // centerAndZoom before layout and render
        const center = bmapModel.get('center');
        const zoom = bmapModel.get('zoom');
        if (center && zoom) {
            const bmapCenter = bmap.getCenter();
            const bmapZoom = bmap.getZoom();
            const centerOrZoomChanged = bmapModel.centerOrZoomChanged([bmapCenter.lng, bmapCenter.lat], bmapZoom);
            if (centerOrZoomChanged) {
                const pt = new BMAP_NS.Point(center[0], center[1]);
                bmap.centerAndZoom(pt, zoom);
            }
        }

        bmapCoordSys = new BMapCoordSys(bmap, api);
        bmapCoordSys.setMapOffset(bmapModel.__mapOffset || [0, 0]);
        bmapCoordSys.setZoom(zoom);
        bmapCoordSys.setCenter(center);

        bmapModel.coordinateSystem = bmapCoordSys;
    });

    ecModel.eachSeries(function (seriesModel) {
        if (seriesModel.get('coordinateSystem') === 'bmap') {
            seriesModel.coordinateSystem = bmapCoordSys;
        }
    });
};

export default BMapCoordSys;
