define(function(require) {
    'use strict';

    var graphic = require('../../util/graphic');
    var BaseAxisPointer = require('./BaseAxisPointer');
    var viewHelper = require('./viewHelper');
    var cartesianAxisHelper = require('../axis/cartesianAxisHelper');
    var AxisView = require('../axis/AxisView');

    var CartesianAxisPointer = BaseAxisPointer.extend({

        /**
         * @override
         */
        makeElOption: function (elOption, value, axisModel, axisPointerModel, api) {
            var axis = axisModel.axis;
            var grid = axis.grid;
            var axisPointerType = axisPointerModel.get('type');
            var otherExtent = getCartesian(grid, axis).getOtherAxis(axis).getGlobalExtent();
            var pixelValue = axis.toGlobalCoord(axis.dataToCoord(value, true));

            if (axisPointerType && axisPointerType !== 'none') {
                var elStyle = viewHelper.buildElStyle(axisPointerModel);
                var pointerOption = pointerShapeBuilder[axisPointerType](
                    axis, pixelValue, otherExtent, elStyle
                );
                pointerOption.style = elStyle;
                elOption.graphicKey = pointerOption.type;
                elOption.pointer = pointerOption;
            }

            var layoutInfo = cartesianAxisHelper.layout(grid.model, axisModel);
            viewHelper.buildCartesianSingleLabelElOption(
                value, elOption, layoutInfo, axisModel, axisPointerModel, api
            );
        },

        /**
         * @override
         */
        getHandleTransform: function (value, axisModel, axisPointerModel) {
            var layoutInfo = cartesianAxisHelper.layout(axisModel.axis.grid.model, axisModel, {
                labelInside: false
            });
            layoutInfo.labelMargin = axisPointerModel.get('handle.margin');
            return {
                position: viewHelper.getTransformedPosition(axisModel.axis, value, layoutInfo),
                rotation: layoutInfo.rotation + (layoutInfo.labelDirection < 0 ? Math.PI : 0)
            };
        },

        /**
         * @override
         */
        updateHandleTransform: function (transform, delta, axisModel, axisPointerModel) {
            var axis = axisModel.axis;
            var grid = axis.grid;
            var axisExtent = axis.getGlobalExtent(true);
            var otherExtent = getCartesian(grid, axis).getOtherAxis(axis).getGlobalExtent();
            var dimIndex = axis.dim === 'x' ? 0 : 1;

            var currPosition = transform.position;
            currPosition[dimIndex] += delta[dimIndex];
            currPosition[dimIndex] = Math.min(axisExtent[1], currPosition[dimIndex]);
            currPosition[dimIndex] = Math.max(axisExtent[0], currPosition[dimIndex]);

            var cursorOtherValue = (otherExtent[1] + otherExtent[0]) / 2;
            var cursorPoint = [cursorOtherValue, cursorOtherValue];
            cursorPoint[dimIndex] = currPosition[dimIndex];

            // Make tooltip do not overlap axisPointer and in the middle of the grid.
            var tooltipOptions = [{verticalAlign: 'middle'}, {align: 'center'}];

            return {
                position: currPosition,
                rotation: transform.rotation,
                cursorPoint: cursorPoint,
                tooltipOption: tooltipOptions[dimIndex]
            };
        }

    });

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

    AxisView.registerAxisPointerClass('CartesianAxisPointer', CartesianAxisPointer);

    return CartesianAxisPointer;
});