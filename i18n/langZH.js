

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
            '一月', '二月', '三月', '四月', '五月', '六月',
            '七月', '八月', '九月', '十月', '十一月', '十二月'
        ],
        monthAbbr: [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
        ],
        dayOfWeek: [
            '星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'
        ],
        dayOfWeekAbbr: [
            '日', '一', '二', '三', '四', '五', '六'
        ]
    },
    legend: {
        selector: {
            all: '全选',
            inverse: '反选'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: '矩形选择',
                polygon: '圈选',
                lineX: '横向选择',
                lineY: '纵向选择',
                keep: '保持选择',
                clear: '清除选择'
            }
        },
        dataView: {
            title: '数据视图',
            lang: ['数据视图', '关闭', '刷新']
        },
        dataZoom: {
            title: {
                zoom: '区域缩放',
                back: '区域缩放还原'
            }
        },
        magicType: {
            title: {
                line: '切换为折线图',
                bar: '切换为柱状图',
                stack: '切换为堆叠',
                tiled: '切换为平铺'
            }
        },
        restore: {
            title: '还原'
        },
        saveAsImage: {
            title: '保存为图片',
            lang: ['右键另存为图片']
        }
    },
    series: {
        typeNames: {
            pie: '饼图',
            bar: '柱状图',
            line: '折线图',
            scatter: '散点图',
            effectScatter: '涟漪散点图',
            radar: '雷达图',
            tree: '树图',
            treemap: '矩形树图',
            boxplot: '箱型图',
            candlestick: 'K线图',
            k: 'K线图',
            heatmap: '热力图',
            map: '地图',
            parallel: '平行坐标图',
            lines: '线图',
            graph: '关系图',
            sankey: '桑基图',
            funnel: '漏斗图',
            gauge: '仪表盘图',
            pictorialBar: '象形柱图',
            themeRiver: '主题河流图',
            sunburst: '旭日图'
        }
    },
    aria: {
        general: {
            withTitle: '这是一个关于“{title}”的图表。',
            withoutTitle: '这是一个图表，'
        },
        series: {
            single: {
                prefix: '',
                withName: '图表类型是{seriesType}，表示{seriesName}。',
                withoutName: '图表类型是{seriesType}。'
            },
            multiple: {
                prefix: '它由{seriesCount}个图表系列组成。',
                withName: '第{seriesId}个系列是一个表示{seriesName}的{seriesType}，',
                withoutName: '第{seriesId}个系列是一个{seriesType}，',
                separator: {
                    middle: '；',
                    end: '。'
                }
            }
        },
        data: {
            allData: '其数据是——',
            partialData: '其中，前{displayCnt}项是——',
            withName: '{name}的数据是{value}',
            withoutName: '{value}',
            separator: {
                middle: '，',
                end: ''
            }
        }
    }
};

    echarts.registerLocale('ZH', localeObj);
        
});