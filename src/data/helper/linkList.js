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
 * Link lists and struct (graph or tree)
 */

import * as zrUtil from 'zrender/src/core/util';

var each = zrUtil.each;

var DATAS = '\0__link_datas';
var MAIN_DATA = '\0__link_mainData';

// Caution:
// In most case, either list or its shallow clones (see list.cloneShallow)
// is active in echarts process. So considering heap memory consumption,
// we do not clone tree or graph, but share them among list and its shallow clones.
// But in some rare case, we have to keep old list (like do animation in chart). So
// please take care that both the old list and the new list share the same tree/graph.

/**
 * @param {Object} opt
 * @param {module:echarts/data/List} opt.mainData
 * @param {Object} [opt.struct] For example, instance of Graph or Tree.
 * @param {string} [opt.structAttr] designation: list[structAttr] = struct;
 * @param {Object} [opt.datas] {dataType: data},
 *                 like: {node: nodeList, edge: edgeList}.
 *                 Should contain mainData.
 * @param {Object} [opt.datasAttr] {dataType: attr},
 *                 designation: struct[datasAttr[dataType]] = list;
 */
function linkList(opt) {
    var mainData = opt.mainData;
    var datas = opt.datas;

    if (!datas) {
        datas = {main: mainData};
        opt.datasAttr = {main: 'data'};
    }
    opt.datas = opt.mainData = null;

    linkAll(mainData, datas, opt);

    // Porxy data original methods.
    each(datas, function (data) {
        each(mainData.TRANSFERABLE_METHODS, function (methodName) {
            data.wrapMethod(methodName, zrUtil.curry(transferInjection, opt));
        });

    });

    // Beyond transfer, additional features should be added to `cloneShallow`.
    mainData.wrapMethod('cloneShallow', zrUtil.curry(cloneShallowInjection, opt));

    // Only mainData trigger change, because struct.update may trigger
    // another changable methods, which may bring about dead lock.
    each(mainData.CHANGABLE_METHODS, function (methodName) {
        mainData.wrapMethod(methodName, zrUtil.curry(changeInjection, opt));
    });

    // Make sure datas contains mainData.
    zrUtil.assert(datas[mainData.dataType] === mainData);
}

function transferInjection(opt, res) {
    if (isMainData(this)) {
        // Transfer datas to new main data.
        var datas = zrUtil.extend({}, this[DATAS]);
        datas[this.dataType] = res;
        linkAll(res, datas, opt);
    }
    else {
        // Modify the reference in main data to point newData.
        linkSingle(res, this.dataType, this[MAIN_DATA], opt);
    }
    return res;
}

function changeInjection(opt, res) {
    opt.struct && opt.struct.update(this);
    return res;
}

function cloneShallowInjection(opt, res) {
    // cloneShallow, which brings about some fragilities, may be inappropriate
    // to be exposed as an API. So for implementation simplicity we can make
    // the restriction that cloneShallow of not-mainData should not be invoked
    // outside, but only be invoked here.
    each(res[DATAS], function (data, dataType) {
        data !== res && linkSingle(data.cloneShallow(), dataType, res, opt);
    });
    return res;
}

/**
 * Supplement method to List.
 *
 * @public
 * @param {string} [dataType] If not specified, return mainData.
 * @return {module:echarts/data/List}
 */
function getLinkedData(dataType) {
    var mainData = this[MAIN_DATA];
    return (dataType == null || mainData == null)
        ? mainData
        : mainData[DATAS][dataType];
}

function isMainData(data) {
    return data[MAIN_DATA] === data;
}

function linkAll(mainData, datas, opt) {
    mainData[DATAS] = {};
    each(datas, function (data, dataType) {
        linkSingle(data, dataType, mainData, opt);
    });
}

function linkSingle(data, dataType, mainData, opt) {
    mainData[DATAS][dataType] = data;
    data[MAIN_DATA] = mainData;
    data.dataType = dataType;

    if (opt.struct) {
        data[opt.structAttr] = opt.struct;
        opt.struct[opt.datasAttr[dataType]] = data;
    }

    // Supplement method.
    data.getLinkedData = getLinkedData;
}

export default linkList;