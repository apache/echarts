

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
 * Language: Polish
 */

 var localeObj = {
    time: {
        month: [
            'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
            'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
        ],
        monthAbbr: [
            'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
            'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'
        ],
        dayOfWeek: [
            'Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'
        ],
        dayOfWeekAbbr: [
            'Nie', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob'
        ]
    },
    legend: {
        selector: {
            all: 'Wszystko',
            inverse: 'Odwróć'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Zaznaczenie prostokątne',
                polygon: 'Zaznaczanie lasso',
                lineX: 'Zaznaczenie poziome',
                lineY: 'Zaznaczenie pionowe',
                keep: 'Zachowaj zaznaczenie',
                clear: 'Wyczyść zaznaczenie'
            }
        },
        dataView: {
            title: 'Widok danych',
            lang: ['Widok danych', 'Zamknij', 'Odśwież']
        },
        dataZoom: {
            title: {
                zoom: 'Przybliżenie',
                back: 'Resetuj przybliżenie'
            }
        },
        magicType: {
            title: {
                line: 'Przełącz na wykres liniowy',
                bar: 'Przełącz na wykres słupkowy',
                stack: 'Przełącz na wykres słupkowy skumulowany',
                tiled: 'Przełącz na kafelki'
            }
        },
        restore: {
            title: 'Przywróć'
        },
        saveAsImage: {
            title: 'Zapisz jako obrazek',
            lang: ['Kliknij prawym klawiszem myszy aby zapisać']
        }
    },
    series: {
        typeNames: {
            pie: 'Wykres kołowy',
            bar: 'Wykres słupkowy',
            line: 'Wykres liniowy',
            scatter: 'Wykres punktowy',
            effectScatter: 'Wykres punktowy z efektem falowania',
            radar: 'Wykres radarowy',
            tree: 'Drzewo',
            treemap: 'Mapa drzewa',
            boxplot: 'Wykres pudełkowy',
            candlestick: 'Wykres świecowy',
            k: 'Wykres linii K',
            heatmap: 'Mapa ciepła',
            map: 'Mapa',
            parallel: 'Wykres współrzędnych równoległych',
            lines: 'Diagram linii',
            graph: 'Graf relacji',
            sankey: 'Wykres Sankeya',
            funnel: 'Wykres lejkowy',
            gauge: 'Wykres zegarowy',
            pictorialBar: 'Wykres słupkowy obrazkowy',
            themeRiver: 'Wykres rzeki tematycznej',
            sunburst: 'Wykres hierarchiczny słonecznikowy'
        }
    },
    aria: {
        general: {
            withTitle: 'To jest wykres dotyczący "{title}"',
            withoutTitle: 'To jest wykres'
        },
        series: {
            single: {
                prefix: '',
                withName: ' typu {seriesType} nazwana {seriesName}.',
                withoutName: ' typu {seriesType}.'
            },
            multiple: {
                prefix: '. Składający się z {seriesCount} serii danych.',
                withName: ' Seria danych {seriesId} jest serią typu {seriesType} przedstawiającą {seriesName}.',
                withoutName: ' Seria danych {seriesId} jest serią typu {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Dane są następujące: ',
            partialData: 'Pierwszych {displayCnt} elementów to: ',
            withName: 'dane dla {name} to {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};

    echarts.registerLocale('PL', localeObj);
        
});