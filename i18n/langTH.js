
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports, require('echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
})(this, function(exports, echarts) {
var lang ={
    "legend": {
        "selector": {
            "all": "ทั้งหมด",
            "inverse": "ผกผัน"
        }
    },
    "toolbox": {
        "brush": {
            "title": {
                "rect": "ตัวเลือกแบบกล่อง",
                "polygon": "ตัวเลือกแบบบ่วงบาศ",
                "lineX": "ตัวเลือกแบบแนวนอน",
                "lineY": "ตัวเลือกแบบแนวตั้ง",
                "keep": "บันทึกตัวเลือก",
                "clear": "ล้างตัวเลือก"
            }
        },
        "dataView": {
            "title": "มุมมองข้อมูล",
            "lang": [
                "มุมมองข้อมูล",
                "ปิด",
                "รีเฟรช"
            ]
        },
        "dataZoom": {
            "title": {
                "zoom": "ซูม",
                "back": "ตั้งซูมใหม่"
            }
        },
        "magicType": {
            "title": {
                "line": "สวิตซ์แบบแผนภาพเส้น",
                "bar": "สวิตซ์แบบแผนภาพแท่ง",
                "stack": "กองไว้",
                "tiled": "แยกไว้"
            }
        },
        "restore": {
            "title": "ตั้งค่าใหม่"
        },
        "saveAsImage": {
            "title": "บันทึกไปยังรูปภาพ",
            "lang": [
                "คลิกขวาเพื่อบันทึกรูปภาพ"
            ]
        }
    }
}

        echarts.registerLocale('TH', lang);
        
});