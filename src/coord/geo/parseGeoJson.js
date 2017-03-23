/**
 * Parse and decode geo json
 * @module echarts/coord/geo/parseGeoJson
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');

    var Region = require('./Region');

    function decode(json) {
        if (!json.UTF8Encoding) {
            return json;
        }
        var features = json.features;

        for (var f = 0; f < features.length; f++) {
            var feature = features[f];
            var geometry = feature.geometry;
            var coordinates = geometry.coordinates;
            var encodeOffsets = geometry.encodeOffsets;

            for (var c = 0; c < coordinates.length; c++) {
                var coordinate = coordinates[c];

                if (geometry.type === 'Polygon') {
                    coordinates[c] = decodePolygon(
                        coordinate,
                        encodeOffsets[c]
                    );
                }
                else if (geometry.type === 'MultiPolygon') {
                    for (var c2 = 0; c2 < coordinate.length; c2++) {
                        var polygon = coordinate[c2];
                        coordinate[c2] = decodePolygon(
                            polygon,
                            encodeOffsets[c][c2]
                        );
                    }
                }
            }
        }
        // Has been decoded
        json.UTF8Encoding = false;
        return json;
    }

    function decodePolygon(coordinate, encodeOffsets) {
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
            result.push([x / 1024, y / 1024]);
        }

        return result;
    }

    /**
     * @alias module:echarts/coord/geo/parseGeoJson
     * @param {Object} geoJson
     * @return {module:zrender/container/Group}
     */
    return function (geoJson) {

        decode(geoJson);

        return zrUtil.map(zrUtil.filter(geoJson.features, function (featureObj) {
            // Output of mapshaper may have geometry null
            return featureObj.geometry
                && featureObj.properties
                && featureObj.geometry.coordinates.length > 0;
        }), function (featureObj) {
            var properties = featureObj.properties;
            var geo = featureObj.geometry;

            var coordinates = geo.coordinates;

            var geometries = [];
            if (geo.type === 'Polygon') {
                geometries.push({
                    type: 'polygon',
                    // According to the GeoJSON specification.
                    // First must be exterior, and the rest are all interior(holes).
                    exterior: coordinates[0],
                    interiors: coordinates.slice(1)
                });
            }
            if (geo.type === 'MultiPolygon') {
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

            var region = new Region(
                properties.name,
                geometries,
                properties.cp
            );
            region.properties = properties;
            return region;
        });
    };
});