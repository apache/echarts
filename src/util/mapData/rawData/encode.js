//docs.google.com/presentation/d/1XgKaFEgPIzF2psVgY62-KnylV81gsjCWu999h4QtaOE/
var fs = require('fs');
var glob = require('glob');

glob('geoJson/*.json', {}, function(err, files) {

    files.forEach(function(file) {
        var output = '../' + file.replace('.json', '.js');
        var rawStr = fs.readFileSync(file, 'utf8');
        var json = JSON.parse(rawStr);
        // Meta tag
        json.UTF8Encoding = true;
        var features = json.features;
        if (!features) {
            return;
        }
        features.forEach(function(feature){
            var encodeOffsets = feature.geometry.encodeOffsets = [];
            var coordinates = feature.geometry.coordinates;
            var bb = [[999999, 999999], [-999999, -999999]];
            if (feature.geometry.type === 'Polygon') {
                coordinates.forEach(function(coordinate, idx){
                    coordinates[idx] = encodePolygon(
                        coordinate, encodeOffsets[idx] = []
                    );
                    var _bb = computeBoundingBox(coordinate);
                    bb[0][0] = Math.min(bb[0][0], _bb[0][0]);
                    bb[0][1] = Math.min(bb[0][1], _bb[0][1]);
                    bb[1][0] = Math.max(bb[1][0], _bb[1][0]);
                    bb[1][1] = Math.max(bb[1][1], _bb[1][1]);
                });
            } else if(feature.geometry.type === 'MultiPolygon') {
                coordinates.forEach(function(polygon, idx1){
                    encodeOffsets[idx1] = [];
                    polygon.forEach(function(coordinate, idx2) {
                        coordinates[idx1][idx2] = encodePolygon(
                            coordinate, encodeOffsets[idx1][idx2] = []
                        );
                        var _bb = computeBoundingBox(coordinate);
                        bb[0][0] = Math.min(bb[0][0], _bb[0][0]);
                        bb[0][1] = Math.min(bb[0][1], _bb[0][1]);
                        bb[1][0] = Math.max(bb[1][0], _bb[1][0]);
                        bb[1][1] = Math.max(bb[1][1], _bb[1][1]);
                    });
                });
            }
            if (!feature.properties.cp) {
                feature.properties.cp = [(bb[0][0] + bb[1][0]) / 2, (bb[0][1] + bb[1][1]) / 2];
            }
        });
        fs.writeFileSync(
            output, addAMDWrapper(JSON.stringify(json)), 'utf8'
        );
    });
});

function computeBoundingBox(coordinate) {
    var min = coordinate[0].slice();
    var max = min.slice();

    for (var i = 0; i < coordinate.length; i++) {
        var point = coordinate[i];
        min[0] = Math.min(point[0], min[0]);
        min[1] = Math.min(point[1], min[1]);
        max[0] = Math.max(point[0], max[0]);
        max[1] = Math.max(point[1], max[1]);
    }

    return [min, max];
}

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
    if (val+64 === 8232) { //WTF, 8232 will get syntax error in js code
        val--;
    }
    var str = String.fromCharCode(val+64);
    // var tmp = {'tmp' : str};
    // try{
    //     eval("(" + JSON.stringify(tmp) + ")");
    // }catch(e) {
    //     console.log(val + 64);
    // }
    return str;
}

function quantize(val) {
    return Math.ceil(val * 1024);
}