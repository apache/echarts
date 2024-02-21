

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
 * Language: Italian.
 */

var localeObj = {
    time: {
        month: [
            'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
        ],
        monthAbbr: [
            'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
            'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
        ],
        dayOfWeek: [
            'Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'
        ],
        dayOfWeekAbbr: [
            'Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'
        ]
    },
    legend: {
        selector: {
            all: 'Tutti',
            inverse: 'Inverso'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Selezione rettangolare',
                polygon: 'Selezione lazo',
                lineX: 'Selezione orizzontale',
                lineY: 'Selezione verticale',
                keep: 'Mantieni selezione',
                clear: 'Rimuovi selezione'
            }
        },
        dataView: {
            title: 'Visualizzazione dati',
            lang: ['Visualizzazione dati', 'Chiudi', 'Aggiorna']
        },
        dataZoom: {
            title: {
                zoom: 'Zoom',
                back: 'Resetta zoom'
            }
        },
        magicType: {
            title: {
                line: 'Passa al grafico a linee',
                bar: 'Passa al grafico a barre',
                stack: 'Pila',
                tiled: 'Piastrella'
            }
        },
        restore: {
            title: 'Ripristina'
        },
        saveAsImage: {
            title: 'Salva come immagine',
            lang: ['Tasto destro per salvare l\'immagine']
        }
    },
    series: {
        typeNames: {
            pie: 'Grafico a torta',
            bar: 'Grafico a barre',
            line: 'Grafico a linee',
            scatter: 'Grafico a dispersione',
            effectScatter: 'Ripple scatter plot',
            radar: 'Grafico radar',
            tree: 'Albero',
            treemap: 'Treemap',
            boxplot: 'Diagramma a scatola e baffi',
            candlestick: 'Candlestick',
            k: 'K line chart',
            heatmap: 'Mappa di calore',
            map: 'Mappa',
            parallel: 'Grafico a coordinate parallele',
            lines: 'Grafico a linee',
            graph: 'Diagramma delle relazioni',
            sankey: 'Diagramma di Sankey',
            funnel: 'Grafico a imbuto',
            gauge: 'Gauge',
            pictorialBar: 'Pictorial bar',
            themeRiver: 'Theme River Map',
            sunburst: 'Radiale',
            custom: 'Egyedi diagram',
            chart: 'Grafico'
        }
    },
    aria: {
        general: {
            withTitle: 'Questo è un grafico su "{title}"',
            withoutTitle: 'Questo è un grafico'
        },
        series: {
            single: {
                prefix: '',
                withName: ' con il tipo {seriesType} denominato {seriesName}.',
                withoutName: ' con il tipo {seriesType}.'
            },
            multiple: {
                prefix: '. È composto da {seriesCount} serie.',
                withName: ' La {seriesId} serie è un {seriesType} denominata {seriesName}.',
                withoutName: ' la {seriesId} serie è un {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'I dati sono come segue: ',
            partialData: 'I primi {displayCnt} elementi sono: ',
            withName: 'il dato per {name} è {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};

    echarts.registerLocale('IT', localeObj);
        
});