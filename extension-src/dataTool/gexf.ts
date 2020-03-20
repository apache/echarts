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
/**
 * This is a parse of GEXF.
 *
 * The spec of GEXF:
 * https://gephi.org/gexf/1.2draft/gexf-12draft-primer.pdf
 */

import * as zrUtil from 'zrender/src/core/util';

export function parse(xml) {
    let doc;
    if (typeof xml === 'string') {
        let parser = new DOMParser();
        doc = parser.parseFromString(xml, 'text/xml');
    }
    else {
        doc = xml;
    }
    if (!doc || doc.getElementsByTagName('parsererror').length) {
        return null;
    }

    let gexfRoot = getChildByTagName(doc, 'gexf');

    if (!gexfRoot) {
        return null;
    }

    let graphRoot = getChildByTagName(gexfRoot, 'graph');

    let attributes = parseAttributes(getChildByTagName(graphRoot, 'attributes'));
    let attributesMap = {};
    for (let i = 0; i < attributes.length; i++) {
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

        let id = getAttr(nodeDom, 'id');
        let label = getAttr(nodeDom, 'label');

        let node = {
            id: id,
            name: label,
            itemStyle: {
                normal: {}
            }
        };

        let vizSizeDom = getChildByTagName(nodeDom, 'viz:size');
        let vizPosDom = getChildByTagName(nodeDom, 'viz:position');
        let vizColorDom = getChildByTagName(nodeDom, 'viz:color');
        // let vizShapeDom = getChildByTagName(nodeDom, 'viz:shape');

        let attvaluesDom = getChildByTagName(nodeDom, 'attvalues');

        if (vizSizeDom) {
            node.symbolSize = parseFloat(getAttr(vizSizeDom, 'value'));
        }
        if (vizPosDom) {
            node.x = parseFloat(getAttr(vizPosDom, 'x'));
            node.y = parseFloat(getAttr(vizPosDom, 'y'));
            // z
        }
        if (vizColorDom) {
            node.itemStyle.normal.color = 'rgb(' + [
                getAttr(vizColorDom, 'r') | 0,
                getAttr(vizColorDom, 'g') | 0,
                getAttr(vizColorDom, 'b') | 0
            ].join(',') + ')';
        }
        // if (vizShapeDom) {
            // node.shape = getAttr(vizShapeDom, 'shape');
        // }
        if (attvaluesDom) {
            let attvalueDomList = getChildrenByTagName(attvaluesDom, 'attvalue');

            node.attributes = {};

            for (let j = 0; j < attvalueDomList.length; j++) {
                let attvalueDom = attvalueDomList[j];
                let attId = getAttr(attvalueDom, 'for');
                let attValue = getAttr(attvalueDom, 'value');
                let attribute = attributesMap[attId];

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
                            attValue = attValue.toLowerCase() === 'true';
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
        let id = getAttr(edgeDom, 'id');
        let label = getAttr(edgeDom, 'label');

        let sourceId = getAttr(edgeDom, 'source');
        let targetId = getAttr(edgeDom, 'target');

        let edge = {
            id: id,
            name: label,
            source: sourceId,
            target: targetId,
            lineStyle: {
                normal: {}
            }
        };

        let lineStyle = edge.lineStyle.normal;

        let vizThicknessDom = getChildByTagName(edgeDom, 'viz:thickness');
        let vizColorDom = getChildByTagName(edgeDom, 'viz:color');
        // let vizShapeDom = getChildByTagName(edgeDom, 'viz:shape');

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

function getChildByTagName(parent, tagName) {
    let node = parent.firstChild;

    while (node) {
        if (
            node.nodeType !== 1
            || node.nodeName.toLowerCase() !== tagName.toLowerCase()
        ) {
            node = node.nextSibling;
        }
        else {
            return node;
        }
    }

    return null;
}

function getChildrenByTagName(parent, tagName) {
    let node = parent.firstChild;
    let children = [];
    while (node) {
        if (node.nodeName.toLowerCase() === tagName.toLowerCase()) {
            children.push(node);
        }
        node = node.nextSibling;
    }

    return children;
}
