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

import BaseBarSeries from './BaseBarSeries';

var PictorialBarSeries = BaseBarSeries.extend({

    type: 'series.pictorialBar',

    dependencies: ['grid'],

    defaultOption: {
        symbol: 'circle',     // Customized bar shape
        symbolSize: null,     // Can be ['100%', '100%'], null means auto.
        symbolRotate: null,

        symbolPosition: null, // 'start' or 'end' or 'center', null means auto.
        symbolOffset: null,
        symbolMargin: null,   // start margin and end margin. Can be a number or a percent string.
                                // Auto margin by default.
        symbolRepeat: false,  // false/null/undefined, means no repeat.
                                // Can be true, means auto calculate repeat times and cut by data.
                                // Can be a number, specifies repeat times, and do not cut by data.
                                // Can be 'fixed', means auto calculate repeat times but do not cut by data.
        symbolRepeatDirection: 'end', // 'end' means from 'start' to 'end'.

        symbolClip: false,
        symbolBoundingData: null, // Can be 60 or -40 or [-40, 60]
        symbolPatternSize: 400, // 400 * 400 px

        barGap: '-100%',      // In most case, overlap is needed.

        // z can be set in data item, which is z2 actually.

        // Disable progressive
        progressive: 0,
        hoverAnimation: false // Open only when needed.
    },

    getInitialData: function (option) {
        // Disable stack.
        option.stack = null;
        return PictorialBarSeries.superApply(this, 'getInitialData', arguments);
    }
});

export default PictorialBarSeries;
