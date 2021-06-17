

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
 * Language: Slovenian.
 */

var localeObj = {
    time: {
        month: [
            'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
            'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December'
        ],
        monthAbbr: [
            'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
            'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'
        ],
        dayOfWeek: [
            'Nedelja', 'Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota'
        ],
        dayOfWeekAbbr: [
            'Ned', 'Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob'
        ]
    },
    legend: {
        selector: {
            all: 'Vsi',
            inverse: 'Obratno'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Izbor s pravokotnikom',
                polygon: 'Izbor z lasom',
                lineX: 'Vodoravni izbor',
                lineY: 'Navpični izbor',
                keep: 'Ohrani izbor',
                clear: 'Počisti izbor'
            }
        },
        dataView: {
            title: 'Pogled podatkov',
            lang: ['Pogled podatkov', 'Zapri', 'Osveži']
        },
        dataZoom: {
            title: {
                zoom: 'Približaj',
                back: 'Povrni velikost'
            }
        },
        magicType: {
            title: {
                line: 'Preklopi na črtni grafikon',
                bar: 'Preklopi na stolpčni grafikon',
                stack: 'Naloži',
                tiled: 'Drug ob drugem'
            }
        },
        restore: {
            title: 'Povrni'
        },
        saveAsImage: {
            title: 'Shrani kot sliko',
            lang: ['Z desnim klikom shrani sliko']
        }
    },
    series: {
        typeNames: {
            pie: 'Tortni grafikon',
            bar: 'Stolpčni grafikon',
            line: 'Črtni grafikon',
            scatter: 'Raztreseni grafikon',
            effectScatter: 'Raztreseni grafikon z efektom',
            radar: 'Radarski grafikon',
            tree: 'Drevo',
            treemap: 'Drevesna struktura',
            boxplot: 'Boxplot grafikon',
            candlestick: 'Svečni grafikon',
            k: 'K line grafikon',
            heatmap: 'Toplotni zemljevid',
            map: 'Zemljevid',
            parallel: 'Zemljevid vzporednih koordinat',
            lines: 'Črtni grafikon',
            graph: 'Grafikon razmerij',
            sankey: 'Sankey grafikon',
            funnel: 'Lijakasti grafikon',
            gauge: 'Števec',
            pictorialBar: 'Stolpčni grafikon s podobo',
            themeRiver: 'Tematski rečni grafikon',
            sunburst: 'Večnivojski tortni grafikon'
        }
    },
    aria: {
        general: {
            withTitle: 'To je grafikon z naslovom "{title}"',
            withoutTitle: 'To je grafikon'
        },
        series: {
            single: {
                prefix: '',
                withName: ' tipa {seriesType} imenovan {seriesName}.',
                withoutName: ' tipa {seriesType}.'
            },
            multiple: {
                prefix: '. Sestavljen iz {seriesCount} nizov.',
                withName: ' Niz {seriesId} je tipa {seriesType} z nazivom {seriesName}.',
                withoutName: ' Niz {seriesId} je tipa {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Podatki so naslednji: ',
            partialData: 'Prvih {displayCnt} elementov je: ',
            withName: 'podatek za {name} je {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};
    echarts.registerLocale('SI', localeObj);
        
});