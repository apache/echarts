define(function (require) {

    var VisualMapping = require('../../visual/VisualMapping');
    var zrColor = require('zrender/tool/color');
    var zrUtil = require('zrender/core/util');
    var helper = require('./helper');
    var isArray = zrUtil.isArray;

    var ITEM_STYLE_NORMAL = 'itemStyle.normal';

    return function (ecModel, payload) {
        ecModel.eachSeriesByType('treemap', function (seriesModel) {

            if (helper.irrelevant(payload, seriesModel)) {
                return;
            }

            var tree = seriesModel.getData().tree;
            var root = tree.root;
            var seriesItemStyleModel = seriesModel.getModel(ITEM_STYLE_NORMAL);

            if (root.isRemoved()) {
                return;
            }

            var levelItemStyles = zrUtil.map(tree.levelModels, function (levelModel) {
                return levelModel ? levelModel.get(ITEM_STYLE_NORMAL) : null;
            });

            travelTree(
                root,
                {},
                levelItemStyles,
                seriesItemStyleModel,
                seriesModel.getViewRoot().getAncestors()
            );
        });
    };

    function travelTree(
        node, designatedVisual, levelItemStyles, seriesItemStyleModel, viewRootAncestors
    ) {
        var nodeModel = node.getModel();
        var nodeLayout = node.getLayout();

        // Optimize
        if (nodeLayout.invisible) {
            return;
        }

        var nodeItemStyleModel = node.getModel(ITEM_STYLE_NORMAL);
        var levelItemStyle = levelItemStyles[node.depth];
        var visuals = buildVisuals(
            nodeItemStyleModel, designatedVisual, levelItemStyle, seriesItemStyleModel
        );

        // calculate border color
        var borderColor = nodeItemStyleModel.get('borderColor');
        var borderColorS = nodeItemStyleModel.get('borderColorS');
        var thisNodeColor;
        if (borderColorS != null) {
            // For performance, do not always execute 'calculateColor'.
            thisNodeColor = calculateColor(visuals, node);
            borderColor = calculateBorderColor(borderColorS, thisNodeColor);
        }
        node.setVisual('borderColor', borderColor);

        var viewChildren = node.viewChildren;
        if (!viewChildren || !viewChildren.length) {
            thisNodeColor = calculateColor(visuals, node);
            // Apply visual to this node.
            node.setVisual('color', thisNodeColor);
        }
        else {
            var mappingWrap = buildVisualMapping(
                node, nodeModel, nodeLayout, nodeItemStyleModel, visuals, viewChildren
            );
            // Designate visual to children.
            zrUtil.each(viewChildren, function (child, index) {
                // If higher than viewRoot, only ancestors of viewRoot is needed to visit.
                if (child.depth >= viewRootAncestors.length
                    || child === viewRootAncestors[child.depth]
                ) {
                    var childVisual = mapVisual(nodeModel, visuals, child, index, mappingWrap);
                    travelTree(
                        child, childVisual, levelItemStyles, seriesItemStyleModel, viewRootAncestors
                    );
                }
            });
        }
    }

    function buildVisuals(
        nodeItemStyleModel, designatedVisual, levelItemStyle, seriesItemStyleModel
    ) {
        var visuals = zrUtil.extend({}, designatedVisual);

        zrUtil.each(['color', 'colorA', 'colorS'], function (visualName) {
            // Priority: thisNode > thisLevel > parentNodeDesignated > seriesModel
            var val = nodeItemStyleModel.get(visualName, true); // Ignore parent
            val == null && levelItemStyle && (val = levelItemStyle[visualName]);
            val == null && (val = designatedVisual[visualName]);
            val == null && (val = seriesItemStyleModel.get(visualName));

            val != null && (visuals[visualName] = val);
        });

        return visuals;
    }

    function calculateColor(visuals) {
        var color = getValueVisualDefine(visuals, 'color');

        if (color) {
            var colorA = getValueVisualDefine(visuals, 'colorA');
            var colorS = getValueVisualDefine(visuals, 'colorS');
            if (colorS) {
                color = zrColor.modifyHSL(color, null, null, colorS);
            }
            if (colorA) {
                color = zrColor.modifyAlpha(color, colorA);
            }

            return color;
        }
    }

    function calculateBorderColor(borderColorS, thisNodeColor) {
        return thisNodeColor != null
             ? zrColor.modifyHSL(thisNodeColor, null, null, borderColorS)
             : null;
    }

    function getValueVisualDefine(visuals, name) {
        var value = visuals[name];
        if (value != null && value !== 'none') {
            return value;
        }
    }

    function buildVisualMapping(
        node, nodeModel, nodeLayout, nodeItemStyleModel, visuals, viewChildren
    ) {
        if (!viewChildren || !viewChildren.length) {
            return;
        }

        var rangeVisual = getRangeVisual(nodeModel, 'color')
            || (
                visuals.color != null
                && visuals.color !== 'none'
                && (
                    getRangeVisual(nodeModel, 'colorA')
                    || getRangeVisual(nodeModel, 'colorS')
                )
            );

        if (!rangeVisual) {
            return;
        }

        var mappingType = rangeVisual.name === 'color'
            ? (
                nodeModel.get('colorMapping') === 'byValue'
                    ? 'color' : 'colorByIndex'
            )
            : rangeVisual.name;

        var dataExtent = mappingType === 'colorByIndex'
            ? null : nodeLayout.dataExtent;

        return {
            mapping: new VisualMapping({
                type: mappingType,
                dataExtent: dataExtent,
                dataNormalizer: 'linear',
                visual: rangeVisual.range
            }),
            visualName: rangeVisual.name
        };
    }

    // Notice: If we dont have the attribute 'colorRange', but only use
    // attribute 'color' to represent both concepts of 'colorRange' and 'color',
    // (It means 'colorRange' when 'color' is Array, means 'color' when not array),
    // this problem will be encountered:
    // If a level-1 node dont have children, and its siblings has children,
    // and colorRange is set on level-1, then the node can not be colored.
    // So we separate 'colorRange' and 'color' to different attributes.
    function getRangeVisual(nodeModel, name) {
        // 'colorRange', 'colorARange', 'colorSRange'.
        // If not exsits on this node, fetch from levels and series.
        var range = nodeModel.get(name);
        return (isArray(range) && range.length) ? {name: name, range: range} : null;
    }

    function mapVisual(nodeModel, visuals, child, index, mappingWrap) {
        var childVisuals = zrUtil.extend({}, visuals);

        if (mappingWrap) {
            var mapping = mappingWrap.mapping;
            var value = mapping.type === 'colorByIndex'
                ? index : child.getValue(nodeModel.get('visualDimension'));

            childVisuals[mappingWrap.visualName] = mapping.mapValueToVisual(value);
        }

        return childVisuals;
    }

});