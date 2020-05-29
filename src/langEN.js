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
 * Language: English.
 */

export default {
    legend: {
        selector: {
            all: 'All',
            inverse: 'Inv'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Box Select',
                polygon: 'Lasso Select',
                lineX: 'Horizontally Select',
                lineY: 'Vertically Select',
                keep: 'Keep Selections',
                clear: 'Clear Selections'
            }
        },
        dataView: {
            title: 'Data View',
            lang: ['Data View', 'Close', 'Refresh']
        },
        dataZoom: {
            title: {
                zoom: 'Zoom',
                back: 'Zoom Reset'
            }
        },
        magicType: {
            title: {
                line: 'Switch to Line Chart',
                bar: 'Switch to Bar Chart',
                stack: 'Stack',
                tiled: 'Tile'
            }
        },
        restore: {
            title: 'Restore'
        },
        saveAsImage: {
            title: 'Save as Image',
            lang: ['Right Click to Save Image']
        }
    },
    series: {
        typeNames: {
            pie: 'Pie chart',
            bar: 'Bar chart',
            line: 'Line chart',
            scatter: 'Scatter plot',
            effectScatter: 'Ripple scatter plot',
            radar: 'Radar chart',
            tree: 'Tree',
            treemap: 'Treemap',
            boxplot: 'Boxplot',
            candlestick: 'Candlestick',
            k: 'K line chart',
            heatmap: 'Heat map',
            map: 'Map',
            parallel: 'Parallel coordinate map',
            lines: 'Line graph',
            graph: 'Relationship graph',
            sankey: 'Sankey diagram',
            funnel: 'Funnel chart',
            gauge: 'Guage',
            pictorialBar: 'Pictorial bar',
            themeRiver: 'Theme River Map',
            sunburst: 'Sunburst'
        }
    },
    aria: {
        general: {
            withTitle: 'This is a chart about "{title}"',
            withoutTitle: 'This is a chart'
        },
        series: {
            single: {
                prefix: '',
                withName: ' with type {seriesType} named {seriesName}.',
                withoutName: ' with type {seriesType}.'
            },
            multiple: {
                prefix: '. It consists of {seriesCount} series count.',
                withName: ' The {seriesId} series is a {seriesType} representing {seriesName}.',
                withoutName: ' The {seriesId} series is a {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'The data is as follows: ',
            partialData: 'The first {displayCnt} items are: ',
            withName: 'the data for {name} is {value}',
            withoutName: '{value}',
            separator: {
                middle: ',',
                end: '.'
            }
        }
    }
};
