define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var symbolUtil = require('../../util/symbol');
    var numberUtil = require('../../util/number');
    var helper = require('./helper');

    var parsePercent = numberUtil.parsePercent;

    var BAR_BORDER_WIDTH_QUERY = ['itemStyle', 'normal', 'borderWidth'];

    // index: +isHorizontal
    var LAYOUT_ATTRS = [
        {xy: 'x', wh: 'width', index: 0, posDesc: ['left', 'right']},
        {xy: 'y', wh: 'height', index: 1, posDesc: ['top', 'bottom']}
    ];

    var pathForLineWidth = new graphic.Circle();

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
                ecSize: {width: api.getWidth(), height: api.getHeight()},
                seriesModel: seriesModel,
                coordSys: cartesian,
                coordSysExtent: [
                    [coordSysRect.x, coordSysRect.x + coordSysRect.width],
                    [coordSysRect.y, coordSysRect.y + coordSysRect.height]
                ],
                isHorizontal: isHorizontal,
                valueDim: LAYOUT_ATTRS[+isHorizontal],
                categoryDim: LAYOUT_ATTRS[1 - isHorizontal]
            };

            data.diff(oldData)
                .add(function (dataIndex) {
                    if (!data.hasValue(dataIndex)) {
                        return;
                    }

                    var itemModel = getItemModel(data, dataIndex);
                    var symbolMeta = getSymbolMeta(data, dataIndex, itemModel, opt);

                    var bar = createBar(data, dataIndex, itemModel, opt, symbolMeta);

                    data.setItemGraphicEl(dataIndex, bar);
                    group.add(bar);

                    updateCommon(bar, dataIndex, itemModel, opt, symbolMeta);
                })
                .update(function (newIndex, oldIndex) {
                    var bar = oldData.getItemGraphicEl(oldIndex);

                    if (!data.hasValue(newIndex)) {
                        group.remove(bar);
                        return;
                    }

                    var itemModel = getItemModel(data, newIndex);
                    var symbolMeta = getSymbolMeta(data, newIndex, itemModel, opt);

                    var pictorialShapeStr = getShapeStr(data, newIndex, symbolMeta);
                    if (bar && pictorialShapeStr !== bar.__pictorialShapeStr) {
                        group.remove(bar);
                        data.setItemGraphicEl(newIndex, null);
                        bar = null;
                    }

                    if (bar) {
                        updateBar(data, newIndex, itemModel, opt, symbolMeta, bar);
                    }
                    else {
                        bar = createBar(data, newIndex, itemModel, opt, symbolMeta, true);
                    }

                    data.setItemGraphicEl(newIndex, bar);
                    bar.__pictorialSymbolMeta = symbolMeta;
                    // Add back
                    group.add(bar);

                    updateCommon(bar, newIndex, itemModel, opt, symbolMeta);
                })
                .remove(function (dataIndex) {
                    var bar = oldData.getItemGraphicEl(dataIndex);
                    bar && removeBar(oldData, dataIndex, bar.__pictorialSymbolMeta.animationModel, bar);
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
                    data.eachItemGraphicEl(function (bar) {
                        removeBar(data, bar.dataIndex, ecModel, bar);
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
        var symbolPosition = itemModel.get('symbolPosition') || 'start';
        var symbolRotate = itemModel.get('symbolRotate');
        var rotation = (symbolRotate || 0) * Math.PI / 180 || 0;
        var symbolPatternSize = itemModel.get('symbolPatternSize') || 2;
        var isAnimationEnabled = itemModel.isAnimationEnabled();

        var symbolMeta = {
            layout: layout,
            itemModel: itemModel,
            symbolType: data.getItemVisual(dataIndex, 'symbol') || 'circle',
            color: data.getItemVisual(dataIndex, 'color'),
            symbolClip: symbolClip,
            symbolRepeat: symbolRepeat,
            symbolRepeatDirection: itemModel.get('symbolRepeatDirection'),
            symbolPatternSize: symbolPatternSize,
            rotation: rotation,
            animationModel: isAnimationEnabled ? itemModel : null,
            hoverAnimation: isAnimationEnabled && itemModel.get('hoverAnimation'),
            z2: itemModel.get('z2') || 0
        };

        prepareBarLength(itemModel, symbolRepeat, layout, opt, symbolMeta);

        prepareSymbolSize(
            data, dataIndex, layout, symbolRepeat, symbolClip, symbolMeta.barFullLength,
            symbolMeta.pxSign, symbolPatternSize, opt, symbolMeta
        );

        prepareLineWidth(itemModel, symbolMeta.symbolScale, rotation, opt, symbolMeta);

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
            symbolPosition, symbolMeta.valueLineWidth, symbolMeta.barFullLength, symbolMeta.repeatLength,
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

        output.pxSign = barFullLength > 0 ? 1 : barFullLength < 0 ? -1 : 0;
    }

    // Support ['100%', '100%']
    function prepareSymbolSize(
        data, dataIndex, layout, symbolRepeat, symbolClip, barFullLength,
        pxSign, symbolPatternSize, opt, output
    ) {
        var valueDim = opt.valueDim;
        var categoryDim = opt.categoryDim;
        var categorySize = Math.abs(layout[categoryDim.wh]);

        var symbolSize = data.getItemVisual(dataIndex, 'symbolSize');
        if (zrUtil.isArray(symbolSize)) {
            symbolSize = symbolSize.slice();
        }
        else {
            if (symbolSize == null) {
                symbolSize = '100%';
            }
            symbolSize = [symbolSize, symbolSize];
        }

        // Note: percentage symbolSize (like '100%') do not consider lineWidth, because it is
        // to complicated to calculate real percent value if considering scaled lineWidth.
        // So the actual size will bigger than layout size if lineWidth is bigger than zero,
        // which can be tolerated in pictorial chart.

        symbolSize[categoryDim.index] = parsePercent(
            symbolSize[categoryDim.index],
            categorySize
        );
        symbolSize[valueDim.index] = parsePercent(
            symbolSize[valueDim.index],
            symbolRepeat ? categorySize : Math.abs(barFullLength)
        );

        output.symbolSize = symbolSize;

        // If x or y is less than zero, show reversed shape.
        var symbolScale = output.symbolScale = [
            symbolSize[0] / symbolPatternSize,
            symbolSize[1] / symbolPatternSize
        ];
        // Follow convention, 'right' and 'top' is the normal scale.
        symbolScale[valueDim.index] *= (opt.isHorizontal ? -1 : 1) * pxSign;
    }

    function prepareLineWidth(itemModel, symbolScale, rotation, opt, output) {
        // In symbols are drawn with scale, so do not need to care about the case that width
        // or height are too small. But symbol use strokeNoScale, where acture lineWidth should
        // be calculated.
        var valueLineWidth = itemModel.get(BAR_BORDER_WIDTH_QUERY) || 0;

        if (valueLineWidth) {
            pathForLineWidth.attr({
                scale: symbolScale.slice(),
                rotation: rotation
            });
            pathForLineWidth.updateTransform();
            valueLineWidth /= pathForLineWidth.getLineScale();
            valueLineWidth *= symbolScale[opt.valueDim.index];
        }

        output.valueLineWidth = valueLineWidth;
    }

    function prepareLayoutInfo(
        itemModel, symbolSize, layout, symbolRepeat, symbolClip, symbolOffset,
        symbolPosition, valueLineWidth, barFullLength, repeatLength, opt, output
    ) {
        var categoryDim = opt.categoryDim;
        var valueDim = opt.valueDim;
        var pxSign = output.pxSign;

        var symbolMargin = parsePercent(
            zrUtil.retrieve(itemModel.get('symbolMargin'), symbolRepeat ? '15%' : 0),
            symbolSize[valueDim.index]
        );

        var unitLength = symbolSize[valueDim.index] + valueLineWidth;
        var uLenWithMargin = Math.max(unitLength + symbolMargin * 2, 0);
        var pathLenWithMargin = uLenWithMargin;

        // Note: rotation will not effect the layout of symbols, because user may
        // want symbols to rotate on its center, which should not be translated
        // when rotating.

        if (symbolRepeat) {
            var absBarFullLength = Math.abs(barFullLength);
            var absRepeatLength = Math.abs(repeatLength);

            // When symbol margin is less than 0, margin at both ends will be subtracted
            // to ensure that all of the symbols will not be overflow the given area.
            var endFix = symbolMargin >= 0 ? 0 : symbolMargin * 2;

            // If repeat times is fixed, symbolMargin will be calculated by repeat times.
            // Otherwise, both repeat times and symbolMargin will be calculated acooding to
            // the given symbolMargin.
            var repeatTimesFixed = numberUtil.isNumeric(symbolRepeat);
            var repeatTimes = repeatTimesFixed
                ? symbolRepeat
                : toIntTimes((absBarFullLength + endFix) / uLenWithMargin);

            // Adjust calculate margin, to ensure each symbol is displayed
            // entirely in the given layout area.
            var mDiff = (repeatTimesFixed ? absRepeatLength : absBarFullLength) - repeatTimes * unitLength;
            symbolMargin = mDiff / 2 / (mDiff >= 0 ? repeatTimes : repeatTimes - 1);
            uLenWithMargin = unitLength + symbolMargin * 2;
            endFix = mDiff >= 0 ? 0 : symbolMargin * 2;

            if (!repeatTimesFixed) {
                // Update repeatTimes when not all symbol will be shown.
                repeatTimes = toIntTimes((absRepeatLength + endFix) / uLenWithMargin);
            }

            pathLenWithMargin = repeatTimes * uLenWithMargin - endFix;
            output.repeatTimes = repeatTimes;
        }

        output.symbolMargin = symbolMargin;

        var sizeFix = pxSign * (pathLenWithMargin / 2);
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

        var clipShape = output.clipShape = {};
        // Consider that symbol may be overflow layout rect.
        clipShape[categoryDim.xy] = -layout[categoryDim.xy];
        clipShape[categoryDim.wh] = opt.ecSize[categoryDim.wh];
        clipShape[valueDim.xy] = 0;
        clipShape[valueDim.wh] = layout[valueDim.wh];
    }

    function createPath(symbolMeta) {
        var symbolPatternSize = symbolMeta.symbolPatternSize;
        var path = symbolUtil.createSymbol(
            // Consider texture img, make a big size.
            symbolMeta.symbolType,
            -symbolPatternSize / 2,
            -symbolPatternSize / 2,
            symbolPatternSize,
            symbolPatternSize,
            symbolMeta.color
        );
        path.attr({
            culling: true
        });
        path.type !== 'image' && path.setStyle({
            strokeNoScale: true
        });

        return path;
    }

    function createOrUpdateRepeatSymbols(bar, dataIndex, opt, symbolMeta, isUpdate) {
        var bundle = bar.__pictorialBundle;
        var symbolSize = symbolMeta.symbolSize;
        var valueLineWidth = symbolMeta.valueLineWidth;
        var pathPosition = symbolMeta.pathPosition;
        var valueDim = opt.valueDim;
        var repeatTimes = symbolMeta.repeatTimes || 0;
        var animationModel = symbolMeta.animationModel;

        var index = 0;
        var method = isUpdate ? 'updateProps' : 'initProps';
        var unit = symbolSize[opt.valueDim.index] + valueLineWidth + symbolMeta.symbolMargin * 2;

        eachPath(bar, function (path) {
            path.__pictorialAnimationIndex = index;
            path.__pictorialRepeatTimes = repeatTimes;
            if (index < repeatTimes) {
                graphic[method](path, makeTarget(index), animationModel, dataIndex);
            }
            else {
                graphic[method](path, {scale: [0, 0]}, animationModel, dataIndex, function () {
                    bundle.remove(path);
                });
            }

            updateHoverAnimation(path, symbolMeta);

            index++;
        });

        for (; index < repeatTimes; index++) {
            var path = createPath(symbolMeta);
            path.__pictorialAnimationIndex = index;
            path.__pictorialRepeatTimes = repeatTimes;
            bundle.add(path);

            var target = makeTarget(index, true);
            path.attr({position: target.position, scale: [0, 0]});
            graphic[method](path, {
                scale: target.scale,
                rotation: target.rotation
            }, animationModel, dataIndex);

            // FIXME
            // If all emphasis/normal through action.
            path
                .on('mouseover', onMouseOver)
                .on('mouseout', onMouseOut);

            updateHoverAnimation(path, symbolMeta);
        }

        function makeTarget(index) {
            var position = pathPosition.slice();
            // (start && pxSign > 0) || (end && pxSign < 0): i = repeatTimes - index
            // Otherwise: i = index;
            var pxSign = symbolMeta.pxSign;
            var i = index;
            if (symbolMeta.symbolRepeatDirection === 'start' ? pxSign > 0 : pxSign < 0) {
                i = repeatTimes - 1 - index;
            }
            position[valueDim.index] = unit * (i - repeatTimes / 2 + 0.5) + pathPosition[valueDim.index];
            return {
                position: position,
                scale: symbolMeta.symbolScale.slice(),
                rotation: symbolMeta.rotation
            };
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

    function createOrUpdateSingleSymbol(bar, dataIndex, opt, symbolMeta, isUpdate) {
        var bundle = bar.__pictorialBundle;
        var mainPath = bar.__pictorialMainPath;
        var animationModel = symbolMeta.animationModel;
        var method = isUpdate ? 'updateProps' : 'initProps';

        if (!mainPath) {
            mainPath = bar.__pictorialMainPath = createPath(symbolMeta);
            bundle.add(mainPath);
            mainPath.attr({
                position: symbolMeta.pathPosition.slice(),
                scale: [0, 0],
                rotation: symbolMeta.rotation
            });
            graphic[method](
                mainPath, {
                    scale: symbolMeta.symbolScale.slice()
                },
                animationModel,
                dataIndex
            );
            mainPath
                .on('mouseover', onMouseOver)
                .on('mouseout', onMouseOut);
        }
        else {
            graphic[method](
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

        updateHoverAnimation(mainPath, symbolMeta);

        function onMouseOver() {
            this.trigger('emphasis');
        }

        function onMouseOut() {
            this.trigger('normal');
        }
    }

    // bar rect is used for label.
    function updateBarRect(bar, dataIndex, opt, symbolMeta) {
        var rectShape = zrUtil.extend({}, symbolMeta.barRectShape);

        var barRect = bar.__pictorialBarRect;
        if (!barRect) {
            barRect = bar.__pictorialBarRect = new graphic.Rect({
                z2: 2,
                shape: rectShape,
                silent: true,
                style: {
                    stroke: 'transparent',
                    fill: 'transparent',
                    lineWidth: 0
                }
            });

            bar.add(barRect);
        }
        else {
            graphic.updateProps(barRect, {shape: rectShape}, symbolMeta.animationModel, dataIndex);
        }
    }

    function getItemModel(data, dataIndex) {
        var itemModel = data.getItemModel(dataIndex);
        itemModel.getAnimationDelayParams = getAnimationDelayParams;
        itemModel.isAnimationEnabled = isAnimationEnabled;
        return itemModel;
    }

    function getAnimationDelayParams(path) {
        // The order is the same as the z-order, see `symbolRepeatDiretion`.
        return {
            index: path.__pictorialAnimationIndex,
            count: path.__pictorialRepeatTimes
        };
    }

    function isAnimationEnabled() {
        // `animation` prop can be set on itemModel in pictorial bar chart.
        return this.parentModel.isAnimationEnabled() && !!this.getShallow('animation');
    }

    function updateHoverAnimation(path, symbolMeta) {
        path.off('emphasis').off('normal');

        var scale = symbolMeta.symbolScale.slice();

        symbolMeta.hoverAnimation && path
            .on('emphasis', function() {
                this.animateTo({
                    scale: [scale[0] * 1.1, scale[1] * 1.1]
                }, 400, 'elasticOut');
            })
            .on('normal', function() {
                this.animateTo({
                    scale: scale.slice()
                }, 400, 'elasticOut');
            });
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
        var animationModel = symbolMeta.animationModel;

        if (symbolMeta.symbolRepeat) {
            createOrUpdateRepeatSymbols(bar, dataIndex, opt, symbolMeta);
        }
        else {
            createOrUpdateSingleSymbol(bar, dataIndex, opt, symbolMeta);
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

        bar.__pictorialShapeStr = getShapeStr(data, dataIndex, symbolMeta);
        bar.__pictorialSymbolMeta = symbolMeta;

        return bar;
    }

    function updateBar(data, dataIndex, itemModel, opt, symbolMeta, bar) {
        var animationModel = symbolMeta.animationModel;
        var bundle = bar.__pictorialBundle;

        graphic.updateProps(
            bundle, {position: symbolMeta.bundlePosition.slice()}, animationModel, dataIndex
        );

        if (symbolMeta.symbolRepeat) {
            createOrUpdateRepeatSymbols(bar, dataIndex, opt, symbolMeta, true);
        }
        else {
            createOrUpdateSingleSymbol(bar, dataIndex, opt, symbolMeta, true);
        }

        updateBarRect(bar, dataIndex, opt, symbolMeta);

        var clipPath = bar.__pictorialClipPath;
        if (clipPath) {
            graphic.updateProps(
                clipPath,
                {shape: zrUtil.extend({}, symbolMeta.clipShape)},
                animationModel,
                dataIndex
            );
        }
    }

    function removeBar(data, dataIndex, animationModel, bar) {
        // Not show text when animating
        var labelRect = bar.__pictorialBarRect;
        labelRect && (labelRect.style.text = '');

        var pathes = [];
        eachPath(bar, function (path) {
            pathes.push(path);
        });
        bar.__pictorialMainPath && pathes.push(bar.__pictorialMainPath);

        zrUtil.each(pathes, function (path) {
            graphic.updateProps(
                path, {scale: [0, 0]}, animationModel, dataIndex,
                function () {
                    bar.parent && bar.parent.remove(bar);
                }
            );
        });

        data.setItemGraphicEl(dataIndex, null);
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

    function updateCommon(bar, dataIndex, itemModel, opt, symbolMeta) {
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

            path.z2 = symbolMeta.z2;
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

    function toIntTimes(times) {
        var roundedTimes = Math.round(times);
        // Escapse accurate error
        return Math.abs(times - roundedTimes) < 1e-4
            ? roundedTimes
            : Math.ceil(times);
    }

    return BarView;
});