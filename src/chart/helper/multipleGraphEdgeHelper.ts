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

// @ts-nocheck
import * as zrUtil from 'zrender/src/core/util';

const KEY_DELIMITER = '-->';
/**
 * params handler
 * @param {module:echarts/model/SeriesModel} seriesModel
 * @returns {*}
 */
const getAutoCurvenessParams = function (seriesModel) {
    return seriesModel.get('autoCurveness') || null;
};

/**
 * Generate a list of edge curvatures, 20 is the default
 * @param {module:echarts/model/SeriesModel} seriesModel
 * @param {number} appendLength
 * @return  20 => [0, -0.2, 0.2, -0.4, 0.4, -0.6, 0.6, -0.8, 0.8, -1, 1, -1.2, 1.2, -1.4, 1.4, -1.6, 1.6, -1.8, 1.8, -2]
 */
const createCurveness = function (seriesModel, appendLength) {
    const autoCurvenessParmas = getAutoCurvenessParams(seriesModel);
    let length = 20;
    let curvenessList = [];

    // handler the function set
    if (typeof autoCurvenessParmas === 'number') {
        length = autoCurvenessParmas;
    }
    else if (zrUtil.isArray(autoCurvenessParmas)) {
        seriesModel.__curvenessList = autoCurvenessParmas;
        return;
    }

    // append length
    if (appendLength > length) {
        length = appendLength;
    }

    // make sure the length is even
    const len = length % 2 ? length + 2 : length + 3;
    curvenessList = [];

    for (let i = 0; i < len; i++) {
        curvenessList.push((i % 2 ? i + 1 : i) / 10 * (i % 2 ? -1 : 1));
    }
    seriesModel.__curvenessList = curvenessList;
};

/**
 * Create different cache key data in the positive and negative directions, in order to set the curvature later
 * @param {number|string|module:echarts/data/Graph.Node} n1
 * @param {number|string|module:echarts/data/Graph.Node} n2
 * @param {module:echarts/model/SeriesModel} seriesModel
 * @returns {string} key
 */
const getKeyOfEdges = function (n1, n2, seriesModel) {
    const source = [n1.id, n1.dataIndex].join('.');
    const target = [n2.id, n2.dataIndex].join('.');
    return [seriesModel.uid, source, target].join(KEY_DELIMITER);
};

/**
 * get opposite key
 * @param {string} key
 * @returns {string}
 */
const getOppositeKey = function (key) {
    const keys = key.split(KEY_DELIMITER);
    return [keys[0], keys[2], keys[1]].join(KEY_DELIMITER);
};

/**
 * get edgeMap with key
 * @param edge
 * @param {module:echarts/model/SeriesModel} seriesModel
 */
const getEdgeFromMap = function (edge, seriesModel) {
    const key = getKeyOfEdges(edge.node1, edge.node2, seriesModel);
    return seriesModel.__edgeMap[key];
};

/**
 * calculate all cases total length
 * @param edge
 * @param seriesModel
 * @returns {number}
 */
const getTotalLengthBetweenNodes = function (edge, seriesModel) {
    const len = getEdgeMapLengthWithKey(getKeyOfEdges(edge.node1, edge.node2, seriesModel), seriesModel);
    const lenV = getEdgeMapLengthWithKey(getKeyOfEdges(edge.node2, edge.node1, seriesModel), seriesModel);

    return len + lenV;
};

/**
 *
 * @param key
 */
const getEdgeMapLengthWithKey = function (key, seriesModel) {
    const edgeMap = seriesModel.__edgeMap;
    return edgeMap[key] ? edgeMap[key].length : 0;
};

/**
 * Count the number of edges between the same two points, used to obtain the curvature table and the parity of the edge
 * @see /graph/GraphSeries.js@getInitialData
 * @param {module:echarts/model/SeriesModel} seriesModel
 */
export function initCurvenessList(seriesModel) {
    if (!getAutoCurvenessParams(seriesModel)) {
        return;
    }

    seriesModel.__curvenessList = [];
    seriesModel.__edgeMap = {};
    // calc the array of curveness List
    createCurveness(seriesModel);
}

/**
 * set edgeMap with key
 * @param {number|string|module:echarts/data/Graph.Node} n1
 * @param {number|string|module:echarts/data/Graph.Node} n2
 * @param {module:echarts/model/SeriesModel} seriesModel
 * @param {number} index
 */
export function createEdgeMapForCurveness(n1, n2, seriesModel, index) {
    if (!getAutoCurvenessParams(seriesModel)) {
        return;
    }

    const key = getKeyOfEdges(n1, n2, seriesModel);
    const edgeMap = seriesModel.__edgeMap;
    const oppositeEdges = edgeMap[getOppositeKey(key)];
    // set direction
    if (edgeMap[key] && !oppositeEdges) {
        edgeMap[key].isForward = true;
    }
    else if (oppositeEdges && edgeMap[key]) {
        oppositeEdges.isForward = true;
        edgeMap[key].isForward = false;
    }

    edgeMap[key] = edgeMap[key] || [];
    edgeMap[key].push(index);
}

/**
 * get curvature for edge
 * @param edge
 * @param {module:echarts/model/SeriesModel} seriesModel
 * @param index
 */
export function getCurvenessForEdge(edge, seriesModel, index, needReverse?: boolean) {
    const autoCurvenessParams = getAutoCurvenessParams(seriesModel);
    const isArrayParam = zrUtil.isArray(autoCurvenessParams);
    if (!autoCurvenessParams) {
        return null;
    }

    const edgeArray = getEdgeFromMap(edge, seriesModel);
    if (!edgeArray) {
        return null;
    }

    let edgeIndex = -1;
    for (let i = 0; i < edgeArray.length; i++) {
        if (edgeArray[i] === index) {
            edgeIndex = i;
            break;
        }
    }
    // if totalLen is Longer createCurveness
    const totalLen = getTotalLengthBetweenNodes(edge, seriesModel);
    createCurveness(seriesModel, totalLen);

    edge.lineStyle = edge.lineStyle || {};
    // if is opposite edge, must set curvenss to opposite number
    const curKey = getKeyOfEdges(edge.node1, edge.node2, seriesModel);
    const curvenessList = seriesModel.__curvenessList;
    // if pass array no need parity
    const parityCorrection = isArrayParam ? 0 : totalLen % 2 ? 0 : 1;

    if (!edgeArray.isForward) {
        // the opposite edge show outside
        const oppositeKey = getOppositeKey(curKey);
        const len = getEdgeMapLengthWithKey(oppositeKey, seriesModel);
        const resValue = curvenessList[edgeIndex + len + parityCorrection];
        // isNeedReverse, simple, force type need reverse the curveness in the junction of the forword and the opposite
        if (needReverse) {
            // set as array may make the parity handle with the len of opposite
            if (isArrayParam) {
                if (autoCurvenessParams && autoCurvenessParams[0] === 0) {
                    return (len + parityCorrection) % 2 ? resValue : -resValue;
                }
                else {
                    return ((len % 2 ? 0 : 1) + parityCorrection) % 2 ? resValue : -resValue;
                }
            }
            else {
                return (len + parityCorrection) % 2 ? resValue : -resValue;
            }
        }
        else {
            return curvenessList[edgeIndex + len + parityCorrection];
        }
    }
    else {
        return curvenessList[parityCorrection + edgeIndex];
    }
}
