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

import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';

echarts.registerAction(

    {type: 'timelineChange', event: 'timelineChanged', update: 'prepareAndUpdate'},

    function (payload, ecModel) {

        var timelineModel = ecModel.getComponent('timeline');
        if (timelineModel && payload.currentIndex != null) {
            timelineModel.setCurrentIndex(payload.currentIndex);

            if (!timelineModel.get('loop', true) && timelineModel.isIndexMax()) {
                timelineModel.setPlayState(false);
            }
        }

        // Set normalized currentIndex to payload.
        ecModel.resetOption('timeline');

        return zrUtil.defaults({
            currentIndex: timelineModel.option.currentIndex
        }, payload);
    }
);

echarts.registerAction(

    {type: 'timelinePlayChange', event: 'timelinePlayChanged', update: 'update'},

    function (payload, ecModel) {
        var timelineModel = ecModel.getComponent('timeline');
        if (timelineModel && payload.playState != null) {
            timelineModel.setPlayState(payload.playState);
        }
    }
);
