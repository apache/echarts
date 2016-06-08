define(function (require) {

    var VisualMapping = require('../../visual/VisualMapping');
    var zrColor = require('zrender/tool/color');
    var zrUtil = require('zrender/core/util');
    var isArray = zrUtil.isArray;

    var ITEM_STYLE_NORMAL = 'itemStyle.normal';

    return function (ecModel, api, payload) {

        var condition = {mainType: 'series', subType: 'treemap', query: payload};
        ecModel.eachComponent(condition, function (seriesModel) {

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
                root, // Visual should calculate from tree root but not view root.
                {},
                levelItemStyles,
                seriesItemStyleModel,
                seriesModel.getViewRoot().getAncestors(),
                seriesModel
            );
        });
    };

    function travelTree(
        node, designatedVisual, levelItemStyles, seriesItemStyleModel,
        viewRootAncestors, seriesModel
    ) {
        var nodeModel = node.getModel();
        var nodeLayout = node.getLayout();

        // Optimize
        if (!nodeLayout || nodeLayout.invisible || !nodeLayout.isInView) {
            return;
        }

        var nodeItemStyleModel = node.getModel(ITEM_STYLE_NORMAL);
        var levelItemStyle = levelItemStyles[node.depth];
        var visuals = buildVisuals(
            nodeItemStyleModel, designatedVisual, levelItemStyle, seriesItemStyleModel
        );

        // calculate border color
        var borderColor = nodeItemStyleModel.get('borderColor');
        var borderColorSaturation = nodeItemStyleModel.get('borderColorSaturation');
        var thisNodeColor;
        if (borderColorSaturation != null) {
            // For performance, do not always execute 'calculateColor'.
            thisNodeColor = calculateColor(visuals, node);
            borderColor = calculateBorderColor(borderColorSaturation, thisNodeColor);
        }
        node.setVisual('borderColor', borderColor);

        var viewChildren = node.viewChildren;
        if (!viewChildren || !viewChildren.length) {
            thisNodeColor = calculateColor(visuals, node);
            // Apply visual to this node.
            node.setVisual('color', thisNodeColor);
        }
        else {
            var mapping = buildVisualMapping(
                node, nodeModel, nodeLayout, nodeItemStyleModel, visuals, viewChildren
            );
            // Designate visual to children.
            zrUtil.each(viewChildren, function (child, index) {
                // If higher than viewRoot, only ancestors of viewRoot is needed to visit.
                if (child.depth >= viewRootAncestors.length
                    || child === viewRootAncestors[child.depth]
                ) {
                    var childVisual = mapVisual(
                        nodeModel, visuals, child, index, mapping, seriesModel
                    );
                    travelTree(
                        child, childVisual, levelItemStyles, seriesItemStyleModel,
                        viewRootAncestors, seriesModel
                    );
                }
            });
        }
    }

    function buildVisuals(
        nodeItemStyleModel, designatedVisual, levelItemStyle, seriesItemStyleModel
    ) {
        var visuals = zrUtil.extend({}, designatedVisual);

        zrUtil.each(['color', 'colorAlpha', 'colorSaturation'], function (visualName) {
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
            var colorAlpha = getValueVisualDefine(visuals, 'colorAlpha');
            var colorSaturation = getValueVisualDefine(visuals, 'colorSaturation');
            if (colorSaturation) {
                color = zrColor.modifyHSL(color, null, null, colorSaturation);
            }
            if (colorAlpha) {
                color = zrColor.modifyAlpha(color, colorAlpha);
            }

            return color;
        }
    }

    function calculateBorderColor(borderColorSaturation, thisNodeColor) {
        return thisNodeColor != null
             ? zrColor.modifyHSL(thisNodeColor, null, null, borderColorSaturation)
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
                    getRangeVisual(nodeModel, 'colorAlpha')
                    || getRangeVisual(nodeModel, 'colorSaturation')
                )
            );

        if (!rangeVisual) {
            return;
        }

        var colorMappingBy = nodeModel.get('colorMappingBy');
        var opt = {
            type: rangeVisual.name,
            dataExtent: nodeLayout.dataExtent,
            visual: rangeVisual.range
        };
        if (opt.type === 'color'
            && (colorMappingBy === 'index' || colorMappingBy === 'id')
        ) {
            opt.mappingMethod = 'category';
            opt.loop = true;
            // categories is ordinal, so do not set opt.categories.
        }
        else {
            opt.mappingMethod = 'linear';
        }

        var mapping = new VisualMapping(opt);
        mapping.__drColorMappingBy = colorMappingBy;

        return mapping;
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

    function mapVisual(nodeModel, visuals, child, index, mapping, seriesModel) {
        var childVisuals = zrUtil.extend({}, visuals);

        if (mapping) {
            var mappingType = mapping.type;
            var colorMappingBy = mappingType === 'color' && mapping.__drColorMappingBy;
            var value =
                colorMappingBy === 'index'
                ? index
                : colorMappingBy === 'id'
                ? seriesModel.mapIdToIndex(child.getId())
                : child.getValue(nodeModel.get('visualDimension'));

            childVisuals[mappingType] = mapping.mapValueToVisual(value);
        }

        return childVisuals;
    }

});