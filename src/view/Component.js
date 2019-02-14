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

import Group from 'zrender/src/container/Group';
import * as componentUtil from '../util/component';
import * as clazzUtil from '../util/clazz';

var Component = function () {
    /**
     * @type {module:zrender/container/Group}
     * @readOnly
     */
    this.group = new Group();

    /**
     * @type {string}
     * @readOnly
     */
    this.uid = componentUtil.getUID('viewComponent');
};

Component.prototype = {

    constructor: Component,

    init: function (ecModel, api) {},

    render: function (componentModel, ecModel, api, payload) {},

    dispose: function () {},

    /**
     * @param {string} eventType
     * @param {Object} query
     * @param {module:zrender/Element} targetEl
     * @param {Object} packedEvent
     * @return {boolen} Pass only when return `true`.
     */
    filterForExposedEvent: null

};

var componentProto = Component.prototype;
componentProto.updateView
    = componentProto.updateLayout
    = componentProto.updateVisual
    = function (seriesModel, ecModel, api, payload) {
        // Do nothing;
    };
// Enable Component.extend.
clazzUtil.enableClassExtend(Component);

// Enable capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
clazzUtil.enableClassManagement(Component, {registerWhenExtend: true});

export default Component;