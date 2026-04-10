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
 * Language: Latvian.
 */

export default {
    time: {
        month: [
            'janvāris', 'februāris', 'marts', 'aprīlis', 'maijs', 'jūnijs',
            'jūlijs', 'augusts', 'septembris', 'oktobris', 'novembris', 'decembris'
        ],
        monthAbbr: [
            'janv.', 'febr.', 'marts', 'apr.', 'maijs', 'jūn.',
            'jūl.', 'aug.', 'sept.', 'okt.', 'nov.', 'dec.'
        ],
        dayOfWeek: [
            'svētdiena', 'pirmdiena', 'otrdiena', 'trešdiena', 'ceturtdiena', 'piektdiena', 'sestdiena'
        ],
        dayOfWeekAbbr: [
            'Sv', 'Pr', 'Ot', 'Tr', 'Ce', 'Pk', 'Se'
        ]
    },
    legend: {
        selector: {
            all: 'Viss',
            inverse: 'Apvērst'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Taisnstūra atlase',
                polygon: 'Laso atlase',
                lineX: 'Horizontāla atlase',
                lineY: 'Vertikāla atlase',
                keep: 'Paturēt atlasi',
                clear: 'Notīrīt atlasi'
            }
        },
        dataView: {
            title: 'Datu skats',
            lang: ['Datu skats', 'Aizvērt', 'Atsvaidzināt']
        },
        dataZoom: {
            title: {
                zoom: 'Tālummaiņa',
                back: 'Atiestatīt tālummaiņu'
            }
        },
        magicType: {
            title: {
                line: 'Pārslēgt uz līniju diagrammu',
                bar: 'Pārslēgt uz stabiņu diagrammu',
                stack: 'Sakraut',
                tiled: 'Atdalīt'
            }
        },
        restore: {
            title: 'Atjaunot'
        },
        saveAsImage: {
            title: 'Saglabāt kā attēlu',
            lang: ['Ar labo klikšķi saglabāt attēlu']
        }
    },
    series: {
        typeNames: {
            pie: 'Sektoru diagramma',
            bar: 'Stabiņu diagramma',
            line: 'Līniju diagramma',
            scatter: 'Izkliedes diagramma',
            effectScatter: 'Izkliedes diagramma ar efektu',
            radar: 'Radara diagramma',
            tree: 'Koka diagramma',
            treemap: 'Koku karte',
            boxplot: 'Kastīšu diagramma',
            candlestick: 'Svečturu diagramma',
            k: 'K līniju diagramma',
            heatmap: 'Siltumkarte',
            map: 'Karte',
            parallel: 'Paralēlo koordinātu diagramma',
            lines: 'Līniju grafiks',
            graph: 'Grafs',
            sankey: 'Sankija diagramma',
            funnel: 'Piltuves diagramma',
            gauge: 'Rādītājs',
            pictorialBar: 'Piktogrammu stabiņi',
            themeRiver: 'Tematiskās plūsmas diagramma',
            sunburst: 'Saules staru diagramma',
            custom: 'Pielāgota diagramma',
            chart: 'Diagramma'
        }
    },
    aria: {
        general: {
            withTitle: 'Šī ir diagramma par "{title}"',
            withoutTitle: 'Šī ir diagramma'
        },
        series: {
            single: {
                prefix: '',
                withName: ' ar datu sēriju ar nosaukumu {seriesName} ({seriesType}).',
                withoutName: ' ar datu sēriju ({seriesType}).'
            },
            multiple: {
                prefix: '. Tajā ir {seriesCount} datu sērijas.',
                withName: ' Sērija {seriesId}: {seriesName} ({seriesType}).',
                withoutName: ' Sērija {seriesId}: {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Visi dati ir šādi: ',
            partialData: 'Pirmie {displayCnt} elementi ir: ',
            withName: '{name}: {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};
