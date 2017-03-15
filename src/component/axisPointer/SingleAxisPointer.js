define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var BaseAxisPointer = require('./BaseAxisPointer');
    var viewHelper = require('./viewHelper');
    var singleAxisHelper = require('../axis/singleAxisHelper');
    var matrix = require('zrender/core/matrix');
    var AxisBuilder = require('../axis/AxisBuilder');

    var XY = ['x', 'y'];
    var WH = ['width', 'height'];

    var SingleAxisPointer = BaseAxisPointer.extend({

        /**
         * @override
         */
        makeElOption: function (elOption, value, axisModel, axisPointerModel) {
            var axis = axisModel.axis;
            var coordSys = axis.coordinateSystem;
            var rect = coordSys.getRect();
            var otherDimIndex = 1 - getPointDimIndex(axis);
            var otherExtent = [rect[XY[otherDimIndex]], rect[XY[otherDimIndex]] + rect[WH[otherDimIndex]]];
            var pixelValue = coordSys.dataToPoint(value)[0];

            var elStyle = viewHelper.buildElStyle(axisPointerModel);
            var pointerOption = pointerShapeBuilder[axisPointerModel.get('type')](
                axis, pixelValue, otherExtent, elStyle
            );
            pointerOption.style = elStyle;

            elOption.graphicKey = pointerOption.type;
            elOption.pointer = pointerOption;

            var labelMargin = axisPointerModel.get('label.margin');
            var labelPos = getLabelPosition(value, axisModel, axisPointerModel, labelMargin);
            viewHelper.buildLabelElOption(
                elOption, value, labelPos, axisModel, axisPointerModel
            );
        }
    });


    function getLabelPosition(value, axisModel, axisPointerModel, labelMargin) {
        var axis = axisModel.axis;
        var layout = singleAxisHelper.layout(axisModel);

        var transform = matrix.create();
        matrix.rotate(transform, transform, layout.rotation);
        matrix.translate(transform, transform, layout.position);

        var position = graphic.applyTransform([
            axis.dataToCoord(value),
            0 + layout.labelDirection * labelMargin
        ], transform);

        var labelRotation = zrUtil.retrieve(layout.labelRotation, axisPointerModel.get('label.rotate')) || 0;
        labelRotation = labelRotation * Math.PI / 180;

        var labelLayout = AxisBuilder.innerTextLayout(layout.rotation, labelRotation, layout.labelDirection);

        return {
            position: position,
            align: labelLayout.textAlign,
            verticalAlign: labelLayout.textVerticalAlign
        };
    }

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

    return SingleAxisPointer;
});