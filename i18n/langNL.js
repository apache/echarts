

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
 * Language: Dutch.
 */

var localeObj = {
    time: {
        month: [
            'januari', 'februari', 'maart', 'april', 'mei', 'juni',
            'juli', 'augustus', 'september', 'oktober', 'november', 'december'
        ],
        monthAbbr: [
            'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
            'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
        ],
        dayOfWeek: [
            'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'
        ],
        dayOfWeekAbbr: [
            'zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'
        ]
    },
    legend: {
        selector: {
            all: 'Alle',
            inverse: 'Omgekeerd'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Vakselectie',
                polygon: 'Lasso selectie',
                lineX: 'Horizontale selectie',
                lineY: 'Verticale selectie',
                keep: 'Selecties behouden',
                clear: 'Selecties wissen'
            }
        },
        dataView: {
            title: 'Gegevensweergave',
            lang: ['Gegevensweergave', 'Sluiten', 'Vernieuwen']
        },
        dataZoom: {
            title: {
                zoom: 'Zoom',
                back: 'Zoom herstellen'
            }
        },
        magicType: {
            title: {
                line: 'Omzetten naar lijndiagram',
                bar: 'Omzetten naar staafdiagram',
                stack: 'Omzetten naar stapeldiagram',
                tiled: 'Omzetten naar tegeldiagram'
            }
        },
        restore: {
            title: 'Herstellen'
        },
        saveAsImage: {
            title: 'Opslaan als afbeelding',
            lang: ['Klik rechtermuisknop om de afbeelding op te slaan']
        }
    },
    series: {
        typeNames: {
            pie: 'Cirkeldiagram',
            bar: 'Staafdiagram',
            line: 'Lijndiagram',
            scatter: 'Spreidingsdiagram',
            effectScatter: 'Spreidingsdiagram met rimpeleffect',
            radar: 'Radardiagram',
            tree: 'Boomdiagram',
            treemap: 'Boomkaart',
            boxplot: 'Boxplot',
            candlestick: 'Kandelaardiagram',
            k: 'K-lijndiagram',
            heatmap: 'Hittekaart',
            map: 'Kaart',
            parallel: 'Parallele coördinatendiagram',
            lines: 'Lijnendiagram',
            graph: 'Relatiediagram',
            sankey: 'Sankey-diagram',
            funnel: 'Trechterdiagram',
            gauge: 'Graadmeter',
            pictorialBar: 'Staafdiagram met afbeeldingen',
            themeRiver: 'Thematische rivierdiagram',
            sunburst: 'Zonnestraaldiagram',
            custom: 'Aangepast diagram',
            chart: 'Diagram'
        }
    },
    aria: {
        general: {
            withTitle: 'Dit is een diagram over "{title}"',
            withoutTitle: 'Dit is een diagram'
        },
        series: {
            single: {
                prefix: '',
                withName: ' van het type {seriesType} genaamd {seriesName}.',
                withoutName: ' van het type {seriesType}.'
            },
            multiple: {
                prefix: '. Het bestaat uit {seriesCount} series.',
                withName: ' De serie {seriesId} is een {seriesType} met de naam {seriesName}.',
                withoutName: ' De serie {seriesId} is een {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'De gegevens zijn als volgt: ',
            partialData: 'De eerste {displayCnt} items zijn: ',
            withName: 'de gegevens voor {name} zijn {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};

    echarts.registerLocale('NL', localeObj);
        
});