

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
 * Language: Portuguese (Brazil).
 */

var localeObj = {
    time: {
        month: [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ],
        monthAbbr: [
            'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ],
        dayOfWeek: [
            'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
'Quinta-feira', 'Sexta-feira', 'Sábado'
        ],
        dayOfWeekAbbr: [
            'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'
        ]
    },
    legend: {
        selector: {
            all: 'Todas',
            inverse: 'Inv'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Seleção retangular',
                polygon: 'Seleção em laço',
                lineX: 'Selecionar horizontalmente',
                lineY: 'Selecionar verticalmente',
                keep: 'Manter seleções',
                clear: 'Limpar seleções'
            }
        },
        dataView: {
            title: 'Exibição de dados',
            lang: ['Exibição de dados', 'Fechar', 'Atualizar']
        },
        dataZoom: {
            title: {
                zoom: 'Zoom',
                back: 'Restaurar Zoom'
            }
        },
        magicType: {
            title: {
                line: 'Trocar para gráfico de linhas',
                bar: 'Trocar para gráfico de barras',
                stack: 'Empilhar',
                tiled: 'Tile'
            }
        },
        restore: {
            title: 'Restore'
        },
        saveAsImage: {
            title: 'Salvar como imagem',
            lang: ['Clique com o botão direito para salvar imagem']
        }
    },
    series: {
        typeNames: {
            pie: 'Gráfico de pizza',
            bar: 'Gráfico de barras',
            line: 'Gráfico de linhas',
            scatter: 'Gráfico de dispersão',
            effectScatter: 'Gráfico de dispersão ondulado',
            radar: 'Gráfico radar',
            tree: 'Árvore',
            treemap: 'Treemap',
            boxplot: 'Boxplot',
            candlestick: 'Candlestick',
            k: 'Gráfico K line',
            heatmap: 'Mapa de calor',
            map: 'Mapa',
            parallel: 'Coordenadas paralelas',
            lines: 'Gráfico de linhas',
            graph: 'Relationship graph',
            sankey: 'Gráfico Sankey',
            funnel: 'Gráfico de funil',
            gauge: 'Gauge',
            pictorialBar: 'Pictorial bar',
            themeRiver: 'Theme River Map',
            sunburst: 'Sunburst'
        }
    },
    aria: {
        general: {
            withTitle: 'Este é um gráfico entitulado "{title}"',
            withoutTitle: 'Este é um gráfico'
        },
        series: {
            single: {
                prefix: '',
                withName: ' do tipo {seriesType} nomeada/nomeado como {seriesName}.',
                withoutName: ' do tipo {seriesType}.'
            },
            multiple: {
                prefix: '. Consiste de {seriesCount} séries.',
                withName: ' A {seriesId} série é um/uma {seriesType} representando {seriesName}.',
                withoutName: ' A {seriesId} series é um/uma {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Os dados são: ',
            partialData: 'As primeiros {displayCnt} itens são: ',
            withName: 'os dados para {name} são {value}',
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