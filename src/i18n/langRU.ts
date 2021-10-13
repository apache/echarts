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
 * Language: Russian.
 */

export default {
    time: {
        month: [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ],
        monthAbbr: [
            'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
            'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
        ],
        dayOfWeek: [
            'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'
        ],
        dayOfWeekAbbr: [
            'вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'
        ]
    },
    legend: {
        selector: {
            all: 'Всё',
            inverse: 'Обратить'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Выделить область',
                polygon: 'Инструмент «Лассо»',
                lineX: 'Горизонтальное выделение',
                lineY: 'Вертикальное выделение',
                keep: 'Оставить выбранное',
                clear: 'Очистить выбранное'
            }
        },
        dataView: {
            title: 'Данные',
            lang: ['Данные', 'Закрыть', 'Обновить']
        },
        dataZoom: {
            title: {
                zoom: 'Увеличить',
                back: 'Сбросить увеличение'
            }
        },
        magicType: {
            title: {
                line: 'Переключиться на линейный график',
                bar: 'Переключиться на столбчатую диаграмму',
                stack: 'Стопка',
                tiled: 'Плитка'
            }
        },
        restore: {
            title: 'Восстановить'
        },
        saveAsImage: {
            title: 'Сохранить картинку',
            lang: ['Правый клик, чтобы сохранить картинку']
        }
    },
    series: {
        typeNames: {
            pie: 'Круговая диаграмма',
            bar: 'Столбчатая диаграмма',
            line: 'Линейный график',
            scatter: 'Точечная диаграмма',
            effectScatter: 'Точечная диаграмма с волнами',
            radar: 'Лепестковая диаграмма',
            tree: 'Дерево',
            treemap: 'Плоское дерево',
            boxplot: 'Ящик с усами',
            candlestick: 'Свечной график',
            k: 'График К-линий',
            heatmap: 'Тепловая карта',
            map: 'Карта',
            parallel: 'Диаграмма параллельных координат',
            lines: 'Линейный граф',
            graph: 'Граф отношений',
            sankey: 'Диаграмма Санкей',
            funnel: 'Воронкообразная диаграмма',
            gauge: 'Шкала',
            pictorialBar: 'Столбец-картинка',
            themeRiver: 'Тематическая река',
            sunburst: 'Солнечные лучи'
        }
    },
    aria: {
        general: {
            withTitle: 'Это график, показывающий "{title}"',
            withoutTitle: 'Это график'
        },
        series: {
            single: {
                prefix: '',
                withName: ' с типом {seriesType} и именем {seriesName}.',
                withoutName: ' с типом {seriesType}.'
            },
            multiple: {
                prefix: '. Он состоит из {seriesCount} серий.',
                withName:
                    ' Серия {seriesId} имеет тип {seriesType} и показывает {seriesName}.',
                withoutName: ' Серия {seriesId} имеет тип {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Данные таковы: ',
            partialData: 'Первые {displayCnt} элементов: ',
            withName: 'значение для {name} — {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};
