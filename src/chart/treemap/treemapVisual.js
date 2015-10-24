define(function (require) {

    var VisualMapping = require('../../visual/VisualMapping');
    var zrColor = require('zrender/tool/color');
    var zrUtil = require('zrender/core/util');
    var isArray = zrUtil.isArray;
    var each = zrUtil.each;

    var VISUAL_LIST = ['color', 'colorA', 'colorS'];

    return function (ecModel, payload) {
        var globalColorList = ecModel.get('color');

        ecModel.eachSeriesByType('treemap', function (seriesModel) {

            if (payload && payload.seriesId && seriesModel.uid !== payload.seriesId) {
                return;
            }

            var root = seriesModel.getData().tree.root;

            if (root.isRemoved()) {
                return;
            }

            var rootVisual = {};
            each(VISUAL_LIST, function (name) {
                var visual = seriesModel.get('itemStyle.normal.' + name);
                rootVisual[name] = isArray(visual) ? null : visual;
            });

            !rootVisual.color && (rootVisual.color = globalColorList);

            travelTree(
                root,
                rootVisual,
                seriesModel,
                seriesModel.getViewRoot().getAncestors()
            );
        });
    };

    function travelTree(node, designatedVisual, seriesModel, viewRootAncestors) {
        var visuals = buildVisuals(node, designatedVisual, seriesModel);

        var viewChildren = node.viewChildren;
        if (!viewChildren || !viewChildren.length) {
            // Apply visual to this node.
            node.setVisual('color', calculateColor(visuals, node));
        }
        else {
            var mappingWrap = buildVisualMapping(node, visuals, viewChildren);
            // Designate visual to children.
            zrUtil.each(viewChildren, function (child, index) {
                // If higher than viewRoot, only ancestors of viewRoot is needed to visit.
                if (child.depth >= viewRootAncestors.length || child === viewRootAncestors[child.depth]) {
                    var childVisual = mapVisual(node, visuals, child, index, mappingWrap);
                    travelTree(child, childVisual, seriesModel, viewRootAncestors);
                }
            });
        }
    }

    function buildVisuals(node, designatedVisual, seriesModel) {
        var visuals = zrUtil.extend({}, designatedVisual);

        zrUtil.each(VISUAL_LIST, function (visualName) {
            // Priority: thisNode > thisLevel > parentNodeDesignated
            var visualValue = node.getModel('itemStyle.normal').get(visualName, true); // Ignore parent

            if (visualValue == null) {
                var levelModel = node.getLevelModel();
                visualValue = levelModel ? levelModel.get(visualName, true) : null;
            }
            if (visualValue == null) {
                visualValue = designatedVisual[visualName];
            }

            if (visualValue != null) {
                visuals[visualName] = visualValue;
            }
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

    function buildVisualMapping(node, visuals, viewChildren) {
        if (!viewChildren || !viewChildren.length) {
            return;
        }

        var mappingVisualName = getRangeVisualName(visuals, 'color')
            || (
                visuals.color != null
                && (
                    getRangeVisualName(visuals, 'colorA')
                    || getRangeVisualName(visuals, 'colorS')
                )
            );

        if (!mappingVisualName) {
            return;
        }

        var mappingType = mappingVisualName === 'color'
            ? (
                node.getModel('itemStyle.normal').get('colorMapping') === 'byValue'
                    ? 'color' : 'colorByIndex'
            )
            : mappingVisualName;

        var dataExtent = mappingType === 'colorByIndex'
            ? null
            : calculateDataExtent(node, viewChildren);

        return {
            mapping: new VisualMapping({
                type: mappingType,
                dataExtent: dataExtent,
                dataNormalizer: 'linear',
                visual: visuals[mappingVisualName]
            }),
            visualName: mappingVisualName
        };
    }

    function calculateDataExtent(node, viewChildren) {
        var dimension = node.getModel().get('colorDimension');

        // The same as area dimension.
        if (dimension === 'value') {
            return [
                viewChildren[viewChildren.length - 1].getValue(),
                viewChildren[0].getValue()
            ];
        }
        // Other dimension.
        else {
            var dataExtent = [Infinity, -Infinity];
            each(viewChildren, function (child) {
                var value = child.getValue(dimension);
                value < dataExtent[0] && (dataExtent[0] = value);
                value > dataExtent[1] && (dataExtent[1] = value);
            });
        }
    }

    function mapVisual(node, visuals, child, index, mappingWrap) {
        var childVisuals = zrUtil.extend({}, visuals);

        if (mappingWrap) {
            var mapping = mappingWrap.mapping;
            var value = mapping.type === 'colorByIndex'
                ? index : child.getValue(node.getModel().get('colorDimension'));

            childVisuals[mappingWrap.visualName] = mapping.mapValueToVisual(value);
        }

        return childVisuals;
    }

    function getValueVisualDefine(visuals, name) {
        var value = visuals[name];
        if (value != null && !isArray(value)) {
            return value;
        }
    }

    function getRangeVisualName(visuals, name) {
        var value = visuals[name];
        if (value != null && isArray(value)) {
            return name;
        }
    }

});