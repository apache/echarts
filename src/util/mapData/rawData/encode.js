//docs.google.com/presentation/d/1XgKaFEgPIzF2psVgY62-KnylV81gsjCWu999h4QtaOE/
var fs = require('fs');
var requirejs = require('requirejs');
var glob = require('glob');

glob('china/*.js', {}, function(er, files) {

    files.forEach(function(file) {
        if (file.indexOf('_unicode') >=0 ) {
            return;
        }
        var output = '../' + file;
        requirejs([file], function(json){
            // Meta tag
            json.UTF8Encoding = true;
            var features = json.features;
            features.forEach(function(feature){
                var encodeOffsets = feature.geometry.encodeOffsets = [];
                var coordinates = feature.geometry.coordinates;
                if (feature.geometry.type === 'Polygon') {
                    coordinates.forEach(function(coordinate, idx){
                        coordinates[idx] = encodePolygon(
                            coordinate, encodeOffsets[idx] = []
                        );
                    });
                } else if(feature.geometry.type === 'MultiPolygon') {
                    coordinates.forEach(function(polygon, idx1){
                        encodeOffsets[idx1] = [];
                        polygon.forEach(function(coordinate, idx2) {
                            coordinates[idx1][idx2] = encodePolygon(
                                coordinate, encodeOffsets[idx1][idx2] = []
                            );
                        });
                    });
                }
            });

            fs.writeFileSync(
                output, addAMDWrapper(JSON.stringify(json)), 'utf8'
            );
        });
    });
});

function encodePolygon(coordinate, encodeOffsets) {
    var result = '';

    var prevX = quantize(coordinate[0][0]);
    var prevY = quantize(coordinate[0][1]);
    // Store the origin offset
    encodeOffsets[0] = prevX;
    encodeOffsets[1] = prevY;

    for (var i = 0; i < coordinate.length; i++) {
        var point = coordinate[i];
        result+=encode(point[0], prevX);
        result+=encode(point[1], prevY);

        prevX = quantize(point[0]);
        prevY = quantize(point[1]);
    }

    return result;
}

function addAMDWrapper(jsonStr) {
    return ['define(function() {',
                '    return ' + jsonStr + ';',
            '});'].join('\n');
}

function encode(val, prev){
    // Quantization
    val = quantize(val);
    // var tmp = val;
    // Delta
    val = val - prev;
    // ZigZag
    val = (val << 1) ^ (val >> 15);
    // add offset and get unicode
    return String.fromCharCode(val+64);
}

function quantize(val) {
    return Math.ceil(val * 1024);
}