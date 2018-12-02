
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

var zrUtil = require("zrender/lib/core/util");

var formatUtil = require("../../util/format");

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
var AXIS_DIMS = ['x', 'y', 'z', 'radius', 'angle', 'single']; // Supported coords.

var COORDS = ['cartesian2d', 'polar', 'singleAxis'];
/**
 * @param {string} coordType
 * @return {boolean}
 */

function isCoordSupported(coordType) {
  return zrUtil.indexOf(COORDS, coordType) >= 0;
}
/**
 * Create "each" method to iterate names.
 *
 * @pubilc
 * @param  {Array.<string>} names
 * @param  {Array.<string>=} attrs
 * @return {Function}
 */


function createNameEach(names, attrs) {
  names = names.slice();
  var capitalNames = zrUtil.map(names, formatUtil.capitalFirst);
  attrs = (attrs || []).slice();
  var capitalAttrs = zrUtil.map(attrs, formatUtil.capitalFirst);
  return function (callback, context) {
    zrUtil.each(names, function (name, index) {
      var nameObj = {
        name: name,
        capital: capitalNames[index]
      };

      for (var j = 0; j < attrs.length; j++) {
        nameObj[attrs[j]] = name + capitalAttrs[j];
      }

      callback.call(context, nameObj);
    });
  };
}
/**
 * Iterate each dimension name.
 *
 * @public
 * @param {Function} callback The parameter is like:
 *                            {
 *                                name: 'angle',
 *                                capital: 'Angle',
 *                                axis: 'angleAxis',
 *                                axisIndex: 'angleAixs',
 *                                index: 'angleIndex'
 *                            }
 * @param {Object} context
 */


var eachAxisDim = createNameEach(AXIS_DIMS, ['axisIndex', 'axis', 'index', 'id']);
/**
 * If tow dataZoomModels has the same axis controlled, we say that they are 'linked'.
 * dataZoomModels and 'links' make up one or more graphics.
 * This function finds the graphic where the source dataZoomModel is in.
 *
 * @public
 * @param {Function} forEachNode Node iterator.
 * @param {Function} forEachEdgeType edgeType iterator
 * @param {Function} edgeIdGetter Giving node and edgeType, return an array of edge id.
 * @return {Function} Input: sourceNode, Output: Like {nodes: [], dims: {}}
 */

function createLinkedNodesFinder(forEachNode, forEachEdgeType, edgeIdGetter) {
  return function (sourceNode) {
    var result = {
      nodes: [],
      records: {} // key: edgeType.name, value: Object (key: edge id, value: boolean).

    };
    forEachEdgeType(function (edgeType) {
      result.records[edgeType.name] = {};
    });

    if (!sourceNode) {
      return result;
    }

    absorb(sourceNode, result);
    var existsLink;

    do {
      existsLink = false;
      forEachNode(processSingleNode);
    } while (existsLink);

    function processSingleNode(node) {
      if (!isNodeAbsorded(node, result) && isLinked(node, result)) {
        absorb(node, result);
        existsLink = true;
      }
    }

    return result;
  };

  function isNodeAbsorded(node, result) {
    return zrUtil.indexOf(result.nodes, node) >= 0;
  }

  function isLinked(node, result) {
    var hasLink = false;
    forEachEdgeType(function (edgeType) {
      zrUtil.each(edgeIdGetter(node, edgeType) || [], function (edgeId) {
        result.records[edgeType.name][edgeId] && (hasLink = true);
      });
    });
    return hasLink;
  }

  function absorb(node, result) {
    result.nodes.push(node);
    forEachEdgeType(function (edgeType) {
      zrUtil.each(edgeIdGetter(node, edgeType) || [], function (edgeId) {
        result.records[edgeType.name][edgeId] = true;
      });
    });
  }
}

exports.isCoordSupported = isCoordSupported;
exports.createNameEach = createNameEach;
exports.eachAxisDim = eachAxisDim;
exports.createLinkedNodesFinder = createLinkedNodesFinder;