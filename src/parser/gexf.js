// GEXF File Parser
// http://gexf.net/1.2draft/gexf-12draft-primer.pdf
define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    function parse(xml) {
        var doc;
        if (typeof xml === 'string') {
            var parser = new DOMParser();
            doc = parser.parseFromString(xml, 'text/xml');
        }
        else {
            doc = xml;
        }
        if (!doc || doc.getElementsByTagName("parsererror").length) {
            return null;
        }

        var gexfRoot = doc.firstChild;

        if (!gexfRoot) {
            return null;
        }

        var graphRoot = getChildByTagName(gexfRoot, 'graph');

        var attributes = parseAttributes(getChildByTagName(graphRoot, 'attributes'));
        var attributesMap = {};
        for (var i = 0; i < attributes.length; i++) {
            attributesMap[attributes[i].name] = attributes[i];
        }

        return {
            nodes: parseNodes(getChildByTagName(graphRoot, 'nodes'), attributesMap),
            links: parseEdges(getChildByTagName(graphRoot, 'edges'))
        };
    }

    function parseAttributes(parent) {
        return parent ? zrUtil.map(getChildrenByTagName(parent, 'attribute'), function (attribDom) {
            return {
                name: attribDom.getAttribute('id'),
                title: attribDom.getAttribute('title'),
                type: attribDom.getAttribute('type')
            };
        }) : [];
    }

    function parseNodes(parent, attributesMap) {
        return parent ? zrUtil.map(getChildrenByTagName(parent, 'node'), function (nodeDom) {

            var id = nodeDom.getAttribute('id');
            var label = nodeDom.getAttribute('label');

            var node = {
                name: id,
                label: {
                    normal: {
                        formatter: label
                    }
                },
                itemStyle: {
                    normal: {}
                }
            };

            var vizSizeDom = getChildByTagName(nodeDom, 'viz:size');
            var vizPosDom = getChildByTagName(nodeDom, 'viz:position');
            var vizColorDom = getChildByTagName(nodeDom, 'viz:color');
            var vizShapeDom = getChildByTagName(nodeDom, 'viz:shape');

            var attvaluesDom = getChildByTagName(nodeDom, 'attvalues');

            if (vizSizeDom) {
                node.itemStyle.normal.symbolSize = parseFloat(vizSizeDom.getAttribute('value'));
            }
            if (vizPosDom) {
                node.x = parseFloat(vizPosDom.getAttribute('x'));
                node.y = parseFloat(vizPosDom.getAttribute('y'));
                // z
            }
            if (vizColorDom) {
                node.itemStyle.normal.color = 'rgb(' +
                    [parseInt(vizColorDom.getAttribute('r')),
                    parseInt(vizColorDom.getAttribute('g')),
                    parseInt(vizColorDom.getAttribute('b'))].join(',')
                    + ')';
            }
            if (vizShapeDom) {
                // node.shape = vizShapeDom.getAttribute('shape');
            }
            if (attvaluesDom) {
                var attvalueDomList = getChildrenByTagName(attvaluesDom, 'attvalue');

                node.attributes = {};

                for (var j = 0; j < attvalueDomList.length; j++) {
                    var attvalueDom = attvalueDomList[j];
                    var attId = attvalueDom.getAttribute('for');
                    var attValue = attvalueDom.getAttribute('value');
                    var attribute = attributesMap[attId];

                    if (attribute) {
                        switch (attribute.type) {
                            case "integer":
                            case "long":
                                attValue = parseInt(attValue);
                                break;
                            case "float":
                            case "double":
                                attValue = parseFloat(attValue);
                                break;
                            case "boolean":
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
            var id = edgeDom.getAttribute('id');
            var label = edgeDom.getAttribute('label');

            var sourceId = edgeDom.getAttribute('source');
            var targetId = edgeDom.getAttribute('target');

            var edge = {
                name: id,
                source: sourceId,
                target: targetId,
                linkStyle: {
                    normal: {}
                }
            };

            var linkStyle = edge.linkStyle.normal;

            var vizThicknessDom = getChildByTagName(edgeDom, 'viz:thickness');
            var vizColorDom = getChildByTagName(edgeDom, 'viz:color');
            var vizShapeDom = getChildByTagName(edgeDom, 'viz:shape');

            if (vizThicknessDom) {
                linkStyle.thickness = parseFloat(vizThicknessDom.getAttribute('value'));
            }
            if (vizColorDom) {
                linkStyle.color = 'rgb(' + [
                    parseInt(vizColorDom.getAttribute('r')),
                    parseInt(vizColorDom.getAttribute('g')),
                    parseInt(vizColorDom.getAttribute('b'))
                ].join(',') + ')';
            }
            // if (vizShapeDom) {
            //     edge.shape = vizShapeDom.getAttribute('shape');
            // }

            return edge;
        }) : [];
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
});