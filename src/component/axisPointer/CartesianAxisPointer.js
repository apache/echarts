define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var BaseAxisPointer = require('./BaseAxisPointer');
    var viewHelper = require('./viewHelper');
    var cartesianAxisHelper = require('../axis/cartesianAxisHelper');
    var matrix = require('zrender/core/matrix');
    var AxisBuilder = require('../axis/AxisBuilder');

    var CartesianAxisPointer = BaseAxisPointer.extend({

        /**
         * @override
         */
        makeElOption: function (elOption, value, axisModel, axisPointerModel) {
            var axis = axisModel.axis;
            var grid = axis.grid;
            var axisPointerType = axisPointerModel.get('type');
            var otherExtent = getCartesian(grid, axis).getOtherAxis(axis).getGlobalExtent();
            var pixelValue = axis.toGlobalCoord(axis.dataToCoord(value, true));

            var elStyle = viewHelper.buildElStyle(axisPointerModel);
            var pointerOption = pointerShapeBuilder[axisPointerType](axis, pixelValue, otherExtent, elStyle);
            pointerOption.style = elStyle;

            elOption.graphicKey = pointerOption.type;
            elOption.pointer = pointerOption;

            var labelMargin = axisPointerModel.get('label.margin');
            var labelPos = getLabelPosition(value, axisModel, axisPointerModel, grid, labelMargin);
            viewHelper.buildLabelElOption(elOption, value, labelPos, axisModel, axisPointerModel);
        },

        /**
         * @override
         */
        getHandleTransform: function (value, axisModel, axisPointerModel) {
            var handleMargin = axisPointerModel.get('handle.margin');
            var handlePos = getLabelPosition(
                value, axisModel, axisPointerModel, axisModel.axis.grid, handleMargin
            );

            return {
                position: handlePos.position,
                rotation: handlePos.rotation
            };
        },

        /**
         * @override
         */
        updateHandleTransform: function (transform, delta, axisModel, axisPointerModel) {
            var axis = axisModel.axis;
            var grid = axis.grid;
            var axisExtent = axis.getGlobalExtent(true);
            var currPosition = transform.position;
            var dimIndex = axis.dim === 'x' ? 0 : 1;
            currPosition[dimIndex] += delta[dimIndex];
            currPosition[dimIndex] = Math.min(axisExtent[1], currPosition[dimIndex]);
            currPosition[dimIndex] = Math.max(axisExtent[0], currPosition[dimIndex]);
            var otherExtent = getCartesian(grid, axis).getOtherAxis(axis).getGlobalExtent();
            var cursorOtherValue = (otherExtent[1] + otherExtent[0]) / 2;
            var cursorPoint = [cursorOtherValue, cursorOtherValue];
            cursorPoint[dimIndex] = currPosition[dimIndex];

            return {position: currPosition, rotation: transform.rotation, cursorPoint: cursorPoint};
        }

    });

    function getLabelPosition(value, axisModel, axisPointerModel, grid, labelMargin) {
        var axis = axisModel.axis;
        var layout = cartesianAxisHelper.layout(grid.model, axisModel);

        var transform = matrix.create();
        matrix.rotate(transform, transform, layout.rotation);
        matrix.translate(transform, transform, layout.position);

        var position = graphic.applyTransform([
            axis.dataToCoord(value),
            layout.labelOffset + layout.labelDirection * labelMargin
        ], transform);

        var labelRotation = zrUtil.retrieve(layout.labelRotation, axisPointerModel.get('label.rotate')) || 0;
        labelRotation = labelRotation * Math.PI / 180;

        var labelLayout = AxisBuilder.innerTextLayout(layout.rotation, labelRotation, layout.labelDirection);

        return {
            position: position,
            align: labelLayout.textAlign,
            verticalAlign: labelLayout.textVerticalAlign,
            rotation: -layout.rotation
        };
    }

    function getCartesian(grid, axis) {
        var opt = {};
        opt[axis.dim + 'AxisIndex'] = axis.index;
        return grid.getCartesian(opt);
    }

    var pointerShapeBuilder = {

        line: function (axis, pixelValue, otherExtent, elStyle) {
            var targetShape = viewHelper.makeLineShape(
                [pixelValue, otherExtent[0]],
                [pixelValue, otherExtent[1]],
                getAxisDimIndex(axis)
            );
            graphic.subPixelOptimizeLine({
                shape: targetShape,
                style: elStyle
            });
            return {
                type: 'Line',
                shape: targetShape
            };
        },

        shadow: function (axis, pixelValue, otherExtent, elStyle) {
            var bandWidth = axis.getBandWidth();
            var span = otherExtent[1] - otherExtent[0];
            return {
                type: 'Rect',
                shape: viewHelper.makeRectShape(
                    [pixelValue - bandWidth / 2, otherExtent[0]],
                    [bandWidth, span],
                    getAxisDimIndex(axis)
                )
            };
        }
    };

    function getAxisDimIndex(axis) {
        return axis.dim === 'x' ? 0 : 1;
    }

    return CartesianAxisPointer;
});