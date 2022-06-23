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
                all: 'Tutto',
                inverse: 'Inv'
            }
        },
        toolbox: {
            brush: {
                title: {
                    rect: 'Selezione con box',
                    polygon: 'Selezione Lazo',
                    lineX: 'Selezione Orizzontale',
                    lineY: 'Selezione Verticale',
                    keep: 'Mantieni Selezioni',
                    clear: 'Pulisci Selezioni'
                }
            },
            dataView: {
                title: 'Vista Dati',
                lang: ['Vista Dati', 'Chiudi', 'Aggiorna']
            },
            dataZoom: {
                title: {
                    zoom: 'Zoom',
                    back: 'Zoom Reset'
                }
            },
            magicType: {
                title: {
                    line: 'Cambia a Grafico a Linea',
                    bar: 'Cambia a Grafico a Barra',
                    stack: 'Impila',
                    tiled: 'Piastrella'
                }
            },
            restore: {
                title: 'Ripristina'
            },
            saveAsImage: {
                title: 'Salva come Immagine',
                lang: ['Clic Destro per Salvare Immaginare']
            }
        },
        series: {
            typeNames: {
                pie: 'Grafico Torta',
                bar: 'Grafico Barre',
                line: 'Grafico a Linea',
                scatter: 'Grafico a Dispersione',
                effectScatter: 'Grafico a Dispersione Ondulato',
                radar: 'Grafico a Radar',
                tree: 'Albero',
                treemap: 'Treemap',
                boxplot: 'Boxplot',
                candlestick: 'Candlestick',
                k: 'Grafico a Linee K',
                heatmap: 'Mappa di Intensità',
                map: 'Mappa',
                parallel: 'Mappa a coordinate parallele',
                lines: 'Grafuci a Linee',
                graph: 'Grafo di Relazioni',
                sankey: 'Diagramma Sankey',
                funnel: 'Grafico Funnel',
                gauge: 'Gauge',
                pictorialBar: 'Barra pittorica',
                themeRiver: 'Mappa Theme River',
                sunburst: 'Sunburst'
            }
        },
        aria: {
            general: {
                withTitle: 'Il titolo di questo grafico è "{title}"',
                withoutTitle: 'Questo è un grafico'
            },
            series: {
                single: {
                    prefix: '',
                    withName: ' di tipo {seriesType} dal nome {seriesName}.',
                    withoutName: ' di tipo {seriesType}.'
                },
                multiple: {
                    prefix: '. È composto da {seriesCount} serie.',
                    withName: ' La serie {seriesId} è di tipo {seriesType} ed ha nome {seriesName}.',
                    withoutName: ' La serie {seriesId} è di tipo {seriesType}.',
                    separator: {
                        middle: '',
                        end: ''
                    }
                }
            },
            data: {
                allData: 'I dati sono i seguenti:',
                partialData: 'Il primi {displayCnt} sono: ',
                withName: 'il valore per {name} è {value}',
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