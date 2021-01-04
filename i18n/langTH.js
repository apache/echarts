

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
 * AUTO-GENERATED FILE. DO NOT MODIFY.
 */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports, require('echarts/lib/echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
})(this, function(exports, echarts) {


var localeObj = {
    time: {
        month: [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ],
        monthAbbr: [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ],
        dayOfWeek: [
            'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
        ],
        dayOfWeekAbbr: [
            'อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'
        ]
    },
    legend: {
        selector: {
            all: 'ทั้งหมด',
            inverse: 'ผกผัน'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'ตัวเลือกแบบกล่อง',
                polygon: 'ตัวเลือกแบบบ่วงบาศ',
                lineX: 'ตัวเลือกแบบแนวนอน',
                lineY: 'ตัวเลือกแบบแนวตั้ง',
                keep: 'บันทึกตัวเลือก',
                clear: 'ล้างตัวเลือก'
            }
        },
        dataView: {
            title: 'มุมมองข้อมูล',
            lang: ['มุมมองข้อมูล', 'ปิด', 'รีเฟรช']
        },
        dataZoom: {
            title: {
                zoom: 'ซูม',
                back: 'ตั้งซูมใหม่'
            }
        },
        magicType: {
            title: {
                line: 'สวิตซ์แบบแผนภาพเส้น',
                bar: 'สวิตซ์แบบแผนภาพแท่ง',
                stack: 'กองไว้',
                tiled: 'แยกไว้'
            }
        },
        restore: {
            title: 'ตั้งค่าใหม่'
        },
        saveAsImage: {
            title: 'บันทึกไปยังรูปภาพ',
            lang: ['คลิกขวาเพื่อบันทึกรูปภาพ']
        }
    }
};

    echarts.registerLocale('TH', localeObj);
        
});