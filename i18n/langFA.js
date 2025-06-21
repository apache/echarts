

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


/**
 * Language: Persian.
 */

var localeObj = {
    time: {
        month: [
            'بهمن', 'اسفند', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
            'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی'
        ],
        monthAbbr: [
            'بهمن', 'اسفند', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
            'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی'
        ],
        dayOfWeek: [
            'یکشنبه', 'دوشنبه', 'سه شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'
        ],
        dayOfWeekAbbr: [
            'یکشنبه', 'دوشنبه', 'سه شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'
        ]
    },
    legend: {
        selector: {
            all: 'همه',
            inverse: 'معکوس'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'چهار ضلعی',
                polygon: 'چند ضلعی',
                lineX: 'افقی',
                lineY: 'عمودی',
                keep: 'قفل کردن',
                clear: 'پاک کردن'
            }
        },
        dataView: {
            title: 'نمایش داده‌ها',
            lang: ['نمایش داده‌ها', 'خروج', 'بارگذاری مجدد']
        },
        dataZoom: {
            title: {
                zoom: 'بزرگنمایی',
                back: 'خروج از بزرگنمایی'
            }
        },
        magicType: {
            title: {
                line: 'نمودار خطی',
                bar: 'نمودار میله‌ای',
                stack: 'پشته',
                tiled: 'کاشی'
            }
        },
        restore: {
            title: 'بازگردانی'
        },
        saveAsImage: {
            title: 'ذخیره تصویر',
            lang: ['راست کلیک برای ذخیره تصویر']
        }
    },
    series: {
        typeNames: {
            pie: 'نمودار دایره‌ای',
            bar: 'نمودار میله‌ای',
            line: 'نمودار خطی',
            scatter: 'طرح پراکنده',
            effectScatter: 'طرح پراکنده موج دار',
            radar: 'نمودار راداری',
            tree: 'درخت',
            treemap: 'نقشه درختی',
            boxplot: 'طرح جعبه‌',
            candlestick: 'شمعی',
            k: 'نمودار خطی k',
            heatmap: 'نقشه گرمایی',
            map: 'نقشه',
            parallel: 'نقشه مختصات موازی',
            lines: 'گراف خطی',
            graph: 'گراف ارتباط',
            sankey: 'دیاگرام سنکی',
            funnel: 'نمودار قیفی',
            gauge: 'اندازه گیر',
            pictorialBar: 'نوار تصویری',
            themeRiver: 'نقشه رودخانه رنگی',
            sunburst: 'آفتاب زدگی',
            custom: 'نمودار سفارشی',
            chart: 'نمودار'
        }
    },
    aria: {
        general: {
            withTitle: 'نمودار مربوط به "{title}"',
            withoutTitle: 'این یک نمودار است'
        },
        series: {
            single: {
                prefix: '',
                withName: 'با نوع {seriesType} و نام {seriesName}.',
                withoutName: 'با نوع {seriesType}.'
            },
            multiple: {
                prefix: '. تشکیل شده از {seriesCount} سری.',
                withName: '{seriesId} سری نوعی از {seriesType} به نام {seriesName} است.',
                withoutName: 'سری {seriesId} نوعی از {seriesType} است.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'دیتای نمونه: ',
            partialData: 'اولین عنصر از {displayCnt}:',
            withName: 'مقدار {name}, {value} است',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};

    echarts.registerLocale('FA', localeObj);
        
});