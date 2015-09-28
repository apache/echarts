

// color colorH symbolSize


// color colorList symbol

define(function(require) {

    var DataRangeView = require('./DataRangeView');
    var zrUtil = require('zrender/core/util');
    var zrColor = require('zrender/tool/color');
    var graphic = require('../../util/graphic');
    var numberUtil = require('../../util/number');
    var asc = numberUtil.asc;
    var extend = zrUtil.extend;
    var mathMin = Math.min;
    var mathMax = Math.max;

    var PiecewiseDataRangeView = DataRangeView.extend({

        type: 'dataRange.continuity',

        /**
         * @override
         */
        init: function () {
            DataRangeView.prototype.init.apply(this, arguments);

            /**
             * @private
             * @type {Object}
             */
            this._viewExtent = [Infinity, -Infinity];
        },

        /**
         * @override
         */
        initLayout: function () {
            DataRangeView.prototype.initLayout.apply(this, arguments);

            var dataRangeModel = this.dataRangeModel;
            var layout = this.layout;
            var x = layout.x;
            var y = layout.y;
            var originalHandlePosition = dataRangeModel.get('handlePosition');

            layout.showHandle = !!dataRangeModel.get('calculable');
            layout.showEndsText = !!dataRangeModel.get('text');

            layout.handlePosition = originalHandlePosition === 'auto'
                ? (
                    layout.orient === 'horizontal'
                    ? (
                        y === 'bottom'
                        ? 'left'
                        : y === 'top'
                        ? 'right'
                        : (y > layout.ecHeight * 0.6 ? 'top' : 'bottom')
                    )
                    : ( // orient === 'vertical'
                        x === 'left'
                        ? 'right'
                        : x === 'right'
                        ? 'left'
                        : (x > layout.ecWidth * 0.6 ? 'left' : 'right')
                    )
                )
                : originalHandlePosition;
        },

        /**
         * @protected
         * @override
         */
        layoutContent: function () {
            this._contentLayouters[this.dataRangeModel.get('orient')].call(this);
        },

        /**
         * @private
         * @type {Object}
         */
        _contentLayouters: {

            vertical: function (dataRangeModel) {
                var layout = this.layout;
                var contentLayout = layout.content = {};

                var itemWidth = layout.itemWidth;
                var itemHeight = layout.itemHeight;
                var textGap = dataRangeModel.get('textGap');
                var dataRangeText = dataRangeModel.get('text') || [];

                var baseX = 0;
                var baseY = 0;
                var lastY = baseY;
                var edgeLeft = 0;
                var edgeRight = itemWidth;

                layoutEndsText.call(this, 'textHead', dataRangeText[0], 0, textGap);
                this._resetViewExtent([lastY, lastY + itemHeight]);
                layoutMain.call(this);
                layoutEndsText.call(this, 'textTail', dataRangeText[1], textGap, 0);

                contentLayout.width = edgeRight - edgeLeft;
                contentLayout.height = lastY;
                layout.offsetX = baseX - edgeLeft;
                layout.offsetY = 0;

                function layoutEndsText(name, text, preGap, postGap) {
                    if (layout.showEndsText && text) {
                        lastY += preGap;
                        contentLayout[name] = {
                            style: {
                                x: baseX + itemWidth / 2,
                                y: lastY,
                                text: text,
                                textBaseline: 'top',
                                textAlign: 'center'
                            }
                        };
                        var textRect = this.dataRangeModel.getTextRect(text);
                        lastY += textRect.height;

                        if (textRect.width > itemWidth) {
                            var diff = (textRect.width - itemWidth) / 2;
                            edgeLeft = mathMin(edgeLeft, -diff);
                            edgeRight = mathMax(edgeRight, diff);
                        }
                        lastY += postGap;
                    }
                }

                function layoutMain() {
                    var barCfgs = {
                        mainBar: {y: lastY, height: itemHeight},
                        maskHead: {y: contentLayout.extent[0], height: contentLayout.interval[0]},
                        maskTail: {y: contentLayout.interval[1], height: contentLayout.extend[1]}
                    };
                    zrUtil.each(barCfgs, function (barCfg, name) {
                        contentLayout[name] = {shape: extend({x: baseX, width: itemWidth}, barCfg)};
                    });
                    lastY += itemHeight;
                }
            },

            horizontal: function (dataRangeModel) {
                var layout = this.layout;
                var contentLayout = layout.content = {};

                var itemWidth = layout.itemWidth;
                var itemHeight = layout.itemHeight;
                var textGap = dataRangeModel.get('textGap');
                var dataRangeText = dataRangeModel.get('text') || [];

                var baseX = 0;
                var baseY = 0;
                var lastX = baseX;
                var edgeTop = 0;
                var edgeBottom = itemHeight;

                layoutEndsText.call(this, 'textTail', dataRangeText[1], textGap, 0);
                this._resetViewExtent([lastX, lastX + itemWidth]);
                layoutMain.call(this);
                layoutEndsText.call(this, 'textHead', dataRangeText[0], 0, textGap);

                contentLayout.width = lastX;
                contentLayout.height = edgeBottom - edgeTop;
                layout.offsetX = 0;
                layout.offsetY = baseY - edgeTop;

                function layoutEndsText(name, text, preGap, postGap) {
                    if (layout.showEndsText && text) {
                        lastX += preGap;
                        contentLayout[name] = {
                            style: {
                                x: lastX,
                                y: baseY + itemHeight / 2,
                                textBaseline: 'middle',
                                textAlign: 'left'
                            }
                        };
                        var textRect = this.dataRangeModel.getTextRect(text);
                        lastX += textRect.width;

                        if (textRect.height > itemHeight) {
                            var diff = (textRect.height - itemHeight) / 2;
                            edgeTop = mathMin(edgeTop, -diff);
                            edgeBottom = mathMax(edgeBottom, diff);
                        }
                        lastX += postGap;
                    }
                }

                function layoutMain() {
                    var barCfgs = {
                        mainBar: {x: lastX, width: itemWidth},
                        maskHead: {x: contentLayout.extent[0], width: contentLayout.interval[0]},
                        maskTail: {x: contentLayout.interval[1], width: contentLayout.extend[1]}
                    };
                    zrUtil.each(barCfgs, function (barCfg, name) {
                        contentLayout[name] = {shape: extend({y: baseY, height: itemHeight}, barCfg)};
                    });
                    lastX += itemWidth;
                }
            }
        },

        /**
         * @protected
         */
        renderContent: function () {
            this._renderMain();
            this._renderHandle();
            this._renderIndicator();
        },

        /**
         * @protected
         */
        mapValueToCoord: function (value) {
            var dataRangeModel = this.dataRangeModel;
            var orient = dataRangeModel.get('orient');
            var inverse = dataRangeModel.get('inverse');
            var viewExtent = this.layout.content.extent.slice();

            if (orient === 'horizontal' ? inverse : !inverse) {
                viewExtent.reverse();
            }

            return numberUtil.linearMap(
                value, dataRangeModel.getExtent(), viewExtent, true
            );
        },

        /**
         * @private
         */
        _resetViewExtent: function (viewExtent) {
            var contentLayout = this.layout.content;
            contentLayout.extent = asc(viewExtent);

            var dataExtent = this.dataRangeModel.getExtent();
            contentLayout.interval = asc([
                this.mapValueToCoord(dataExtent[0]),
                this.mapValueToCoord(dataExtent[1])
            ]);
        },

        /**
         * @private
         */
        _renderMain: function () {
            var contentLayout = this.layout.content;
            var contentGroup = new graphic.Group();
            var dataRangeModel = this.dataRangeModel;

            var mainBarLayout = contentLayout.mainBar;
            var mainBarLayoutShape = mainBarLayout.shape;
            var gradientColor = zrColor.getLinearGradient(
                // ??? color位置
                // ??? orient判断
                mainBarLayoutShape.x, mainBarLayoutShape.y,
                mainBarLayoutShape.x, mainBarLayoutShape.y + mainBarLayoutShape.height,
                // FIXME
                dataRangeModel.visualMappings.selected.get('data')
            );
            var unselectedColor = dataRangeModel.get('unselectedColor');

            contentGroup.add(new graphic.Rect(zrUtil.merge(
                {style: {color: gradientColor}}, mainBarLayout, true
            )));
            contentGroup.add(new graphic.Rect(zrUtil.merge(
                {style: {color: unselectedColor}}, contentLayout.maskHead, true
            )));
            contentGroup.add(new graphic.Rect(zrUtil.merge(
                {style: {color: unselectedColor}}, contentLayout.maskTail, true
            )));

            contentLayout.textHead && contentGroup.add(new graphic.Text(contentLayout.textHead));
            contentLayout.textTail && contentGroup.add(new graphic.Text(contentLayout.textTail));
        },

        _renderHandle: function () {
            // FIXME
        },

        _renderIndicator: function () {
            // layout
            // var contentLayout = this.layout.content;

            // if (contentLayout.orient === 'horizontal') {
            //     contentLayout.handlePosition === 'bottom'
            // }
            // else { // orient === 'vertical'

            // }

            // FIXME
        }
    });

    return PiecewiseDataRangeView;
});
