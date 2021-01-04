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
 * Language: Japanese.
 */

export default {
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
            '日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'
        ],
        dayOfWeekAbbr: [
            '日', '月', '火', '水', '木', '金', '土'
        ]
    },
    legend: {
        selector: {
            all: 'すべてを選択',
            inverse: '選択範囲を反転'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: '矩形選択',
                polygon: 'なげなわ選択',
                lineX: '横方向に選択',
                lineY: '縦方向に選択',
                keep: '選択範囲を維持',
                clear: '選択範囲をクリア'
            }
        },
        dataView: {
            title: 'データビュー',
            lang: ['データビュー', '閉じる', 'リロード']
        },
        dataZoom: {
            title: {
                zoom: 'ズーム',
                back: 'リセット'
            }
        },
        magicType: {
            title: {
                line: '折れ線に切り替え',
                bar: '棒に切り替え',
                stack: '積み上げに切り替え',
                tiled: 'タイル状に切り替え'
            }
        },
        restore: {
            title: '復元'
        },
        saveAsImage: {
            title: '図として保存',
            lang: ['右クリックして図を保存']
        }
    },
    series: {
        typeNames: {
            pie: '円グラフ',
            bar: '棒グラフ',
            line: '折れ線グラフ',
            scatter: '散布図',
            effectScatter: 'エフェクト散布図',
            radar: 'レーダーチャート',
            tree: '階層グラフ',
            treemap: 'ツリーマップ',
            boxplot: '箱ひげ図',
            candlestick: 'Kチャート',
            k: 'Kチャート',
            heatmap: 'ヒートマップ',
            map: '地図',
            parallel: 'パラレルチャート',
            lines: 'ラインチャート',
            graph: '相関図',
            sankey: 'サンキーダイアグラム',
            funnel: 'ファネルグラフ',
            gauge: 'ゲージ',
            pictorialBar: '絵入り棒グラフ',
            themeRiver: 'テーマリバー',
            sunburst: 'サンバースト'
        }
    },
    aria: {
        general: {
            withTitle: 'これは「{title}」に関するチャートです。',
            withoutTitle: 'これはチャートで、'
        },
        series: {
            single: {
                prefix: '',
                withName: 'チャートのタイプは{seriesType}で、{seriesName}を示しています。',
                withoutName: 'チャートのタイプは{seriesType}です。'
            },
            multiple: {
                prefix: '{seriesCount}つのチャートシリーズによって構成されています。',
                withName: '{seriesId}番目のシリーズは{seriesName}を示した{seriesType}で、',
                withoutName: '{seriesId}番目のシリーズは{seriesType}で、',
                separator: {
                    middle: '；',
                    end: '。'
                }
            }
        },
        data: {
            allData: 'データは：',
            partialData: 'その内、{displayCnt}番目までは：',
            withName: '{name}のデータは{value}',
            withoutName: '{value}',
            separator: {
                middle: '、',
                end: ''
            }
        }
    }
};
