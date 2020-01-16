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

import {each} from 'zrender/src/core/util';
import Group from 'zrender/src/container/Group';
import * as componentUtil from '../util/component';
import * as clazzUtil from '../util/clazz';
import * as modelUtil from '../util/model';
import * as graphicUtil from '../util/graphic';
import {createTask} from '../stream/task';
import createRenderPlanner from '../chart/helper/createRenderPlanner';

var inner = modelUtil.makeInner();
var renderPlanner = createRenderPlanner();

function Chart() {

    /**
     * @type {module:zrender/container/Group}
     * @readOnly
     */
    this.group = new Group();

    /**
     * @type {string}
     * @readOnly
     */
    this.uid = componentUtil.getUID('viewChart');

    this.renderTask = createTask({
        plan: renderTaskPlan,
        reset: renderTaskReset
    });
    this.renderTask.context = {view: this};
}

Chart.prototype = {

    type: 'chart',

    /**
     * Init the chart.
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     */
    init: function (ecModel, api) {},

    /**
     * Render the chart.
     * @param  {module:echarts/model/Series} seriesModel
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     * @param  {Object} payload
     */
    render: function (seriesModel, ecModel, api, payload) {},

    /**
     * Highlight series or specified data item.
     * @param  {module:echarts/model/Series} seriesModel
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     * @param  {Object} payload
     */
    highlight: function (seriesModel, ecModel, api, payload) {
        toggleHighlight(seriesModel.getData(), payload, 'emphasis');
    },

    /**
     * Downplay series or specified data item.
     * @param  {module:echarts/model/Series} seriesModel
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     * @param  {Object} payload
     */
    downplay: function (seriesModel, ecModel, api, payload) {
        toggleHighlight(seriesModel.getData(), payload, 'normal');
    },

    /**
     * Remove self.
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     */
    remove: function (ecModel, api) {
        this.group.removeAll();
    },

    /**
     * Dispose self.
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     */
    dispose: function () {},

    /**
     * Rendering preparation in progressive mode.
     * @param  {module:echarts/model/Series} seriesModel
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     * @param  {Object} payload
     */
    incrementalPrepareRender: null,

    /**
     * Render in progressive mode.
     * @param  {Object} params See taskParams in `stream/task.js`
     * @param  {module:echarts/model/Series} seriesModel
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     * @param  {Object} payload
     */
    incrementalRender: null,

    /**
     * Update transform directly.
     * @param  {module:echarts/model/Series} seriesModel
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     * @param  {Object} payload
     * @return {Object} {update: true}
     */
    updateTransform: null,

    /**
     * The view contains the given point.
     * @interface
     * @param {Array.<number>} point
     * @return {boolean}
     */
    // containPoint: function () {}

    /**
     * @param {string} eventType
     * @param {Object} query
     * @param {module:zrender/Element} targetEl
     * @param {Object} packedEvent
     * @return {boolen} Pass only when return `true`.
     */
    filterForExposedEvent: null

};

var chartProto = Chart.prototype;
chartProto.updateView =
chartProto.updateLayout =
chartProto.updateVisual =
    function (seriesModel, ecModel, api, payload) {
        this.render(seriesModel, ecModel, api, payload);
    };

/**
 * Set state of single element
 * @param {module:zrender/Element} el
 * @param {string} state 'normal'|'emphasis'
 * @param {number} highlightDigit
 */
function elSetState(el, state, highlightDigit) {
    if (el) {
        el.trigger(state, highlightDigit);
        if (el.isGroup
            // Simple optimize.
            && !graphicUtil.isHighDownDispatcher(el)
        ) {
            for (var i = 0, len = el.childCount(); i < len; i++) {
                elSetState(el.childAt(i), state, highlightDigit);
            }
        }
    }
}

/**
 * @param {module:echarts/data/List} data
 * @param {Object} payload
 * @param {string} state 'normal'|'emphasis'
 */
function toggleHighlight(data, payload, state) {
    var dataIndex = modelUtil.queryDataIndex(data, payload);

    var highlightDigit = (payload && payload.highlightKey != null)
        ? graphicUtil.getHighlightDigit(payload.highlightKey)
        : null;

    if (dataIndex != null) {
        each(modelUtil.normalizeToArray(dataIndex), function (dataIdx) {
            elSetState(data.getItemGraphicEl(dataIdx), state, highlightDigit);
        });
    }
    else {
        data.eachItemGraphicEl(function (el) {
            elSetState(el, state, highlightDigit);
        });
    }
}

// Enable Chart.extend.
clazzUtil.enableClassExtend(Chart, ['dispose']);

// Add capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
clazzUtil.enableClassManagement(Chart, {registerWhenExtend: true});

Chart.markUpdateMethod = function (payload, methodName) {
    inner(payload).updateMethod = methodName;
};

function renderTaskPlan(context) {
    return renderPlanner(context.model);
}

function renderTaskReset(context) {
    var seriesModel = context.model;
    var ecModel = context.ecModel;
    var api = context.api;
    var payload = context.payload;
    // ???! remove updateView updateVisual
    var progressiveRender = seriesModel.pipelineContext.progressiveRender;
    var view = context.view;

    var updateMethod = payload && inner(payload).updateMethod;
    var methodName = progressiveRender
        ? 'incrementalPrepareRender'
        : (updateMethod && view[updateMethod])
        ? updateMethod
        // `appendData` is also supported when data amount
        // is less than progressive threshold.
        : 'render';

    if (methodName !== 'render') {
        view[methodName](seriesModel, ecModel, api, payload);
    }

    return progressMethodMap[methodName];
}

var progressMethodMap = {
    incrementalPrepareRender: {
        progress: function (params, context) {
            context.view.incrementalRender(
                params, context.model, context.ecModel, context.api, context.payload
            );
        }
    },
    render: {
        // Put view.render in `progress` to support appendData. But in this case
        // view.render should not be called in reset, otherwise it will be called
        // twise. Use `forceFirstProgress` to make sure that view.render is called
        // in any cases.
        forceFirstProgress: true,
        progress: function (params, context) {
            context.view.render(
                context.model, context.ecModel, context.api, context.payload
            );
        }
    }
};

export default Chart;