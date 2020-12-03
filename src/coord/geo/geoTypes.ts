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


export interface NameMap {
    [regionName: string]: string
}

export interface GeoSpecialAreas {
    [areaName: string]: {
        left: number;
        top: number;
        width?: number;
        height?: number;
    }
}

// Currently only `FeatureCollection` is supported in `parseGeoJson`?
export interface GeoJSON extends GeoJSONFeatureCollection<GeoJSONGeometry> {
}
export interface GeoJSONCompressed extends GeoJSONFeatureCollection<GeoJSONGeometryCompressed> {
    UTF8Encoding?: boolean;
    UTF8Scale?: number;
}
interface GeoJSONFeatureCollection<G> {
    type: 'FeatureCollection';
    features: GeoJSONFeature<G>[];
}
interface GeoJSONFeature<G = GeoJSONGeometry> {
    type: 'Feature';
    id?: string | number;
    properties: {
        name?: string;
        cp?: number[];
        // id: string;
        // childNum: number;
        // Actual in GeoJSON spec, properties can be any.
        [key: string]: any;
    };
    geometry: G;
}
type GeoJSONGeometry =
    GeoJSONGeometryPoint
    | GeoJSONGeometryMultiPoint
    | GeoJSONGeometryLineString
    | GeoJSONGeometryMultiLineString
    | GeoJSONGeometryPolygon
    | GeoJSONGeometryMultiPolygon;
    // Do not support `GeometryCollection` yet.
    // | GeoJSONGeometryGeometryCollection

type GeoJSONGeometryCompressed =
    GeoJSONGeometryPoint
    | GeoJSONGeometryMultiPoint
    | GeoJSONGeometryLineString
    | GeoJSONGeometryMultiLineString
    // Currenly only Polygon and MultiPolygon can be parsed from compression.
    | GeoJSONGeometryPolygonCompressed
    | GeoJSONGeometryMultiPolygonCompressed;
    // Do not support `GeometryCollection` yet.
    // | GeoJSONGeometryGeometryCollection

interface GeoJSONGeometryPoint {
    type: 'Point';
    coordinates: number[];
};
interface GeoJSONGeometryMultiPoint {
    type: 'MultiPoint';
    coordinates: number[][];
};
interface GeoJSONGeometryLineString {
    type: 'LineString';
    coordinates: number[][];
};
interface GeoJSONGeometryMultiLineString {
    type: 'MultiLineString';
    coordinates: number[][][];
};
export interface GeoJSONGeometryPolygon {
    type: 'Polygon';
    coordinates: number[][][];
};
interface GeoJSONGeometryPolygonCompressed {
    type: 'Polygon';
    coordinates: string[];
    encodeOffsets: number[][]
};
export interface GeoJSONGeometryMultiPolygon {
    type: 'MultiPolygon';
    coordinates: number[][][][];
};
interface GeoJSONGeometryMultiPolygonCompressed {
    type: 'MultiPolygon';
    coordinates: string[][];
    encodeOffsets: number[][][];
};
// interface GeoJSONGeometryGeometryCollection {
//      type: 'GeometryCollection';
//      geometries: GeoJSONGeometry[];
// };
