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

import * as echarts from '../../../echarts';
import * as history from '../../dataZoom/history';
import lang from '../../../lang';
import * as featureManager from '../featureManager';

var restoreLang = lang.toolbox.restore;

function Restore(model) {
    this.model = model;
}

Restore.defaultOption = {
    show: true,
    icon: 'M3.8,33.4 M47,18.9h9.8V8.7 M56.3,20.1 C52.1,9,40.5,0.6,26.8,2.1C12.6,3.7,1.6,16.2,2.1,30.6 M13,41.1H3.1v10.2 M3.7,39.9c4.2,11.1,15.8,19.5,29.5,18 c14.2-1.6,25.2-14.1,24.7-28.5',
    title: restoreLang.title
};

var proto = Restore.prototype;

proto.onclick = function (ecModel, api, type) {
    history.clear(ecModel);

    api.dispatchAction({
        type: 'restore',
        from: this.uid
    });
};

featureManager.register('restore', Restore);

echarts.registerAction(
    {type: 'restore', event: 'restore', update: 'prepareAndUpdate'},
    function (payload, ecModel) {
        ecModel.resetOption('recreate');
    }
);

export default Restore;