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

export default BaseBarSeries.extend({

    type: 'series.bar',

    dependencies: ['grid', 'polar'],

    brushSelector: 'rect',

    /**
     * @override
     */
    getProgressive: function () {
        // Do not support progressive in normal mode.
        return this.get('large')
            ? this.get('progressive')
            : false;
    },

    /**
     * @override
     */
    getProgressiveThreshold: function () {
        // Do not support progressive in normal mode.
        var progressiveThreshold = this.get('progressiveThreshold');
        var largeThreshold = this.get('largeThreshold');
        if (largeThreshold > progressiveThreshold) {
            progressiveThreshold = largeThreshold;
        }
        return progressiveThreshold;
    },

    defaultOption: {
        // If clipped
        // Only available on cartesian2d
        clip: true
    }
});
