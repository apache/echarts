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
 * Language: Romanian.
 */

 export default {
    time: {
        month: [
            'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
            'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'
        ],
        monthAbbr: [
            'ian.', 'febr.', 'mart.', 'apr.', 'mai', 'iun.',
            'iul.', 'aug.', 'sept.', 'oct.', 'nov.', 'dec.'
        ],
        dayOfWeek: [
            'Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'
        ],
        dayOfWeekAbbr: [
            'du.', 'lu.', 'ma.', 'mi.', 'jo.', 'vi.', 'sâ.'
        ]
    },
    legend: {
        selector: {
            all: 'Toate',
            inverse: 'Inversează'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Selecție dreptunghiulară',
                polygon: 'Selecție lasso',
                lineX: 'Selecție orizontală',
                lineY: 'Selecție verticală',
                keep: 'Păstrează selecția',
                clear: 'Șterge selecția'
            }
        },
        dataView: {
            title: 'Vizualizarea datelor',
            lang: ['Vizualizarea datelor', 'Închide', 'Reîmprospătează']
        },
        dataZoom: {
            title: {
                zoom: 'Zoom',
                back: 'Resetează zoom'
            }
        },
        magicType: {
            title: {
                line: 'Comută la diagramă cu linii',
                bar: 'Comută la diagramă cu bare',
                stack: 'Suprapune',
                tiled: 'Alătură'
            }
        },
        restore: {
            title: 'Resetează'
        },
        saveAsImage: {
            title: 'Salvează ca imagine',
            lang: ['Clic dreapta pentru a salva ca imagine']
        }
    },
    series: {
        typeNames: {
            pie: 'Diagramă radială',
            bar: 'Diagramă cu bare',
            line: 'Diagramă cu linii',
            scatter: 'Diagramă de dispersie',
            effectScatter: 'Diagramă de dispersie stilizată',
            radar: 'Diagramă radar',
            tree: 'Arbore',
            treemap: 'Hartă de arbori',
            boxplot: 'Diagramă boxbare',
            candlestick: 'Diagramă bursieră',
            k: 'Diagramă cu linii K',
            heatmap: 'Hartă termografică',
            map: 'Hartă',
            parallel: 'Hartă de coordonate paralele',
            lines: 'Linii',
            graph: 'Graf',
            sankey: 'Diagramă Sankey',
            funnel: 'Diagramă pâlnie',
            gauge: 'Calibru',
            pictorialBar: 'Diagramă cu bare picturale',
            themeRiver: 'Streamgraph',
            sunburst: 'Diagramă rază de soare'
        }
    },
    aria: {
        general: {
            withTitle: 'Aceasta este o diagrmă despre "{title}"',
            withoutTitle: 'Aceasta este o diagramă'
        },
        series: {
            single: {
                prefix: '',
                withName: ' de tipul {seriesType} denumită {seriesName}.',
                withoutName: ' de tipul {seriesType}.'
            },
            multiple: {
                prefix: '. Este alcătuită din {seriesCount} serii.',
                withName: ' Seria {seriesId} este de tipul {seriesType} și reprezintă {seriesName}.',
                withoutName: ' Seria {seriesId} este de tipul {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Datele sunt: ',
            partialData: 'Primele {displayCnt} elemente sunt: ',
            withName: 'datele pentru {name} sunt {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};
