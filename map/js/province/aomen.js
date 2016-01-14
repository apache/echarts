(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports, require('echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
}(this, function (exports, echarts) {
    var log = function (msg) {
        if (typeof console !== 'undefined') {
            console && console.error && console.error(msg);
        }
    }
    if (!echarts) {
        log('ECharts is not Loaded');
        return;
    }
    if (!echarts.registerMap) {
        log('ECharts Map is not loaded')
        return;
    }
    echarts.registerMap('澳门', {"type":"FeatureCollection","features":[{"id":"820001","geometry":{"type":"Polygon","coordinates":["@@LADC^umZ@DONWEBDCLHBH@DFBBNA"],"encodeOffsets":[[116285,22746]]},"properties":{"cp":[113.5528956,22.20787],"name":"花地瑪堂區","childNum":1}},{"id":"820002","geometry":{"type":"Polygon","coordinates":["@@MK@CA@AAGDEB@NVFHE"],"encodeOffsets":[[116281,22734]]},"properties":{"cp":[113.5489608,22.1992075],"name":"花王堂區","childNum":1}},{"id":"820003","geometry":{"type":"Polygon","coordinates":["@@EGOB@DNLHE@C"],"encodeOffsets":[[116285,22729]]},"properties":{"cp":[113.5501828,22.19372083],"name":"望德堂區","childNum":1}},{"id":"820004","geometry":{"type":"Polygon","coordinates":["@@YIPEL@JFCBBFADHDBBFDHIJJEFDPCHHlY"],"encodeOffsets":[[116313,22707]]},"properties":{"cp":[113.5536475,22.18853944],"name":"大堂區","childNum":1}},{"id":"820005","geometry":{"type":"Polygon","coordinates":["@@JICGAECACGEBAAEDP^"],"encodeOffsets":[[116266,22728]]},"properties":{"cp":[113.5419278,22.18736806],"name":"風順堂區","childNum":1}},{"id":"820006","geometry":{"type":"Polygon","coordinates":["@@ ZNWRquZCBCC@AEA@@ADCDCAACEAGBQ@IN"],"encodeOffsets":[[116265,22694]]},"properties":{"cp":[113.5587044,22.15375944],"name":"嘉模堂區","childNum":1}},{"id":"820007","geometry":{"type":"Polygon","coordinates":["@@MOIAIEI@@GE@AAUCBdCFIFR@HAFBBDDBDCBCDB@BFDDC"],"encodeOffsets":[[116316,22676]]},"properties":{"cp":[113.5695992,22.13663],"name":"路氹填海區","childNum":1}},{"id":"820008","geometry":{"type":"Polygon","coordinates":["@@DKMMa_GC_COD@dVDBBF@@HJ@JFJBNP"],"encodeOffsets":[[116329,22670]]},"properties":{"cp":[113.5599542,22.12348639],"name":"聖方濟各堂區","childNum":1}}],"UTF8Encoding":true});
}));