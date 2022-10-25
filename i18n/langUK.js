

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
 * Language: Ukrainian.
 */

var localeObj = {
    time: {
        month: [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ],
        monthAbbr: [
            'Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер',
            'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'
        ],
        dayOfWeek: [
            'Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'
        ],
        dayOfWeekAbbr: [
            'нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'
        ]
    },
    legend: {
        selector: {
            all: 'Все',
            inverse: 'Обернути'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Выділити область',
                polygon: 'Інструмент «Ласо»',
                lineX: 'Горизонтальне виділення',
                lineY: 'Вертикальне виділення',
                keep: 'Залишити обране',
                clear: 'Очистити обране'
            }
        },
        dataView: {
            title: 'Дані',
            lang: ['Дані', 'Закрити', 'Оновити']
        },
        dataZoom: {
            title: {
                zoom: 'Збільшити',
                back: 'Скасувати збільшення'
            }
        },
        magicType: {
            title: {
                line: 'Переключитися на лінійний графік',
                bar: 'Переключитися на стовпчикову діаграму',
                stack: 'Стопка',
                tiled: 'Плитка'
            }
        },
        restore: {
            title: 'Відновити'
        },
        saveAsImage: {
            title: 'Зберегти зображення',
            lang: ['Правий клік, щоб зберегти зображення']
        }
    },
    series: {
        typeNames: {
            pie: 'Кругова діаграма',
            bar: 'Стовпчикова діаграма',
            line: 'Лінійний графік',
            scatter: 'Точкова діаграма',
            effectScatter: 'Точкова діаграма з хвилями',
            radar: 'Пелюсткова діаграма',
            tree: 'Дерево',
            treemap: 'Пласке дерево',
            boxplot: 'Ящик з вусами',
            candlestick: 'Свічний графік',
            k: 'Графік К-ліній',
            heatmap: 'Теплова мапа',
            map: 'Мапа',
            parallel: 'Діаграма паралельних координат',
            lines: 'Лінійний граф',
            graph: 'Граф отношений',
            sankey: 'Діаграма Санкей',
            funnel: 'Воронкообразна діаграма',
            gauge: 'Шкала',
            pictorialBar: 'Стовпчик-картинка',
            themeRiver: 'Тематична ріка',
            sunburst: 'Сонячне проміння'
        }
    },
    aria: {
        general: {
            withTitle: 'Це графік, що відрображує "{title}"',
            withoutTitle: 'Це графік'
        },
        series: {
            single: {
                prefix: '',
                withName: ' з типом {seriesType} та іменем {seriesName}.',
                withoutName: ' з типом {seriesType}.'
            },
            multiple: {
                prefix: '. Він складається з {seriesCount} серій.',
                withName:
                    ' Серія {seriesId} має тип {seriesType} та відображає {seriesName}.',
                withoutName: ' Серія {seriesId} має тип {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Дані такі: ',
            partialData: 'Перші {displayCnt} елементів: ',
            withName: 'значення для {name} — {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};

    echarts.registerLocale('UK', localeObj);
        
});