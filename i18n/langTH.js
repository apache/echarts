

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
    },
    series: {
        typeNames: {
            pie: 'แผนภูมิวงกลม',
            bar: 'แผนภูมิแท่ง',
            line: 'แผนภูมิเส้น',
            scatter: 'แผนภูมิกระจาย',
            effectScatter: 'แผนภูมิกระจายคลื่น',
            radar: 'แผนภูมิเรดาร์',
            tree: 'ต้นไม้',
            treemap: 'แผนที่ต้นไม้',
            boxplot: 'แผนภูมิกล่อง',
            candlestick: 'แผนภูมิเทียน',
            k: 'แผนภูมิเส้น K',
            heatmap: 'แผนที่ความร้อน',
            map: 'แผนที่',
            parallel: 'แผนที่พิกัดขนาน',
            lines: 'กราฟเส้น',
            graph: 'กราฟความสัมพันธ์',
            sankey: 'แผนภูมิซันกีย์',
            funnel: 'แผนภูมิกรวย',
            gauge: 'เกจ',
            pictorialBar: 'แผนภูมิแท่งภาพ',
            themeRiver: 'แผนที่แม่น้ำธีม',
            sunburst: 'Sunburst',
            custom: 'แผนภูมิที่กำหนดเอง',
            chart: 'แผนภูมิ'
        }
    },
    aria: {
        general: {
            withTitle: 'นี่คือแผนภูมิเกี่ยวกับ “{title}”',
            withoutTitle: 'นี่คือแผนภูมิ'
        },
        series: {
            single: {
                prefix: '',
                withName: ' ด้วยประเภท {seriesType} ชื่อ {seriesName} ',
                withoutName: ' ด้วยประเภท {seriesType} '
            },
            multiple: {
                prefix: ' มีทั้งหมด {seriesCount} ชุดข้อมูล ',
                withName: ' ชุดข้อมูลที่ {seriesId} เป็นประเภท {seriesType} แทน {seriesName} ',
                withoutName: ' ชุดข้อมูลที่ {seriesId} เป็นประเภท {seriesType} ',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'ข้อมูลดังต่อไปนี้: ',
            partialData: 'ข้อมูล {displayCnt} รายการแรกคือ: ',
            withName: 'ข้อมูลสำหรับ {name} คือ {value} ',
            withoutName: '{value} ',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};

    echarts.registerLocale('TH', localeObj);
        
});