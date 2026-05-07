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

/* global document */

import {
    util as zrUtil,
    graphic,
    matrix,
    registerCoordinateSystem,
} from 'echarts';
import {
    COMPONENT_MAIN_TYPE_BMAP,
    BMapModel,
} from './BMapModel';


// ------ START: Mock of bmap lib types ------
export declare namespace bmapLib {
    interface Map { // This is `BMap.Map`
        pointToOverlayPixel(point: Point): Pixel;
        overlayPixelToPoint(px: Pixel): Point;
        getPanes(): MapPanes;
        getCenter(): Point;
        getZoom(): number;
        addOverlay(overlay: Overlay): void;
        centerAndZoom(pt: Point, zoom: number): void;
        addEventListener(event: string, handler: Callback): void;
        removeEventListener(event: string, handler: Callback): void;
        enableDragging(): void;
        disableDragging(): void;
        enableScrollWheelZoom(): void;
        disableScrollWheelZoom(): void;
        enableDoubleClickZoom(): void;
        disableDoubleClickZoom(): void;
        enablePinchToZoom(): void;
        disablePinchToZoom(): void;
        setMapStyle(mapStyle: MapStyle): void;
        setMapStyleV2(mapStyle: MapStyleV2): void;
    }
    interface MercatorProjection {
        lngLatToPoint(point: Point): number[];
    }
    interface Point {lng: number; lat: number;}
    interface Pixel {x: number; y: number;}
    interface Overlay {
        initialize(map: Map): HTMLElement;
        draw(): void;
    }
    interface MapPanes {
        labelPane: HTMLElement;
    }
    type MapOptions = {
        mainType: unknown;
    } & {
        [key in string]: unknown
    };
    type MapStyle = object;
    type MapStyleV2 = object;
    type Callback = (...args: any[]) => void;
}
declare const BMap: {
    MercatorProjection: new () => bmapLib.MercatorProjection;
    Point: new (x: number, y: number) => bmapLib.Point;
    Overlay: new () => bmapLib.Overlay;
    Map: new (root: HTMLElement, mapOptions: bmapLib.MapOptions) => bmapLib.Map;
};
// ------ END: Mock of BMap types ------


interface BMapECExtendedOverlay extends bmapLib.Overlay {
    _root: HTMLElement;
}
interface BMapECExtendedOverlayCtor {
    (root: HTMLElement): BMapECExtendedOverlay;
    new (root: HTMLElement): BMapECExtendedOverlay;
}

type ECCoordinateSystemCreator = Parameters<typeof registerCoordinateSystem>[1];
type ECCoordinateSystemMaster = ReturnType<ECCoordinateSystemCreator['create']>[number];
export type ECExtensionAPI = Parameters<ECCoordinateSystemCreator['create']>[1];
export type ECGlobalModel = Parameters<ECCoordinateSystemCreator['create']>[0];


const COORD_SYS_BMAP = COMPONENT_MAIN_TYPE_BMAP;
function makeDimensions(): ['lng', 'lat'] {
    return ['lng', 'lat'];
}

export class BMapCoordSys implements ECCoordinateSystemMaster {

    dimensions: ['lng', 'lat'] = makeDimensions();
    // For deciding which dimensions to use when creating list data
    static dimensions: ['lng', 'lat'] = makeDimensions();

    type = COORD_SYS_BMAP;

    private _bmap: bmapLib.Map;
    private _mapOffset: number[] = [0, 0];
    private _api: ECExtensionAPI;
    private _projection: bmapLib.MercatorProjection = new BMap.MercatorProjection();
    private _zoom: number;
    private _center: number[];

    constructor(bmap: bmapLib.Map, api: ECExtensionAPI) {
        this._bmap = bmap;
        this._api = api;
    }

    setZoom(zoom: number): void {
        this._zoom = zoom;
    }

    setCenter(center: number[]): void {
        this._center = this._projection.lngLatToPoint(new BMap.Point(center[0], center[1]));
    }

    setMapOffset(mapOffset: number[]): void {
        this._mapOffset = mapOffset;
    }

    getBMap(): bmapLib.Map {
        return this._bmap;
    }

    dataToPoint(data: number[]): number[] {
        const point = new BMap.Point(data[0], data[1]);
        // TODO mercator projection is toooooooo slow
        // let mercatorPoint = this._projection.lngLatToPoint(point);

        // let width = this._api.getZr().getWidth();
        // let height = this._api.getZr().getHeight();
        // let divider = Math.pow(2, 18 - 10);
        // return [
        //     Math.round((mercatorPoint.x - this._center.x) / divider + width / 2),
        //     Math.round((this._center.y - mercatorPoint.y) / divider + height / 2)
        // ];
        const px = this._bmap.pointToOverlayPixel(point);
        const mapOffset = this._mapOffset;
        return [px.x - mapOffset[0], px.y - mapOffset[1]];
    }

    pointToData(point: number[]): number[] {
        const mapOffset = this._mapOffset;
        const pt = this._bmap.overlayPixelToPoint({
            x: point[0] + mapOffset[0],
            y: point[1] + mapOffset[1]
        });
        return [pt.lng, pt.lat];
    }

    containPoint(point: number[]): boolean {
        // Currently, bmap takes the entire canvas.
        return true;
    }

    getViewRect(): graphic.BoundingRect {
        const api = this._api;
        return new graphic.BoundingRect(0, 0, api.getWidth(), api.getHeight());
    }

    getRoamTransform(): matrix.MatrixArray {
        return matrix.create();
    }

    prepareCustoms(this: BMapCoordSys): {
        coordSys: {
            type: typeof COORD_SYS_BMAP;
            x: number;
            y: number;
            width: number;
            height: number;
        };
        api: {
            coord: (p: number[]) => number[];
            size: (dataSize: number[], dataItem: number[]) => number[];
        };
    } {
        const rect = this.getViewRect();
        return {
            coordSys: {
                // The name exposed to user is always 'cartesian2d' but not 'grid'.
                type: COORD_SYS_BMAP,
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
    }

    convertToPixel(ecModel: unknown, finder: unknown, value: number[]): number[] {
        // here we ignore finder as only one bmap component is allowed
        return this.dataToPoint(value);
    }

    convertFromPixel(ecModel: unknown, finder: unknown, value: number[]): number[] {
        return this.pointToData(value);
    }

    static create: ECCoordinateSystemCreator['create'];

}

BMapCoordSys.prototype.dimensions = makeDimensions(); // For backward compatibility.


function dataToCoordSize(this: BMapCoordSys, dataSize: number[], dataItem: number[]): number[] {
    dataItem = dataItem || [0, 0];
    return zrUtil.map([0, 1], function (dimIdx) {
        const val = dataItem[dimIdx];
        const halfSize = dataSize[dimIdx] / 2;
        const p1: number[] = [];
        const p2: number[] = [];
        p1[dimIdx] = val - halfSize;
        p2[dimIdx] = val + halfSize;
        p1[1 - dimIdx] = p2[1 - dimIdx] = dataItem[1 - dimIdx];
        return Math.abs(this.dataToPoint(p1)[dimIdx] - this.dataToPoint(p2)[dimIdx]);
    }, this);
}

let Overlay: BMapECExtendedOverlayCtor;

function createOverlayCtor(): BMapECExtendedOverlayCtor {
    function Overlay(this: BMapECExtendedOverlay, root: HTMLElement) {
        this._root = root;
    }

    Overlay.prototype = new BMap.Overlay();

    /**
     * @override
     */
    Overlay.prototype.initialize = function (this: BMapECExtendedOverlay, map: bmapLib.Map): HTMLElement {
        map.getPanes().labelPane.appendChild(this._root);
        return this._root;
    };
    /**
     * @override
     */
    Overlay.prototype.draw = function () {};

    return Overlay as BMapECExtendedOverlayCtor;
}

BMapCoordSys.create = function (ecModel, api) {
    let bmapCoordSys: BMapCoordSys;
    const root = api.getDom();

    // TODO Dispose
    ecModel.eachComponent(COMPONENT_MAIN_TYPE_BMAP, function (bmapModel: BMapModel) {
        const painter = api.getZr().painter;
        const viewportRoot = painter.getViewportRoot();
        if (typeof BMap === 'undefined') {
            throw new Error('BMap api is not loaded');
        }
        Overlay = Overlay || createOverlayCtor();
        if (bmapCoordSys) {
            throw new Error('Only one bmap component can exist');
        }
        let bmap;
        if (!bmapModel.__bmap) {
            // Not support IE8
            let bmapRoot: HTMLElement = root.querySelector('.ec-extension-bmap');
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

            bmap = bmapModel.__bmap = new BMap.Map(bmapRoot, mapOptions);

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
                const pt = new BMap.Point(center[0], center[1]);
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
        if (seriesModel.get('coordinateSystem') === COORD_SYS_BMAP) {
            seriesModel.coordinateSystem = bmapCoordSys;
        }
    });

    // return created coordinate systems
    return bmapCoordSys && [bmapCoordSys];
};

registerCoordinateSystem('bmap', BMapCoordSys);
