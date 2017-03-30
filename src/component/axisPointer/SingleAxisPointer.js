define(function(require) {
    'use strict';

    var graphic = require('../../util/graphic');
    var BaseAxisPointer = require('./BaseAxisPointer');
    var viewHelper = require('./viewHelper');
    var singleAxisHelper = require('../axis/singleAxisHelper');
    var AxisView = require('../axis/AxisView');

    var XY = ['x', 'y'];
    var WH = ['width', 'height'];

    var SingleAxisPointer = BaseAxisPointer.extend({

        /**
         * @override
         */
        makeElOption: function (elOption, value, axisModel, axisPointerModel, api) {
            var axis = axisModel.axis;
            var coordSys = axis.coordinateSystem;
            var otherExtent = getGlobalExtent(coordSys, 1 - getPointDimIndex(axis));
            var pixelValue = coordSys.dataToPoint(value)[0];
            var elStyle = viewHelper.buildElStyle(axisPointerModel);
            var pointerOption = pointerShapeBuilder[axisPointerModel.get('type')](
                axis, pixelValue, otherExtent, elStyle
            );
            pointerOption.style = elStyle;

            elOption.graphicKey = pointerOption.type;
            elOption.pointer = pointerOption;

            var layoutInfo = singleAxisHelper.layout(axisModel);
            viewHelper.buildCartesianSingleLabelElOption(
                value, elOption, layoutInfo, axisModel, axisPointerModel, api
            );
        },

        /**
         * @override
         */
        getHandleTransform: function (value, axisModel, axisPointerModel) {
            var layoutInfo = singleAxisHelper.layout(axisModel, {labelInside: false});
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
            var coordSys = axis.coordinateSystem;
            var dimIndex = getPointDimIndex(axis);
            var axisExtent = getGlobalExtent(coordSys, dimIndex);
            var currPosition = transform.position;
            currPosition[dimIndex] += delta[dimIndex];
            currPosition[dimIndex] = Math.min(axisExtent[1], currPosition[dimIndex]);
            currPosition[dimIndex] = Math.max(axisExtent[0], currPosition[dimIndex]);
            var otherExtent = getGlobalExtent(coordSys, 1 - dimIndex);
            var cursorOtherValue = (otherExtent[1] + otherExtent[0]) / 2;
            var cursorPoint = [cursorOtherValue, cursorOtherValue];
            cursorPoint[dimIndex] = currPosition[dimIndex];

            return {
                position: currPosition,
                rotation: transform.rotation,
                cursorPoint: cursorPoint,
                tooltipOption: {
                    verticalAlign: 'middle'
                }
            };
        }
    });

    var pointerShapeBuilder = {

        line: function (axis, pixelValue, otherExtent, elStyle) {
            var targetShape = viewHelper.makeLineShape(
                [pixelValue, otherExtent[0]],
                [pixelValue, otherExtent[1]],
                getPointDimIndex(axis)
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
                    getPointDimIndex(axis)
                )
            };
        }
    };

    function getPointDimIndex(axis) {
        return axis.isHorizontal() ? 0 : 1;
    }

    function getGlobalExtent(coordSys, dimIndex) {
        var rect = coordSys.getRect();
        return [rect[XY[dimIndex]], rect[XY[dimIndex]] + rect[WH[dimIndex]]];
    }

    AxisView.registerAxisPointerClass('SingleAxisPointer', SingleAxisPointer);

    return SingleAxisPointer;
});