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

/**
 * Parse and decode geo json
 */

import * as zrUtil from 'zrender/src/core/util';
import Region from './Region';
import { GeoJSONCompressed, GeoJSON } from './geoTypes';


function decode(json: GeoJSONCompressed | GeoJSON): GeoJSON {
    if (!(json as GeoJSONCompressed).UTF8Encoding) {
        return json as GeoJSON;
    }
    const jsonCompressed = json as GeoJSONCompressed;
    let encodeScale = jsonCompressed.UTF8Scale;
    if (encodeScale == null) {
        encodeScale = 1024;
    }

    const features = jsonCompressed.features;

    for (let f = 0; f < features.length; f++) {
        const feature = features[f];
        const geometry = feature.geometry;

        if (geometry.type === 'Polygon') {
            const coordinates = geometry.coordinates;
            for (let c = 0; c < coordinates.length; c++) {
                coordinates[c] = decodePolygon(
                    coordinates[c],
                    geometry.encodeOffsets[c],
                    encodeScale
                ) as any;
            }
        }
        else if (geometry.type === 'MultiPolygon') {
            const coordinates = geometry.coordinates;
            for (let c = 0; c < coordinates.length; c++) {
                const coordinate = coordinates[c];
                for (let c2 = 0; c2 < coordinate.length; c2++) {
                    coordinate[c2] = decodePolygon(
                        coordinate[c2],
                        geometry.encodeOffsets[c][c2],
                        encodeScale
                    ) as any;
                }
            }
        }
    }
    // Has been decoded
    jsonCompressed.UTF8Encoding = false;

    return jsonCompressed as GeoJSON;
}

function decodePolygon(
    coordinate: string,
    encodeOffsets: number[],
    encodeScale: number
): number[][] {
    const result = [];
    let prevX = encodeOffsets[0];
    let prevY = encodeOffsets[1];

    for (let i = 0; i < coordinate.length; i += 2) {
        let x = coordinate.charCodeAt(i) - 64;
        let y = coordinate.charCodeAt(i + 1) - 64;
        // ZigZag decoding
        x = (x >> 1) ^ (-(x & 1));
        y = (y >> 1) ^ (-(y & 1));
        // Delta deocding
        x += prevX;
        y += prevY;

        prevX = x;
        prevY = y;
        // Dequantize
        result.push([x / encodeScale, y / encodeScale]);
    }

    return result;
}

export default function parseGeoJSON(geoJson: GeoJSON | GeoJSONCompressed, nameProperty: string): Region[] {

    geoJson = decode(geoJson);

    return zrUtil.map(zrUtil.filter(geoJson.features, function (featureObj) {
        // Output of mapshaper may have geometry null
        return featureObj.geometry
            && featureObj.properties
            && featureObj.geometry.coordinates.length > 0;
    }), function (featureObj) {
        const properties = featureObj.properties;
        const geo = featureObj.geometry;

        const geometries = [] as Region['geometries'];
        if (geo.type === 'Polygon') {
            const coordinates = geo.coordinates;
            geometries.push({
                type: 'polygon',
                // According to the GeoJSON specification.
                // First must be exterior, and the rest are all interior(holes).
                exterior: coordinates[0],
                interiors: coordinates.slice(1)
            });
        }
        if (geo.type === 'MultiPolygon') {
            const coordinates = geo.coordinates;
            zrUtil.each(coordinates, function (item) {
                if (item[0]) {
                    geometries.push({
                        type: 'polygon',
                        exterior: item[0],
                        interiors: item.slice(1)
                    });
                }
            });
        }

        const region = new Region(
            properties[nameProperty || 'name'],
            geometries,
            properties.cp
        );
        region.properties = properties;
        return region;
    });
}
