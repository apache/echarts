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

var __AXIS_LAYOUT_0_TEST_CASE_LIST = [

    {
        text: 'xy pair count 1, nameLocation "center"/moveOverlap, contain "all"',
        value: null
    },

    {
        text: 'xy pair count 1, nameLocation "center"/moveOverlap, use legacy containLabel',
        value:
        {
            version: '1.0.0',
            startTime: 1745256914204,
            operations: [
                {id: '__inputs|grid.containLabel(deprecated):|', op: 'select', args: [1]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [-3]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [-2]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [0]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [3]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [8]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [12]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [17]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [22]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [27]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [32]},
                {id: '__inputs|grid.left:|', op: 'slide', args: [40]},
                {id: '__inputs|grid.bottom:|', op: 'slide', args: [18]},
                {id: '__inputs|grid.bottom:|', op: 'slide', args: [20]},
                {id: '__inputs|grid.bottom:|', op: 'slide', args: [24]},
                {id: '__inputs|grid.bottom:|', op: 'slide', args: [29]},
                {id: '__inputs|grid.bottom:|', op: 'slide', args: [35]},
                {id: '__inputs|grid.bottom:|', op: 'slide', args: [41]},
                {id: '__inputs|grid.bottom:|', op: 'slide', args: [46]},
                {id: '__inputs|grid.bottom:|', op: 'slide', args: [52]},
                {id: '__inputs|grid.bottom:|', op: 'slide', args: [56]},
                {id: '__inputs|grid.bottom:|', op: 'slide', args: [60]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [33]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [36]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [44]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [55]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [68]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [76]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [81]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [85]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [86]}
            ],
            endTime: 1745256937454
        }
    },

    {
        text: 'xy pair count 1, nameLocation "center"/moveOverlap, x nameGap -12, contain "all"',
        value:
        {
            version: '1.0.0',
            startTime: 1745243450231,
            operations: [
                {id: '__inputs|xAxis[0].nameGap:|', op: 'select', args: [2]},
                {id: '__inputs|xAxis[0].nameGap:|', op: 'slide', args: [10]},
                {id: '__inputs|xAxis[0].nameGap:|', op: 'slide', args: [-10]},
                {id: '__inputs|xAxis[0].nameGap:|', op: 'slide', args: [-11]},
                {id: '__inputs|xAxis[0].nameGap:|', op: 'decrease'}
            ],
            endTime: 1745243469250
        }
    },

    {
        text: 'xy pair count 1, nameLocation "end"/moveOverlap, others default, contain "all"',
        value:
        {
            version: '1.0.0',
            startTime: 1745243541991,
            operations: [
                {id: '__inputs|xAxis[0].nameLocation:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[0].nameLocation:|', op: 'select', args: [1]}
            ],
            endTime: 1745243547118
        }
    },

    {
        text: 'xy pair count 1, plain textStyle, nameLocation "end"/moveOverlap, contain "all"',
        value:
        {
            version: '1.0.0',
            startTime: 1745248441383,
            operations: [
                {id: '__inputs|xAxis[0].nameLocation:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[0].nameLocation:|', op: 'select', args: [1]},
                {id: '__inputs|xAxis[0] name style:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[0] name style:|', op: 'select', args: [1]},
                {id: '__inputs|x/yAxis[0] label style:|', op: 'select', args: [1]},
                {id: '__inputs|xAxis[0].axisLabel.margin:|', op: 'select', args: [3]},
                {id: '__inputs|xAxis[0].axisLabel.margin:|', op: 'slide', args: [11]},
                {id: '__inputs|xAxis[0].axisLabel.margin:|', op: 'slide', args: [18]},
                {id: '__inputs|xAxis[0].axisLabel.margin:|', op: 'slide', args: [29]},
                {id: '__inputs|xAxis[0].axisLabel.margin:|', op: 'decrease'},
                {id: '__inputs|xAxis[0].axisLabel.margin:|', op: 'increase'}
            ],
            endTime: 1745248476300
        }
    },

    {
        text: 'xy pair count 2, nameLocation "end"/moveOverlap, contain "all"',
        value:
        {
            version: '1.0.0',
            startTime: 1745256611830,
            operations: [
                {id: '__inputs|x/yAxis pair count|', op: 'select', args: [1]},
                {id: '__inputs|xAxis[0].nameLocation:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[0].nameLocation:|', op: 'select', args: [1]}
            ],
            endTime: 1745256636662
        }
    },

    {
        text: 'xy pair count 1, inverse, nameLocation "end"/moveOverlap, contain "all"',
        value:
        {
            version: '1.0.0',
            startTime: 1745656228136,
            operations: [
                {id: '__inputs|xAxis[0].inverse:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[0].inverse:|', op: 'select', args: [1]},
                {id: '__inputs|xAxis[0].nameLocation:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[0].nameLocation:|', op: 'select', args: [1]}
            ],
            endTime: 1745656236915
        }
    },

    {
        text: 'xy pair count 3, nameLocation "center"/moveOverlap, contain "all"',
        value:
        {
            version: '1.0.0',
            startTime: 1745832392944,
            operations: [
                {id: '__inputs|x/yAxis pair count|', op: 'select', args: [2]},
                {id: '__inputs|inputs below control xyAxis pair index:|', op: 'select', args: [2]},
                {id: '__inputs|yAxis[2].offset:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[2].offset:|', op: 'slide', args: [-43]},
                {id: '__inputs|yAxis[2].offset:|', op: 'slide', args: [-1]},
                {id: '__inputs|yAxis[2].offset:|', op: 'slide', args: [2]},
                {id: '__inputs|yAxis[2].offset:|', op: 'slide', args: [136]},
                {id: '__inputs|yAxis[2].offset:|', op: 'slide', args: [134]},
                {id: '__inputs|xAxis[2].offset:|', op: 'select', args: [1]},
                {id: '__inputs|xAxis[2].offset:|', op: 'slide', args: [-12]},
                {id: '__inputs|xAxis[2].offset:|', op: 'slide', args: [3]},
                {id: '__inputs|xAxis[2].offset:|', op: 'slide', args: [47]}
            ],
            endTime: 1745833795547
        }
    },

    {
        text: 'xy pair count 3, nameLocation "start/end"/moveOverlap, contain "all"',
        value:
        {
            version: '1.0.0',
            startTime: 1745834106064,
            operations: [
                {id: '__inputs|x/yAxis pair count|', op: 'select', args: [2]},
                {id: '__inputs|inputs below control xyAxis pair index:|', op: 'select', args: [2]},
                {id: '__inputs|yAxis[2].offset:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[2].offset:|', op: 'slide', args: [-4]},
                {id: '__inputs|yAxis[2].offset:|', op: 'slide', args: [106]},
                {id: '__inputs|yAxis[2].offset:|', op: 'slide', args: [105]},
                {id: '__inputs|xAxis[2].nameLocation:|', op: 'select', args: [2]},
                {id: '__inputs|xAxis[2].nameLocation:|', op: 'select', args: [0]},
                {id: '__inputs|yAxis[2].nameLocation:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[2].nameLocation:|', op: 'select', args: [2]},
                {id: '__inputs|inputs below control xyAxis pair index:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[1].nameLocation:|', op: 'select', args: [2]},
                {id: '__inputs|xAxis[1].offset:|', op: 'select', args: [1]},
                {id: '__inputs|xAxis[1].offset:|', op: 'slide', args: [-15]},
                {id: '__inputs|xAxis[1].offset:|', op: 'slide', args: [-4]},
                {id: '__inputs|xAxis[1].offset:|', op: 'slide', args: [55]},
                {id: '__inputs|xAxis[1].offset:|', op: 'slide', args: [54]},
                {id: '__inputs|xAxis[1].nameLocation:|', op: 'select', args: [1]},
                {id: '__inputs|inputs below control xyAxis pair index:|', op: 'select', args: [2]},
                {id: '__inputs|xAxis[2].nameLocation:|', op: 'select', args: [1]},
                {id: '__inputs|inputs below control xyAxis pair index:|', op: 'select', args: [1]},
                {id: '__inputs|inputs below control xyAxis pair index:|', op: 'select', args: [2]},
                {id: '__inputs|xAxis[2].offset:|', op: 'select', args: [1]},
                {id: '__inputs|xAxis[2].offset:|', op: 'slide', args: [13]},
                {id: '__inputs|xAxis[2].offset:|', op: 'slide', args: [19]}
            ],
            endTime: 1745834258795
        }
    },

    {
        text: 'xy pair count 1, y-rotate, nameLocation "center"/moveOverlap, contain "all"',
        value: {
            version: '1.0.0',
            startTime: 1750551269965,
            operations: [
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'slide', args: [1]},
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'slide', args: [-1]},
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'slide', args: [-89]},
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'decrease'}
            ],
            endTime: 1750551287843
        }
    },
    {
        text: 'xy pair count 1, x/y-rotate, hideOverlap, nameLocation "center"/moveOverlap, contain "all"',
        value:{
            version: '1.0.0',
            startTime: 1750551939059,
            operations: [
                {id: '__inputs|xAxis[0].axisLabel.rotate:|', op: 'select', args: [1]},
                {id: '__inputs|xAxis[0].axisLabel.rotate:|', op: 'slide', args: [-2]},
                {id: '__inputs|xAxis[0].axisLabel.rotate:|', op: 'slide', args: [0]},
                {id: '__inputs|xAxis[0].axisLabel.rotate:|', op: 'slide', args: [6]},
                {id: '__inputs|xAxis[0].axisLabel.rotate:|', op: 'slide', args: [70]},
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'slide', args: [-21]},
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'slide', args: [-85]},
                {id: '__inputs|x/yAxis[0].axisLabel.hideOverlap:|', op: 'select', args: [1]}
            ],
            endTime: 1750551959727
        }
    },
    {
        text: 'xy pair count 1, x/y-rotate, hideOverlap, nameLocation "center"/moveOverlap, contain "all", small outerBounds',
        value:{
            version: '1.0.0',
            startTime: 1750551939059,
            operations: [
                {id: '__inputs|xAxis[0].axisLabel.rotate:|', op: 'select', args: [1]},
                {id: '__inputs|xAxis[0].axisLabel.rotate:|', op: 'slide', args: [-2]},
                {id: '__inputs|xAxis[0].axisLabel.rotate:|', op: 'slide', args: [0]},
                {id: '__inputs|xAxis[0].axisLabel.rotate:|', op: 'slide', args: [6]},
                {id: '__inputs|xAxis[0].axisLabel.rotate:|', op: 'slide', args: [70]},
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'select', args: [1]},
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'slide', args: [-21]},
                {id: '__inputs|yAxis[0].axisLabel.rotate:|', op: 'slide', args: [-85]},
                {id: '__inputs|x/yAxis[0].axisLabel.hideOverlap:|', op: 'select', args: [1]},
                {id: '__inputs|grid.outerBounds.right:|', op: 'slide', args: [220]},
                {id: '__inputs|grid.outerBounds.left:|', op: 'slide', args: [50]},
                {id: '__inputs|grid.outerBounds.top:|', op: 'slide', args: [100]},
                {id: '__inputs|grid.outerBounds.bottom:|', op: 'slide', args: [50]},
            ],
            endTime: 1750551959727
        }
    },

    {
        text: 'second outermost label contribute the bounding edge',
        value: {
            version: '1.0.0',
            startTime: 1750634878205,
            operations: [
                {id: '__inputs|grid.right:|', op: 'slide', args: [42]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [48]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [62]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [77]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [92]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [106]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [122]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [140]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [156]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [173]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [189]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [203]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [216]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [228]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [239]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [248]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [256]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [264]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [269]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [273]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [281]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [289]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [296]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [303]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [309]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [315]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [322]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [326]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [330]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [333]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [336]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [340]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [344]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [348]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [352]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [355]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [359]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [364]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [369]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [375]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [379]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [382]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [385]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [387]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [390]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [395]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [401]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [407]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [413]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [418]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [421]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [426]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [431]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [435]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [442]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [447]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [452]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [456]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [459]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [463]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [468]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [471]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [474]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [478]}
            ],
            endTime: 1750634893451
        }
    },

    {
        text: 'category x axis, narrow size, axisLabel.interval 0, nameLocation "center"/moveOverlap, contain "all"',
        value:
        {
            version: '1.0.0',
            startTime: 1750636323753,
            operations: [
                {id: '__inputs|xAxis.type:|', op: 'select', args: [1]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [-26]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [-16]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [9]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [387]},
                {id: '__inputs|grid.outerBounds.right:|', op: 'slide', args: [424]},
                {id: '__inputs|xAxis[0].boundaryGap:|', op: 'select', args: [1]},
                {id: '__inputs|x/yAxis[0].axisLabel.interval:|', op: 'select', args: [2]}
            ],
            endTime: 1750636356138
        }
    },

    {
        text: 'category x axis, narrow size, axisLabel.interval 0, nameLocation "end"/moveOverlap, contain "all"',
        value:
        {
            version: '1.0.0',
            startTime: 1750636323753,
            operations: [
                {id: '__inputs|xAxis.type:|', op: 'select', args: [1]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [-26]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [-16]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [9]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [387]},
                {id: '__inputs|grid.outerBounds.right:|', op: 'slide', args: [424]},
                {id: '__inputs|xAxis[0].boundaryGap:|', op: 'select', args: [1]},
                {id: '__inputs|x/yAxis[0].axisLabel.interval:|', op: 'select', args: [2]},
                {id: '__inputs|xAxis[0].nameLocation:|', op: 'select', args: [1]},
            ],
            endTime: 1750636356138
        }
    },

    {
        text: 'category x axis, narrow size, axisLabel.interval 1, nameLocation "center"/moveOverlap, contain "all", yAxis rotate',
        value:
        {
            version: '1.0.0',
            startTime: 1750636419809,
            operations: [
                {id: '__inputs|xAxis.type:|', op: 'select', args: [1]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [27]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [56]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [111]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [163]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [209]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [242]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [263]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [274]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [279]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [283]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [286]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [289]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [292]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [296]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [298]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [300]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [304]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [310]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [318]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [328]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [341]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [354]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [366]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [374]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [380]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [385]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [389]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [391]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [396]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [403]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [411]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [417]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [421]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [424]},
                {id: '__inputs|grid.right:|', op: 'slide', args: [423]},
                {id: '__inputs|x/yAxis[0].axisLabel.interval:|', op: 'select', args: [3]},
                {id: '__inputs|yAxis[0].boundaryGap:|', op: 'select', args: [1]},
                {id: '__inputs|xAxis[0].boundaryGap:|', op: 'select', args: [1]}
            ],
            endTime: 1750636452825
        }
    }

];

