

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
 * Language: Français.
 */

var localeObj = {
    time: {
        month: [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ],
        monthAbbr: [
            'Janv.', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
            'Juill', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
        ],
        dayOfWeek: [
            'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
        ],
        dayOfWeekAbbr: [
            'Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'
        ]
    },
    legend: {
        selector: {
            all: 'Tout',
            inverse: 'Inverse'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Sélection de boîte',
                polygon: 'Sélection au Lasso',
                lineX: 'Sélectionner horizontalement',
                lineY: 'Sélectionner verticalement',
                keep: 'Garder la sélection',
                clear: 'Effacer la sélection'
            }
        },
        dataView: {
            title: 'Visualisation des données',
            lang: ['Visualisation des données', 'Fermer', 'Rafraîchir']
        },
        dataZoom: {
            title: {
                zoom: 'Zoom',
                back: 'Zoom Reset'
            }
        },
        magicType: {
            title: {
                line: 'Changer à Ligne',
                bar: 'Changer à Histogramme',
                stack: 'Superposition',
                tiled: 'Tuile'
            }
        },
        restore: {
            title: 'Restaurer'
        },
        saveAsImage: {
            title: 'Sauvegarde l\'image',
            lang: ['Clic droit pour sauvegarde L\'image']
        }
    },
    series: {
        typeNames: {
            pie: 'Circulaire',
            bar: 'Histogramme',
            line: 'Linéaire',
            scatter: 'Nuage de points',
            effectScatter: 'Ripple scatter plot',
            radar: 'Radar',
            tree: 'Arborescent',
            treemap: 'Treemap',
            boxplot: 'Boîte à moustaches',
            candlestick: 'Chandelier',
            k: 'Linéaire K',
            heatmap: 'Carte de chaleur',
            map: 'Carte',
            parallel: 'Carte de coordonnées parallèles',
            lines: 'Line graph',
            graph: 'Relations',
            sankey: 'Sankey',
            funnel: 'Entonnoir',
            gauge: 'Jauge',
            pictorialBar: 'Pictorial bar',
            themeRiver: 'Theme River Map',
            sunburst: 'Sunburst'
        }
    },
    aria: {
        general: {
            withTitle: 'Cette carte est pour "{title}"',
            withoutTitle: 'Elle est une carte'
        },
        series: {
            single: {
                prefix: '',
                withName: ' Avec le type de {seriesType} qui s\'appelle {seriesName}.',
                withoutName: ' Avec le type de {seriesType}.'
            },
            multiple: {
                prefix: '. Elle comprend {seriesCount} série.',
                withName: ' La série {seriesId} représente {seriesName} de {seriesType}.',
                withoutName: ' La série {seriesId} est un/une {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Les données sont: ',
            partialData: 'Le premier {displayCnt} items are: ',
            withName: 'Les données pour {name} sont {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};
    echarts.registerLocale('FR', localeObj);
        
});