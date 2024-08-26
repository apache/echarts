

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
        define(['exports'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports);
    } else {
        // Browser globals
        factory({});
    }
})(this, function(exports) {


/**
 * Language: Hungarian.
 */

var localeObj = {
    time: {
        month: [
            'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
            'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
        ],
        monthAbbr: [
            'Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún',
            'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'
        ],
        dayOfWeek: [
            'Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'
        ],
        dayOfWeekAbbr: [
            'V', 'H', 'K', 'Sze', 'Csü', 'P', 'Szo'
        ]
    },
    legend: {
        selector: {
            all: 'Mind',
            inverse: 'Inverz'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Négyzet kijelölés',
                polygon: 'Lasszó kijelölés',
                lineX: 'Vízszintes kijelölés',
                lineY: 'Függőleges kijelölés',
                keep: 'Kijelölések megtartása',
                clear: 'Kijelölések törlése'
            }
        },
        dataView: {
            title: 'Adat nézet',
            lang: ['Adat nézet', 'Bezárás', 'Frissítés']
        },
        dataZoom: {
            title: {
                zoom: 'Nagyítás',
                back: 'Alapméret'
            }
        },
        magicType: {
            title: {
                line: 'Váltás vonal diagramra',
                bar: 'Váltás oszlop diagramra',
                stack: 'Halmozás',
                tiled: 'Csempe'
            }
        },
        restore: {
            title: 'Visszaállítás'
        },
        saveAsImage: {
            title: 'Mentés képként',
            lang: ['Kattints jobb egérgombbal a mentéshez képként']
        }
    },
    series: {
        typeNames: {
            pie: 'Oszlopdiagram',
            bar: 'Sávdiagram',
            line: 'Vonaldiagram',
            scatter: 'Pontdiagram',
            effectScatter: 'Buborékdiagram',
            radar: 'Sugárdiagram',
            tree: 'Fa',
            treemap: 'Fatérkép',
            boxplot: 'Dobozdiagram',
            candlestick: 'Árfolyamdiagram',
            k: 'K vonaldiagram',
            heatmap: 'Hőtérkép',
            map: 'Térkép',
            parallel: 'Párhuzamos koordináta térkép',
            lines: 'Vonalgráf',
            graph: 'Kapcsolatgráf',
            sankey: 'Sankey-diagram',
            funnel: 'Vízesésdiagram',
            gauge: 'Mérőeszköz',
            pictorialBar: 'Képes sávdiagram',
            themeRiver: 'Folyó témájú térkép',
            sunburst: 'Napégés',
            custom: 'Egyedi diagram',
            chart: 'Diagram'
        }
    },
    aria: {
        general: {
            withTitle: 'Ez egy diagram, amely neve "{title}"',
            withoutTitle: 'Ez egy diagram'
        },
        series: {
            single: {
                prefix: '',
                withName: ' típusa {seriesType} és elnevezése {seriesName}.',
                withoutName: ' típusa {seriesType}.'
            },
            multiple: {
                prefix: '. Az adatsorok száma {seriesCount}.',
                withName: ' A {seriesId} számú adatsor típusa {seriesType} és neve {seriesName}.',
                withoutName: ' A {seriesId} számú adatsor típusa {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Az adatok a következők: ',
            partialData: 'Az első {displayCnt} elemek: ',
            withName: 'a {name} nevű adat értéke {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};

    for (var key in localeObj) {
        if (localeObj.hasOwnProperty(key)) {
            exports[key] = localeObj[key];
        }
    }
        
});