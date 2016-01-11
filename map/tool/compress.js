
function compress(json) {

    json.UTF8Encoding = true;

    var features = json.features;

    features.forEach(function (feature){
        var encodeOffsets = feature.geometry.encodeOffsets = [];
        var coordinates = feature.geometry.coordinates;
        if (feature.geometry.type === 'MultiPolygon') {
            coordinates.forEach(function (polygon, idx1){
                encodeOffsets[idx1] = [];
                polygon.forEach(function (coordinate, idx2) {
                    coordinates[idx1][idx2] = encodePolygon(
                        coordinate, encodeOffsets[idx1][idx2] = []
                    );
                });
            });
        }
        else {
            coordinates.forEach(function (coordinate, idx){
                coordinates[idx] = encodePolygon(
                    coordinate, encodeOffsets[idx] = []
                );
            });
        }
    });

    return json;
}

function encodePolygon(coordinates, encodeOffsets) {

    var result = '';

    var prevX = quantize(coordinates[0][0]);
    var prevY = quantize(coordinates[0][1]);
    // Store the origin offset
    encodeOffsets[0] = prevX;
    encodeOffsets[1] = prevY;

    for (var i = 0; i < coordinates.length; i++) {
        var point = coordinates[i];
        result += encode(point[0], prevX);
        result += encode(point[1], prevY);

        prevX = quantize(point[0]);
        prevY = quantize(point[1]);
    }

    return result;
}

function quantize(val) {
    return Math.ceil(val * 1024);
}

function encode(val, prev){
    // Quantization
    val = quantize(val);
    // var tmp = val;
    // Delta
    var delta = val - prev;

    if (((delta << 1) ^ (delta >> 15)) + 64 === 8232) {
        //WTF, 8232 will get syntax error in js code
        delta--;
    }
    // ZigZag
    delta = (delta << 1) ^ (delta >> 15);
    // add offset and get unicode
    return String.fromCharCode(delta + 64);
    // var tmp = {'tmp' : str};
    // try{
    //     eval("(" + JSON.stringify(tmp) + ")");
    // }catch(e) {
    //     console.log(val + 64);
    // }
}

module.exports = compress;