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

function decode(json) {
    if (json.UTF8Encoding) {
        return;
    }
    var jsonCompressed = json;
    var encodeScale = jsonCompressed.UTF8Scale;
    if (encodeScale == null) {
        encodeScale = 1024;
    }

    var features = jsonCompressed.features;
    features.forEach(function (feature) {
        var geometry = feature.geometry;
        var encodeOffsets = geometry.encodeOffsets;
        var coordinates = geometry.coordinates;

        // Geometry may be appeded manually in the script after json loaded.
        // In this case this geometry is usually not encoded.
        if (!encodeOffsets) {
            return;
        }

        switch (geometry.type) {
            case 'LineString':
                geometry.coordinates = decodeRing(coordinates, encodeOffsets, encodeScale);
                break;
            case 'Polygon':
            case 'MultiLineString':
                decodeRings(coordinates, encodeOffsets, encodeScale);
                break;
            case 'MultiPolygon':
                zrUtil.each(coordinates, function (rings, idx) {
                    return decodeRings(rings, encodeOffsets[idx], encodeScale)
                });
        }
    });
    // Has been decoded
    jsonCompressed.UTF8Encoding = false;
}

function decodeRings(rings, encodeOffsets, encodeScale) {
    for (var c = 0; c < rings.length; c++) {
        rings[c] = decodeRing(
            rings[c],
            encodeOffsets[c],
            encodeScale
        );
    }
}

function decodeRing(coordinate, encodeOffsets, encodeScale) {
    var result = [];
    var prevX = encodeOffsets[0];
    var prevY = encodeOffsets[1];

    for (var i = 0; i < coordinate.length; i += 2) {
        var x = coordinate.charCodeAt(i) - 64;
        var y = coordinate.charCodeAt(i + 1) - 64;
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

// Export for testing.
if (typeof module !== 'undefined') {
    module.exports = decode;
}
else {
    window.decodeGeoJSON = decode;
}