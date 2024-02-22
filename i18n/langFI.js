

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


var localeObj = {
    time: {
        month: [
            'tammikuuta', 'helmikuuta', 'maaliskuuta', 'huhtikuuta', 'toukokuuta', 'kesäkuuta',
            'heinäkuuta', 'elokuuta', 'syyskuuta', 'lokakuuta', 'marraskuuta', 'joulukuuta'
        ],
        monthAbbr: [
            'tammik', 'helmik', 'maalisk', 'huhtik', 'toukok', 'kesäk',
            'heinäk', 'elok', 'syysk', 'lokak', 'marrask', 'jouluk'
        ],
        dayOfWeek: [
            'sunnuntaina', 'maanantaina', 'tiistaina', 'keskiviikkona', 'torstaina', 'perjantaina', 'lauantaina'
        ],
        dayOfWeekAbbr: [
            'su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'
        ]
    },
    legend: {
        selector: {
            all: 'Kaikki',
            inverse: 'Käänteinen'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Laatikko valinta',
                polygon: 'Lasso valinta',
                lineX: 'Vaakataso valinta',
                lineY: 'Pysty valinta',
                keep: 'Pidä valinta',
                clear: 'Poista valinta'
            }
        },
        dataView: {
            title: 'Data näkymä',
            lang: ['Data näkymä', 'Sulje', 'Päivitä']
        },
        dataZoom: {
            title: {
                zoom: 'Zoomaa',
                back: 'Zoomin nollaus'
            }
        },
        magicType: {
            title: {
                line: 'Vaihda Viivakaavioon',
                bar: 'Vaihda palkkikaavioon',
                stack: 'Pinoa',
                tiled: 'Erottele'
            }
        },
        restore: {
            title: 'Palauta'
        },
        saveAsImage: {
            title: 'Tallenna kuvana',
            lang: ['Paina oikeaa hiirennappia tallentaaksesi kuva']
        }
    },
    series: {
        typeNames: {
            pie: 'Ympyrädiagrammi',
            bar: 'Pylväsdiagrammi',
            line: 'Viivakaavio',
            scatter: 'Pisteplot',
            effectScatter: 'Ripple-pisteplot',
            radar: 'Sädekaavio',
            tree: 'Puu',
            treemap: 'Tilastoaluekartta',
            boxplot: 'Viivadiagrammi',
            candlestick: 'Kynttiläkaavio',
            k: 'K-linjakaavio',
            heatmap: 'Lämpökartta',
            map: 'Kartta',
            parallel: 'Rinnakkaiskoordinaattikartta',
            lines: 'Viivakuvaaja',
            graph: 'Suhdekuvaaja',
            sankey: 'Sankey-kaavio',
            funnel: 'Suppilokaavio',
            gauge: 'Mittari',
            pictorialBar: 'Kuvallinen pylväs',
            themeRiver: 'Teemajokikartta',
            sunburst: 'Auringonkehä',
            custom: 'Mukautettu kaavio',
            chart: 'Kaavio'
        }
    },
    aria: {
        general: {
            withTitle: 'Tämä on kaavio “{title}”',
            withoutTitle: 'Tämä on kaavio'
        },
        series: {
            single: {
                prefix: '',
                withName: ' tyyppiä {seriesType} nimeltään {seriesName}.',
                withoutName: ' tyyppiä {seriesType}.'
            },
            multiple: {
                prefix: '. Se koostuu {seriesCount} sarjasta.',
                withName: ' Sarja {seriesId} on {seriesType}, joka edustaa {seriesName}.',
                withoutName: ' Sarja {seriesId} on {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Tiedot ovat seuraavat: ',
            partialData: 'Ensimmäiset {displayCnt} kohtaa ovat: ',
            withName: 'tiedot nimelle {name} ovat {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};

    echarts.registerLocale('FI', localeObj);
        
});