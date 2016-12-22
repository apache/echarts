define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var symbolUtil = require('../../util/symbol');
    var numberUtil = require('../../util/number');
    var helper = require('./helper');

    var parsePercent = numberUtil.parsePercent;

    // index: +isHorizontal
    var LAYOUT_ATTRS = [
        {xy: 'x', wh: 'width', index: 0, posDesc: ['left', 'right']},
        {xy: 'y', wh: 'height', index: 1, posDesc: ['top', 'bottom']}
    ];

    var BarView = require('../../echarts').extendChartView({

        type: 'pictorialBar',

        render: function (seriesModel, ecModel, api) {
            var group = this.group;
            var data = seriesModel.getData();
            var oldData = this._data;

            var cartesian = seriesModel.coordinateSystem;
            var baseAxis = cartesian.getBaseAxis();
            var isHorizontal = !!baseAxis.isHorizontal();
            var coordSysRect = cartesian.grid.getRect();

            var opt = {
                seriesModel: seriesModel,
                coordSys: cartesian,
                coordSysExtent: [
                    [coordSysRect.x, coordSysRect.x + coordSysRect.width],
                    [coordSysRect.y, coordSysRect.y + coordSysRect.height]
                ],
                animationModel: seriesModel.isAnimationEnabled() ? seriesModel : null,
                isHorizontal: isHorizontal,
                valueDim: LAYOUT_ATTRS[+isHorizontal],
                categoryDim: LAYOUT_ATTRS[1 - isHorizontal],
                hoverAnimation: seriesModel.get('hoverAnimation')
            };

            data.diff(oldData)
                .add(function (dataIndex) {
                    if (!data.hasValue(dataIndex)) {
                        return;
                    }

                    var itemModel = data.getItemModel(dataIndex);
                    var symbolMeta = getSymbolMeta(data, dataIndex, itemModel, opt);

                    var bar = createBar(data, dataIndex, itemModel, opt, symbolMeta);
                    bar.__pictorialShapeStr = getShapeStr(data, dataIndex, symbolMeta);

                    data.setItemGraphicEl(dataIndex, bar);
                    group.add(bar);

                    updateStyle(bar, dataIndex, itemModel, opt, symbolMeta);
                })
                .update(function (newIndex, oldIndex) {
                    var bar = oldData.getItemGraphicEl(oldIndex);

                    if (!data.hasValue(newIndex)) {
                        group.remove(bar);
                        return;
                    }

                    var itemModel = data.getItemModel(newIndex);
                    var symbolMeta = getSymbolMeta(data, newIndex, itemModel, opt);

                    var pictorialShapeStr = getShapeStr(data, newIndex, symbolMeta);
                    if (pictorialShapeStr !== bar.__pictorialShapeStr) {
                        group.remove(bar);
                        bar = null;
                    }

                    if (bar) {
                        updateBar(data, newIndex, itemModel, opt, symbolMeta, bar);
                    }
                    else {
                        bar = createBar(data, newIndex, itemModel, opt, symbolMeta, true);
                    }

                    data.setItemGraphicEl(newIndex, bar);
                    // Add back
                    group.add(bar);

                    updateStyle(bar, newIndex, itemModel, opt, symbolMeta);
                })
                .remove(function (dataIndex) {
                    var bar = oldData.getItemGraphicEl(dataIndex);
                    bar && removeBar(dataIndex, opt, bar);
                })
                .execute();

            this._data = data;

            return this.group;
        },

        dispose: zrUtil.noop,

        remove: function (ecModel, api) {
            var group = this.group;
            var data = this._data;
            if (ecModel.get('animation')) {
                if (data) {
                    var opt = {animationModel: ecModel};
                    data.eachItemGraphicEl(function (bar) {
                        removeBar(bar.dataIndex, opt, bar);
                    });
                }
            }
            else {
                group.removeAll();
            }
        }
    });


    // Set or calculate default value about symbol, and calculate layout info.
    function getSymbolMeta(data, dataIndex, itemModel, opt) {
        var layout = data.getItemLayout(dataIndex);
        var symbolRepeat = itemModel.get('symbolRepeat');
        var symbolClip = itemModel.get('symbolClip');
        var lineWidth = helper.getLineWidth(itemModel, layout);
        var symbolPosition = itemModel.get('symbolPosition')
            || ((symbolRepeat || symbolClip) ? 'start' : 'center');
        var symbolRotate = itemModel.get('symbolRotate');

        var symbolMeta = {
            layout: layout,
            lineWidth: lineWidth,
            symbolType: data.getItemVisual(dataIndex, 'symbol') || 'circle',
            color: data.getItemVisual(dataIndex, 'color'),
            symbolClip: symbolClip,
            symbolRepeat: symbolRepeat,
            symbolRepeatDirection: itemModel.get('symbolRepeatDirection'),
            rotation: (symbolRotate || 0) * Math.PI / 180 || 0
        };

        prepareBarLength(itemModel, symbolRepeat, layout, opt, symbolMeta);
        prepareSymbolSize(
            data, dataIndex, layout, opt, symbolRepeat, symbolClip,
            symbolMeta.barFullLength, symbolMeta
        );

        var symbolSize = symbolMeta.symbolSize;
        var symbolOffset = itemModel.get('symbolOffset');
        if (zrUtil.isArray(symbolOffset)) {
            symbolOffset = [
                parsePercent(symbolOffset[0], symbolSize[0]),
                parsePercent(symbolOffset[1], symbolSize[1])
            ];
        }

        prepareLayoutInfo(
            itemModel, symbolSize, layout, symbolRepeat, symbolClip, symbolOffset,
            symbolPosition, lineWidth, symbolMeta.barFullLength, symbolMeta.repeatLength,
            opt, symbolMeta
        );

        return symbolMeta;
    }

    // bar length can be negative.
    function prepareBarLength(itemModel, symbolRepeat, layout, opt, output) {
        var valueDim = opt.valueDim;
        var symbolBoundingData = itemModel.get('symbolBoundingData');
        var valueAxis = opt.coordSys.getOtherAxis(opt.coordSys.getBaseAxis());
        var zeroPx = valueAxis.toGlobalCoord(valueAxis.dataToCoord(0));

        var barFullLength = output.barFullLength = symbolBoundingData != null
            ? valueAxis.toGlobalCoord(valueAxis.dataToCoord(symbolBoundingData)) - zeroPx
            : symbolRepeat
            ? opt.coordSysExtent[valueDim.index][1 - +(layout[valueDim.wh] <= 0)] - zeroPx
            : layout[valueDim.wh];

        output.repeatLength = symbolBoundingData != null ? barFullLength : layout[valueDim.wh];
    }

    // Support ['100%', '100%']
    function prepareSymbolSize(data, dataIndex, layout, opt, symbolRepeat, symbolClip, barFullLength, output) {
        var valueDim = opt.valueDim;
        var categoryDim = opt.categoryDim;
        var categorySize = Math.abs(layout[categoryDim.wh]);

        var symbolSize = zrUtil.retrieve(
            data.getItemVisual(dataIndex, 'symbolSize'),
            ['100%', '100%']
        );

        if (!zrUtil.isArray(symbolSize)) {
            symbolSize = [symbolSize, symbolSize];
        }

        symbolSize[categoryDim.index] = parsePercent(
            symbolSize[categoryDim.index],
            categorySize
        );
        symbolSize[valueDim.index] = parsePercent(
            symbolSize[valueDim.index],
            symbolRepeat ? categorySize : Math.abs(barFullLength)
        );

        output.symbolSize = symbolSize;
    }

    function prepareLayoutInfo(
        itemModel, symbolSize, layout, symbolRepeat, symbolClip, symbolOffset,
        symbolPosition, lineWidth, barFullLength, repeatLength, opt, output
    ) {
        var categoryDim = opt.categoryDim;
        var valueDim = opt.valueDim;

        var symbolMargin = parsePercent(
            zrUtil.retrieve(itemModel.get('symbolMargin'), symbolRepeat ? '15%' : 0),
            symbolSize[valueDim.index]
        );

        var unitLength = symbolSize[valueDim.index] + lineWidth;
        var pathLength;
        if (symbolRepeat) {
            var unitWithMargin = unitLength + symbolMargin * 2;
            var absBarFullLength = Math.abs(barFullLength);
            var repeatTimes = numberUtil.isNumeric(symbolRepeat)
                ? symbolRepeat : Math.ceil(absBarFullLength / unitWithMargin);

            // Adjust calculate margin, to ensure each symbol is displayed
            // entirely in the given layout area.
            symbolMargin = (absBarFullLength / repeatTimes - unitLength) / 2;

            // Update repeatTimes if symbolBoundingData not set.
            repeatTimes = output.repeatTimes = numberUtil.isNumeric(symbolRepeat)
                ? symbolRepeat : Math.ceil(Math.abs(repeatLength) / unitWithMargin);
            pathLength = repeatTimes * (unitLength + symbolMargin * 2);
        }
        else {
            pathLength = unitLength + symbolMargin * 2;
        }

        output.symbolMargin = symbolMargin;

        var pxSign = output.pxSign = barFullLength > 0 ? 1 : barFullLength < 0 ? -1 : 0;

        var sizeFix = pxSign * (pathLength / 2);
        var pathPosition = output.pathPosition = [];
        pathPosition[categoryDim.index] = layout[categoryDim.wh] / 2;
        pathPosition[valueDim.index] = symbolPosition === 'start'
            ? sizeFix
            : symbolPosition === 'end'
            ? barFullLength - sizeFix
            : barFullLength / 2; // 'center'
        if (symbolOffset) {
            pathPosition[0] += symbolOffset[0];
            pathPosition[1] += symbolOffset[1];
        }

        var bundlePosition = output.bundlePosition = [];
        bundlePosition[categoryDim.index] = layout[categoryDim.xy];
        bundlePosition[valueDim.index] = layout[valueDim.xy];

        var barRectShape = output.barRectShape = zrUtil.extend({}, layout);
        barRectShape[valueDim.wh] = pxSign * Math.max(
            Math.abs(layout[valueDim.wh]), Math.abs(pathPosition[valueDim.index] + sizeFix)
        );
        barRectShape[categoryDim.wh] = layout[categoryDim.wh];

        var clipShape = output.clipShape = {x: 0, y: 0};
        clipShape[valueDim.wh] = layout[valueDim.wh];
        clipShape[categoryDim.wh] = layout[categoryDim.wh];

        // If x or y is less than zero, show reversed shape.
        var symbolScale = output.symbolScale = [symbolSize[0] / 2, symbolSize[1] / 2];
        // Follow convention, 'right' and 'top' is the normal scale.
        symbolScale[valueDim.index] *= (opt.isHorizontal ? -1 : 1) * pxSign;
    }

    function createPath(symbolMeta) {
        var path = symbolUtil.createSymbol(
            symbolMeta.symbolType, -1, -1, 2, 2, symbolMeta.color
        );
        path.attr({
            culling: true
        });
        return path;
    }

    function updateRepeatSymbols(bar, dataIndex, opt, symbolMeta) {
        var bundle = bar.__pictorialBundle;
        var animationModel = opt.animationModel;
        var symbolSize = symbolMeta.symbolSize;
        var lineWidth = symbolMeta.lineWidth;
        var pathPosition = symbolMeta.pathPosition;
        var valueDim = opt.valueDim;

        var repeatTimes = symbolMeta.repeatTimes || 0;
        var unit = symbolSize[opt.valueDim.index] + lineWidth + symbolMeta.symbolMargin * 2;
        var index = 0;

        eachPath(bar, function (path) {
            if (index < repeatTimes) {
                graphic.updateProps(path, makeTarget(index), animationModel, dataIndex);
            }
            else {
                graphic.updateProps(path, {scale: [0, 0]}, animationModel, dataIndex, function () {
                    bundle.remove(path);
                });
            }
            index++;
        });

        for (; index < repeatTimes; index++) {
            var path = createPath(symbolMeta);
            var target = makeTarget(index, true);
            // FIXME
            // start position?
            path.attr({position: target.position, scale: [0, 0]});
            graphic.initProps(path, {
                scale: target.scale,
                rotation: target.rotation
            }, animationModel, dataIndex);

            bundle.add(path);
        }

        function makeTarget(index) {
            var position = pathPosition.slice();
            // (start && pxSign > 0) || (end && pxSign < 0): i = repeatTimes - index
            // Otherwise: i = index;
            var pxSign = symbolMeta.pxSign;
            var i = index;
            if (symbolMeta.symbolRepeatDirection === 'start' ? pxSign > 0 : pxSign < 0) {
                i = repeatTimes - index;
            }
            position[valueDim.index] = unit * (i - repeatTimes / 2 + 0.5) + pathPosition[valueDim.index];
            return {
                position: position,
                scale: symbolMeta.symbolScale.slice(),
                rotation: symbolMeta.rotation
            };
        }
    }

    // bar rect is used for label and enlarge hover area.
    function updateBarRect(bar, dataIndex, opt, symbolMeta) {
        var rectShape = zrUtil.extend({}, symbolMeta.barRectShape);

        var barRect = bar.__pictorialBarRect;
        if (!barRect) {
            barRect = bar.__pictorialBarRect = new graphic.Rect({
                z2: 2,
                shape: rectShape,
                style: {
                    stroke: 'transparent',
                    fill: 'transparent',
                    lineWidth: 0
                }
            });

            // FIXME
            // If all emphasis/normal through action.
            barRect
                .on('mouseover', onMouseOver)
                .on('mouseout', onMouseOut);

            bar.add(barRect);
        }
        else {
            graphic.updateProps(barRect, {shape: rectShape}, opt.animationModel, dataIndex);
        }

        function onMouseOver() {
            eachPath(bar, function (path) {
                path.trigger('emphasis');
            });
        }
        function onMouseOut() {
            eachPath(bar, function (path) {
                path.trigger('normal');
            });
        }
    }

    function createBar(data, dataIndex, itemModel, opt, symbolMeta, isUpdate) {
        var valueDim = opt.valueDim;

        // bar is the main element for each data.
        var bar = new graphic.Group();
        // bundle is used for location and clip.
        var bundle = new graphic.Group();
        bar.add(bundle);
        bar.__pictorialBundle = bundle;
        bundle.attr('position', symbolMeta.bundlePosition.slice());

        var updateMethod = isUpdate ? 'updateProps' : 'initProps';
        var animationModel = opt.animationModel;

        if (symbolMeta.symbolRepeat) {
            updateRepeatSymbols(bar, dataIndex, opt, symbolMeta);
        }
        else {
            var mainPath = bar.__pictorialMainPath = createPath(symbolMeta);
            bundle.add(mainPath);
            mainPath.attr({
                position: symbolMeta.pathPosition.slice(),
                scale: [0, 0],
                rotation: symbolMeta.rotation
            });

            graphic[updateMethod](
                mainPath, {scale: symbolMeta.symbolScale.slice()}, animationModel, dataIndex
            );
        }

        var clipPath;
        if (symbolMeta.symbolClip) {
            var clipShape = zrUtil.extend({}, symbolMeta.clipShape);
            clipShape[valueDim.wh] = 0;

            clipPath = new graphic.Rect({
                shape: clipShape
            });
            bundle.setClipPath(clipPath);
            bar.__pictorialClipPath = clipPath;

            var target = {};
            target[valueDim.wh] = symbolMeta.clipShape[valueDim.wh];
            graphic[updateMethod](clipPath, {shape: target}, animationModel, dataIndex);
        }

        updateBarRect(bar, dataIndex, opt, symbolMeta);

        // Three animation types: clip, position, scale.
            // clipPath animation
            // if (clipPath) {
            // }

            // FIXME
            // animation clip path?
            // bar.position[valueDim.index] = layout[valueDim.xy];
            // eachPath(bar, function (path) {
            //     var target;
            //     // scale ainmation
            //     if (symbolMeta.symbolRepeat) {
            //         target = {scale: path.scale.slice()};
            //         path.attr({
            //             position: path.position.slice(),
            //             scale: [0, 0]
            //         });
            //     }
            //     // // position ainmation
            //     // else {
            //     //     target = {position: position};
            //     //     path.attr({
            //     //         scale: scale
            //     //     });
            //     //     // FIXME
            //     //     // start pos?
            //     //     path.position[valueDim.index] = layout[valueDim.xy];
            //     // }
            //     graphic[updateMethod](path, target, animationModel, dataIndex);
            // });
        // }

        return bar;
    }

    function updateBar(data, dataIndex, itemModel, opt, symbolMeta, bar) {
        var clipPath = bar.__pictorialClipPath;
        var mainPath;
        var animationModel = opt.animationModel;
        var bundle = bar.__pictorialBundle;

        graphic.updateProps(
            bundle, {position: symbolMeta.bundlePosition.slice()}, animationModel, dataIndex
        );

        if (symbolMeta.symbolRepeat) {
            updateRepeatSymbols(bar, dataIndex, opt, symbolMeta);
        }
        else {
            mainPath = bar.__pictorialMainPath;
        }

        updateBarRect(bar, dataIndex, opt, symbolMeta);

        if (clipPath) {
            graphic.updateProps(
                clipPath,
                {shape: zrUtil.extend({}, symbolMeta.clipShape)},
                animationModel,
                dataIndex
            );
        }
        mainPath && graphic.updateProps(
            mainPath,
            {
                position: symbolMeta.pathPosition.slice(),
                scale: symbolMeta.symbolScale.slice(),
                rotation: symbolMeta.rotation
            },
            animationModel,
            dataIndex
        );
    }

    function removeBar(dataIndex, opt, bar) {
        // Not show text when animating
        var labelRect = bar.__pictorialBarRect;
        labelRect && (labelRect.style.text = '');

        var clipPath = bar.__pictorialClipPath;
        var targetEl = clipPath || bar.__pictorialBundle;
        var targetObj = clipPath
            ? {shape: {width: 0}}
            : {style: {opacity: 0}};

        graphic.updateProps(
            targetEl, targetObj, opt.animationModel, dataIndex,
            function () {
                bar.parent && bar.parent.remove(bar);
            }
        );
    }

    function getShapeStr(data, dataIndex, symbolMeta) {
        return [
            data.getItemVisual(dataIndex, 'symbol') || 'none',
            !!symbolMeta.symbolRepeat,
            !!symbolMeta.symbolClip
        ].join(':');
    }

    function eachPath(bar, cb, context) {
        // Do not use Group#eachChild, because it do not support remove.
        zrUtil.each(bar.__pictorialBundle.children(), function (el) {
            el !== bar.__pictorialBarRect && cb.call(context, el);
        });
    }

    function updateStyle(bar, dataIndex, itemModel, opt, symbolMeta) {
        var color = symbolMeta.color;
        // Color must be excluded.
        // Because symbol provide setColor individually to set fill and stroke
        var normalStyle = itemModel.getModel('itemStyle.normal').getItemStyle(['color']);
        var hoverStyle = itemModel.getModel('itemStyle.emphasis').getItemStyle();

        eachPath(bar, function (path) {
            // PENDING setColor should be before setStyle!!!
            path.setColor(color);
            path.setStyle(zrUtil.defaults(
                {
                    fill: color,
                    opacity: symbolMeta.opacity
                },
                normalStyle
            ));
            graphic.setHoverStyle(path, hoverStyle);
        });

        var barRectHoverStyle = {};
        var barPositionOutside = opt.valueDim.posDesc[+(symbolMeta.barFullLength > 0)];
        var barRect = bar.__pictorialBarRect;

        helper.setLabel(
            barRect.style, barRectHoverStyle, itemModel,
            color, opt.seriesModel, dataIndex, barPositionOutside
        );

        graphic.setHoverStyle(barRect, barRectHoverStyle);
    }

    return BarView;
});