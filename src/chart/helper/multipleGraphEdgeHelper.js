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

var linkMap = {};
var curvenessList = [];

/**
 * params handler
 * @param seriesModel
 * @returns {*}
 */
var getAutoCurvenessParams = function (seriesModel) {
    var autoCurveness = seriesModel.getModel('autoCurveness');

    if (!autoCurveness || !autoCurveness.option) {
        return null;
    }

    return autoCurveness.option;
};

/**
 * Generate a list of edge curvatures, 20 is the default
 * 生成边曲度优先使用列表, 20为默认值
 * @param seriesModel
 * @param addLength append length
 * @return  20 => [0, -0.2, 0.2, -0.4, 0.4, -0.6, 0.6, -0.8, 0.8, -1, 1, -1.2, 1.2, -1.4, 1.4, -1.6, 1.6, -1.8, 1.8, -2]
 */
var createCurveness = function (seriesModel, addLength) {
    var autoCurvenssParmas = getAutoCurvenessParams(seriesModel);
    var length = 20;

    // handler the function set
    if (typeof autoCurvenssParmas === 'number') {
        length = autoCurvenssParmas;
    }
    else if (typeof autoCurvenssParmas === 'function') {
        curvenessList = autoCurvenssParmas();
        return;
    }

    // addLength
    if (addLength) {
        length = addLength;
    }

    // if already calculated return
    if (length < curvenessList.length) {
        return;
    }

    // 保证长度为偶数
    var len = length % 2 ? length + 2 : length + 3;
    curvenessList = [];

    for (var i = 0; i < len; i++) {
        curvenessList.push((i % 2 ? i + 1 : i) / 10 * (i % 2 ? -1 : 1));
    }
};

/**
 * Create different cache key data in the positive and negative directions, in order to set the curvature later
 * 正反方向创建不同的缓存key数据，为了后期设置曲率考虑
 * @param link
 * @param seriesModel
 * @returns {string}
 */
var getKeyOfLinks = function (link, seriesModel) {
    return [seriesModel.uid, link.source, link.target].join('>');
};

/**
 * get opposite key
 * 获取反向的key
 * @param key
 * @returns {string}
 */
var getOppositeKey = function (key) {
    var keys = key.split('>');

    return [keys[0], keys[2], keys[1]].join('>');
};

/**
 * set linkMap with key
 * @param link
 * @param seriesModel
 * @param index
 */
var setLinkToMap = function (link, seriesModel, index) {
    var key = getKeyOfLinks(link, seriesModel);
    var hasOppositeLinks = linkMap[getOppositeKey(key)];
    // set direction
    if (hasOppositeLinks && linkMap[key] && !linkMap[key].isForward) {
        linkMap[getOppositeKey(key)].isForward = true;
    }

    linkMap[key] = linkMap[key] || [];
    linkMap[key].push(index);
};

/**
 * get linkMap with key
 * @param link
 * @param seriesModel
 * @param index
 */
var getLinkFromMap = function (link, seriesModel) {
    var key = getKeyOfLinks(link, seriesModel);
    return linkMap[key];
};

/**
 * calculate all cases total length
 * @param link
 * @param seriesModel
 * @returns {number}
 */
var getTotalLengthBetweenNodes = function (link, seriesModel) {
    var len = getLinkMapLengthWithKey([seriesModel.uid, link.source, link.target].join('>'));
    var lenV = getLinkMapLengthWithKey([seriesModel.uid, link.target, link.source].join('>'));

    return len + lenV;
};

/**
 *
 * @param key
 */
var getLinkMapLengthWithKey = function (key) {
    return linkMap[key] ? linkMap[key].length : 0;
};

/**
 * step1：Count the number of edges between the same two points, used to obtain the curvature table and the parity of the edge
 * 统计相同两点间的边数量，用于获取曲率表和边的奇偶
 * @param edges
 * @param seriesModel
 * @param graph
 */
export function calculateMutilEdges(edges, seriesModel, graph) {
    if (!getAutoCurvenessParams(seriesModel)) {
        return;
    }
    // Hang on this object 4 dispose
    curvenessList = graph.curvenessList || [];
    linkMap = graph.linkMap = graph.linkMap || {};


    for (var i = 0; i < edges.length; i++) {
        var link = edges[i];
        var source = link.source;
        var target = link.target;
        if (!source || !target) {
            continue;
        }
        setLinkToMap(link, seriesModel, i);
    }

    // calc the array of curvenessList
    createCurveness(seriesModel);
}

/**
 * Set curvature for link
 * 为link设置曲率
 * @param link
 * @param seriesModel
 * @param index
 */
export function setCurvenessForLink(link, seriesModel, index) {
    if (!getAutoCurvenessParams(seriesModel)) {
        return;
    }

    var linkArray = getLinkFromMap(link, seriesModel);
    if (!linkArray) {
        return;
    }

    var linkIndex = linkArray.findIndex(function (it) {
        return it === index;
    });
    var totalLen = getTotalLengthBetweenNodes(link, seriesModel);
    // if totalLen bigger than curvenessList, recreate curvenessList
    if (totalLen > curvenessList.length) {
        createCurveness(seriesModel, totalLen);
    }

    link.lineStyle = link.lineStyle || {};
    // if is opposite link, must set curvenss to opposite number
    var curKey = getKeyOfLinks(link, seriesModel);
    if (!linkArray.isForward) {
        // the opposite link show outside
        var oppositeKey = getOppositeKey(curKey);
        var len = getLinkMapLengthWithKey(oppositeKey);
        var layout = seriesModel.getModel('layout').option;
        // Because the curvature algorithm of each layout is different, the reverse needs to be adapted here
        if (layout === 'none' || layout === 'force') {
            link.lineStyle.curveness = -1 * curvenessList[linkIndex + len + (totalLen % 2 ? 0 : 1)];
        }
        else if (layout === 'circular') {
            link.lineStyle.curveness = curvenessList[linkIndex + len + (totalLen % 2 ? 0 : 1)];
        }
    }
    else {
        link.lineStyle.curveness = curvenessList[linkIndex + (totalLen % 2 ? 0 : 1)];
    }
}
