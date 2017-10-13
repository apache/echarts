(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("echarts"));
	else if(typeof define === 'function' && define.amd)
		define(["echarts"], factory);
	else if(typeof exports === 'object')
		exports["dataTool"] = factory(require("echarts"));
	else
		root["echarts"] = root["echarts"] || {}, root["echarts"]["dataTool"] = factory(root["echarts"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function (require) {
	    var echarts = __webpack_require__(1);
	    echarts.dataTool = {
	        version: '1.0.0',
	        gexf: __webpack_require__(5),
	        prepareBoxplotData: __webpack_require__(6)
	    };
	    return echarts.dataTool;
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 1 */
/***/ (function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ }),
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;// GEXF File Parser
	// http://gexf.net/1.2draft/gexf-12draft-primer.pdf
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function (require) {

	    'use strict';
	    var zrUtil = __webpack_require__(1).util;

	    function parse(xml) {
	        var doc;
	        if (typeof xml === 'string') {
	            var parser = new DOMParser();
	            doc = parser.parseFromString(xml, 'text/xml');
	        }
	        else {
	            doc = xml;
	        }
	        if (!doc || doc.getElementsByTagName('parsererror').length) {
	            return null;
	        }

	        var gexfRoot = getChildByTagName(doc, 'gexf');

	        if (!gexfRoot) {
	            return null;
	        }

	        var graphRoot = getChildByTagName(gexfRoot, 'graph');

	        var attributes = parseAttributes(getChildByTagName(graphRoot, 'attributes'));
	        var attributesMap = {};
	        for (var i = 0; i < attributes.length; i++) {
	            attributesMap[attributes[i].id] = attributes[i];
	        }

	        return {
	            nodes: parseNodes(getChildByTagName(graphRoot, 'nodes'), attributesMap),
	            links: parseEdges(getChildByTagName(graphRoot, 'edges'))
	        };
	    }

	    function parseAttributes(parent) {
	        return parent ? zrUtil.map(getChildrenByTagName(parent, 'attribute'), function (attribDom) {
	            return {
	                id: getAttr(attribDom, 'id'),
	                title: getAttr(attribDom, 'title'),
	                type: getAttr(attribDom, 'type')
	            };
	        }) : [];
	    }

	    function parseNodes(parent, attributesMap) {
	        return parent ? zrUtil.map(getChildrenByTagName(parent, 'node'), function (nodeDom) {

	            var id = getAttr(nodeDom, 'id');
	            var label = getAttr(nodeDom, 'label');

	            var node = {
	                id: id,
	                name: label,
	                itemStyle: {
	                    normal: {}
	                }
	            };

	            var vizSizeDom = getChildByTagName(nodeDom, 'viz:size');
	            var vizPosDom = getChildByTagName(nodeDom, 'viz:position');
	            var vizColorDom = getChildByTagName(nodeDom, 'viz:color');
	            // var vizShapeDom = getChildByTagName(nodeDom, 'viz:shape');

	            var attvaluesDom = getChildByTagName(nodeDom, 'attvalues');

	            if (vizSizeDom) {
	                node.symbolSize = parseFloat(getAttr(vizSizeDom, 'value'));
	            }
	            if (vizPosDom) {
	                node.x = parseFloat(getAttr(vizPosDom, 'x'));
	                node.y = parseFloat(getAttr(vizPosDom, 'y'));
	                // z
	            }
	            if (vizColorDom) {
	                node.itemStyle.normal.color = 'rgb(' +[
	                    getAttr(vizColorDom, 'r') | 0,
	                    getAttr(vizColorDom, 'g') | 0,
	                    getAttr(vizColorDom, 'b') | 0
	                ].join(',') + ')';
	            }
	            // if (vizShapeDom) {
	                // node.shape = getAttr(vizShapeDom, 'shape');
	            // }
	            if (attvaluesDom) {
	                var attvalueDomList = getChildrenByTagName(attvaluesDom, 'attvalue');

	                node.attributes = {};

	                for (var j = 0; j < attvalueDomList.length; j++) {
	                    var attvalueDom = attvalueDomList[j];
	                    var attId = getAttr(attvalueDom, 'for');
	                    var attValue = getAttr(attvalueDom, 'value');
	                    var attribute = attributesMap[attId];

	                    if (attribute) {
	                        switch (attribute.type) {
	                            case 'integer':
	                            case 'long':
	                                attValue = parseInt(attValue, 10);
	                                break;
	                            case 'float':
	                            case 'double':
	                                attValue = parseFloat(attValue);
	                                break;
	                            case 'boolean':
	                                attValue = attValue.toLowerCase() == 'true';
	                                break;
	                            default:
	                        }
	                        node.attributes[attId] = attValue;
	                    }
	                }
	            }

	            return node;
	        }) : [];
	    }

	    function parseEdges(parent) {
	        return parent ? zrUtil.map(getChildrenByTagName(parent, 'edge'), function (edgeDom) {
	            var id = getAttr(edgeDom, 'id');
	            var label = getAttr(edgeDom, 'label');

	            var sourceId = getAttr(edgeDom, 'source');
	            var targetId = getAttr(edgeDom, 'target');

	            var edge = {
	                id: id,
	                name: label,
	                source: sourceId,
	                target: targetId,
	                lineStyle: {
	                    normal: {}
	                }
	            };

	            var lineStyle = edge.lineStyle.normal;

	            var vizThicknessDom = getChildByTagName(edgeDom, 'viz:thickness');
	            var vizColorDom = getChildByTagName(edgeDom, 'viz:color');
	            // var vizShapeDom = getChildByTagName(edgeDom, 'viz:shape');

	            if (vizThicknessDom) {
	                lineStyle.width = parseFloat(vizThicknessDom.getAttribute('value'));
	            }
	            if (vizColorDom) {
	                lineStyle.color = 'rgb(' + [
	                    getAttr(vizColorDom, 'r') | 0,
	                    getAttr(vizColorDom, 'g') | 0,
	                    getAttr(vizColorDom, 'b') | 0
	                ].join(',') + ')';
	            }
	            // if (vizShapeDom) {
	            //     edge.shape = vizShapeDom.getAttribute('shape');
	            // }

	            return edge;
	        }) : [];
	    }

	    function getAttr(el, attrName) {
	        return el.getAttribute(attrName);
	    }

	    function getChildByTagName (parent, tagName) {
	        var node = parent.firstChild;

	        while (node) {
	            if (
	                node.nodeType != 1 ||
	                node.nodeName.toLowerCase() != tagName.toLowerCase()
	            ) {
	                node = node.nextSibling;
	            } else {
	                return node;
	            }
	        }

	        return null;
	    }

	    function getChildrenByTagName (parent, tagName) {
	        var node = parent.firstChild;
	        var children = [];
	        while (node) {
	            if (node.nodeName.toLowerCase() == tagName.toLowerCase()) {
	                children.push(node);
	            }
	            node = node.nextSibling;
	        }

	        return children;
	    }

	    return {
	        parse: parse
	    };
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function (require) {

	    var quantile = __webpack_require__(7);
	    var numberUtil = __webpack_require__(1).number;

	    /**
	     * Helper method for preparing data.
	     * @param {Array.<number>} rawData like
	     *        [
	     *            [12,232,443], (raw data set for the first box)
	     *            [3843,5545,1232], (raw datat set for the second box)
	     *            ...
	     *        ]
	     * @param {Object} [opt]
	     *
	     * @param {(number|string)} [opt.boundIQR=1.5] Data less than min bound is outlier.
	     *                          default 1.5, means Q1 - 1.5 * (Q3 - Q1).
	     *                          If pass 'none', min bound will not be used.
	     * @param {(number|string)} [opt.layout='horizontal']
	     *                          Box plot layout, can be 'horizontal' or 'vertical'
	     */
	    return function (rawData, opt) {
	        opt = opt || [];
	        var boxData = [];
	        var outliers = [];
	        var axisData = [];
	        var boundIQR = opt.boundIQR;

	        for (var i = 0; i < rawData.length; i++) {
	            axisData.push(i + '');
	            var ascList = numberUtil.asc(rawData[i].slice());

	            var Q1 = quantile(ascList, 0.25);
	            var Q2 = quantile(ascList, 0.5);
	            var Q3 = quantile(ascList, 0.75);
	            var IQR = Q3 - Q1;

	            var low = boundIQR === 'none'
	                ? ascList[0]
	                : Q1 - (boundIQR == null ? 1.5 : boundIQR) * IQR;
	            var high = boundIQR === 'none'
	                ? ascList[ascList.length - 1]
	                : Q3 + (boundIQR == null ? 1.5 : boundIQR) * IQR;

	            boxData.push([low, Q1, Q2, Q3, high]);

	            for (var j = 0; j < ascList.length; j++) {
	                var dataItem = ascList[j];
	                if (dataItem < low || dataItem > high) {
	                    var outlier = [i, dataItem];
	                    opt.layout === 'vertical' && outlier.reverse();
	                    outliers.push(outlier);
	                }
	            }
	        }
	        return {
	            boxData: boxData,
	            outliers: outliers,
	            axisData: axisData
	        };
	    };

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright (c) 2010-2015, Michael Bostock
	 * All rights reserved.
	 *
	 * Redistribution and use in source and binary forms, with or without
	 * modification, are permitted provided that the following conditions are met:
	 *
	 * * Redistributions of source code must retain the above copyright notice, this
	 *   list of conditions and the following disclaimer.
	 *
	 * * Redistributions in binary form must reproduce the above copyright notice,
	 *   this list of conditions and the following disclaimer in the documentation
	 *   and/or other materials provided with the distribution.
	 *
	 * * The name Michael Bostock may not be used to endorse or promote products
	 *   derived from this software without specific prior written permission.
	 *
	 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
	 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
	 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
	 * DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
	 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
	 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
	 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
	 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
	 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function (require) {

	    /**
	     * @see <https://github.com/mbostock/d3/blob/master/src/arrays/quantile.js>
	     * @see <http://en.wikipedia.org/wiki/Quantile>
	     * @param {Array.<number>} ascArr
	     */
	    return function(ascArr, p) {
	        var H = (ascArr.length - 1) * p + 1,
	            h = Math.floor(H),
	            v = +ascArr[h - 1],
	            e = H - h;
	        return e ? v + e * (ascArr[h] - v) : v;
	    };

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ })
/******/ ])
});
;