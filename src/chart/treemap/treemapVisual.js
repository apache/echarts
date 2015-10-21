define(function (require) {

    var VisualMapping = require('../../visual/VisualMapping');
    var zrColor = require('zrender/tool/color');
    var zrUtil = require('zrender/core/util');
    var isArray = zrUtil.isArray;
    var each = zrUtil.each;

    var VISUAL_LIST = ['color', 'colorA', 'colorS'];

    return function (ecModel) {
        var globalColorList = ecModel.get('color');

        ecModel.eachSeriesByType('treemap', function (seriesModel) {
            var rootVisual = {};
            each(VISUAL_LIST, function (name) {
                var visual = seriesModel.get('itemStyle.normal.' + name);
                rootVisual[name] = isArray(visual) ? null : visual;
            });

            !rootVisual.color && (rootVisual.color = globalColorList);

            travelTree(seriesModel.getViewRoot(), rootVisual, seriesModel);
        });
    };

    function travelTree(node, designatedVisual, seriesModel) {
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
                var childVisual = mapVisual(node, visuals, child, index, mappingWrap);
                travelTree(child, childVisual, seriesModel);
            });
        }
    }

    function buildVisuals(node, designatedVisual, seriesModel) {
        var visuals = zrUtil.extend({}, designatedVisual);

        zrUtil.each(VISUAL_LIST, function (visualName) {
            // Priority: thisNode > thisLevel > parentNodeDesignated
            var path = 'itemStyle.normal.' + visualName;

            var visualValue = node.modelGet(path); // Ignore parent

            if (visualValue == null) {
                visualValue = retrieve(path, seriesModel.option.levels[node.depth]);
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
                node.modelGet('itemStyle.normal.colorMapping') === 'byValue'
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
        var dimension = node.modelGet('colorDimension');

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
                ? index : child.getValue(node.modelGet('colorDimension'));

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

    // FIXME
    // 这段代码是否和model中的复用？
    function retrieve(path, base) {
        path = path.split('.');

        var obj = base;
        for (var i = 0; i < path.length; i++) {
            obj = obj && obj[path[i]];
            if (obj == null) {
                break;
            }
        }

        return obj;
    }

});