

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
 * Language: Czech.
 */

 var localeObj = {
    time: {
        month: [
            'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
            'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
        ],
        monthAbbr: [
            'Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn',
            'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'
        ],
        dayOfWeek: [
            'Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'
        ],
        dayOfWeekAbbr: [
            'Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'
        ]
    },
    legend: {
        selector: {
            all: 'Vše',
            inverse: 'Inv'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Obdélníkový výběr',
                polygon: 'Lasso výběr',
                lineX: 'Horizontální výběr',
                lineY: 'Vertikální výběr',
                keep: 'Ponechat výběr',
                clear: 'Zrušit výběr'
            }
        },
        dataView: {
            title: 'Data',
            lang: ['Data', 'Zavřít', 'Obnovit']
        },
        dataZoom: {
            title: {
                zoom: 'Přiblížit',
                back: 'Oddálit'
            }
        },
        magicType: {
            title: {
                line: 'Změnit na Spojnicový graf',
                bar: 'Změnit na Sloupcový graf',
                stack: 'Plošný',
                tiled: 'Tile'
            }
        },
        restore: {
            title: 'Obnovit'
        },
        saveAsImage: {
            title: 'Uložit jako obrázek',
            lang: ['Obrázek uložte pravým kliknutím']
        }
    },
    series: {
        typeNames: {
            pie: 'Výsečový graf',
            bar: 'Sloupcový graf',
            line: 'Spojnicový graf',
            scatter: 'XY bodový graf',
            effectScatter: 'Effect XY bodový graf',
            radar: 'Paprskový graf',
            tree: 'Strom',
            treemap: 'Stromová mapa',
            boxplot: 'Krabicový graf',
            candlestick: 'Burzovní graf',
            k: 'K spojnicový graf',
            heatmap: 'Teplotní mapa',
            map: 'Mapa',
            parallel: 'Rovnoběžné souřadnice',
            lines: 'Spojnicový graf',
            graph: 'Graf vztahů',
            sankey: 'Sankeyův diagram',
            funnel: 'Trychtýř (Funnel)',
            gauge: 'Indikátor',
            pictorialBar: 'Obrázkový sloupcový graf',
            themeRiver: 'Theme River Map',
            sunburst: 'Vícevrstvý prstencový graf'
        }
    },
    aria: {
        general: {
            withTitle: 'Toto je graf o "{title}"',
            withoutTitle: 'Toto je graf'
        },
        series: {
            single: {
                prefix: '',
                withName: '{seriesName} s typem {seriesType}.',
                withoutName: ' s typem {seriesType}.'
            },
            multiple: {
                prefix: '. Obsahuje {seriesCount} řad.',
                withName: ' Řada {seriesId} je typu {seriesType} repreyentující {seriesName}.',
                withoutName: ' Řada {seriesId} je typu {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Všechna data jsou: ',
            partialData: 'První {displayCnt} položky jsou: ',
            withName: 'data pro {name} jsou {value}',
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