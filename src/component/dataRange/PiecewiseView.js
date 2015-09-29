define(function(require) {

    var DataRangeView = require('./DataRangeView');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var symbolCreators = require('../../util/symbol');
    var mathMax = Math.max;
    var mathMin = Math.min;

    var PiecewiseDataRangeView = DataRangeView.extend({

        type: 'dataRange.piecewise',

        /**
         * @override
         */
        initLayout: function () {
            DataRangeView.prototype.initLayout.apply(this, arguments);

            var dataRangeModel = this.dataRangeModel;
            var layout = this.layout;

            layout.showLabel = !dataRangeModel.get('text');
            layout.showEndsText = !layout.showLabel;

            var x = layout.x;
            var originalLabelPosition = dataRangeModel.get('labelPosition');
            layout.labelPosition = originalLabelPosition === 'auto'
                ? (
                    x === 'right'
                    ? 'left'
                    : x === 'left'
                    ? 'right'
                    : (x > layout.ecWidth * 0.6 ? 'left' : 'right')
                )
                : originalLabelPosition;

            return layout;
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

            vertical: function () {
                var dataRangeModel = this.dataRangeModel;
                var layout = this.layout;
                var contentLayout = layout.content = {};

                var labelPosition = layout.labelPosition;

                var itemWidth = layout.itemWidth;
                var itemHeight = layout.itemHeight;
                var itemGap = dataRangeModel.get('itemGap');
                var textGap = dataRangeModel.get('textGap');
                var dataRangeText = dataRangeModel.get('text') || [];
                var textStyleModel = dataRangeModel.textStyleModel;

                var baseX = 0;
                var baseY = 0;
                var lastY = baseY;
                var edgeLeft = 0;
                var edgeRight = itemWidth;

                layoutEndsText.call(this, 'textHead', dataRangeText[0], 0, textGap);
                layoutItems.call(this);
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

                function layoutItems() {
                    contentLayout.items = [];

                    var pieceList = dataRangeModel.getPieceList();
                    zrUtil.each(pieceList, function (piece, i) {
                        var itemCfg = {};

                        itemCfg.symbol = {
                            shape: {x: baseX, y: lastY, width: itemWidth, height: itemHeight}
                        };

                        if (layout.showLabel) {
                            var labelTextRect = this.dataRangeModel.getTextRect(piece.text);
                            var labelX;
                            if (labelPosition === 'right') {
                                labelX = baseX + itemWidth + textGap;
                                edgeRight = mathMax(edgeRight, labelX + labelTextRect.width);
                            }
                            else { // labelPosition === 'left'
                                labelX = baseX - textGap;
                                edgeLeft = mathMin(edgeLeft, labelX - labelTextRect.width);
                            }
                            itemCfg.label = {
                                // FIXME
                                // zlevel: this.getZlevelBase(),
                                // z: this.getZBase(),
                                style: {
                                    x: labelX,
                                    y: lastY + itemHeight / 2,
                                    text: piece.text,
                                    textBaseline: 'middle',
                                    textAlign: labelPosition === 'right' ? 'left' : 'right',
                                    font: textStyleModel.getFont()
                                }
                            };
                        }

                        contentLayout.items.push(itemCfg);
                        lastY += itemHeight + (i === pieceList.length - 1 ? 0 : itemGap);
                    }, this);
                }
            },

            horizontal: function () {
                var dataRangeModel = this.dataRangeModel;
                var layout = this.layout;
                var contentLayout = layout.content = {};

                var maxWidth = layout.maxWidth;
                var itemWidth = layout.itemWidth;
                var itemHeight = layout.itemHeight;
                var itemGap = dataRangeModel.get('itemGap');
                var textGap = dataRangeModel.get('textGap');
                var dataRangeText = dataRangeModel.get('text') || [];
                var textStyleModel = dataRangeModel.textStyleModel;

                var baseX = 0;
                var baseY = 0;
                var lastX = baseX;
                var lastY = baseY;
                var maxX = lastX;

                layoutEndsText.call(this, 'textHead', dataRangeText[0], 0, textGap);
                layoutItems.call(this);
                layoutEndsText.call(this, 'textTail', dataRangeText[1], textGap, 0);

                contentLayout.width = mathMax(lastX, maxX);
                contentLayout.height = lastY + itemHeight;
                layout.offsetX = 0;
                layout.offsetY = 0;

                function layoutEndsText(name, text, preGap, postGap) {
                    if (layout.showEndsText && text) {
                        lastX += preGap;
                        contentLayout[name] = {
                            style: {
                                x: lastX,
                                y: baseY + itemHeight / 2,
                                text: text,
                                textBaseline: 'middle',
                                textAlign: 'left'
                            }
                        };
                        var textRect = this.dataRangeModel.getTextRect(text);
                        lastX += textRect.width + textGap;
                        lastX += postGap;
                    }
                }

                function layoutItems() {
                    contentLayout.items = [];

                    var pieceList = dataRangeModel.getPieceList();
                    zrUtil.each(pieceList, function (piece, i) {
                        var itemX = lastX;
                        var symbolCfg = {
                            shape: {x: itemX, y: baseY, width: itemWidth, height: itemHeight}
                        };
                        itemX += itemWidth;

                        var labelCfg;
                        if (layout.showLabel) {
                            itemX += textGap;
                            labelCfg = {
                                // FIXME
                                // zlevel: this.getZlevelBase(),
                                // z: this.getZBase(),
                                style: {
                                    x: itemX,
                                    y: baseY + itemHeight / 2,
                                    text: piece.text,
                                    textBaseline: 'middle',
                                    textAlign: 'left',
                                    font: textStyleModel.getFont()
                                }
                            };
                            itemX += dataRangeModel.getTextRect(piece.text).width;
                        }

                        itemX += (i === pieceList.length - 1) ? 0 : itemGap;

                        // Change line if needed
                        if (itemX > maxWidth) {
                            maxX = mathMax(lastX, maxX);
                            lastX = baseX;
                            lastY += itemGap + itemHeight;
                        }
                        else {
                            contentLayout.items.push({symbol: symbolCfg, label: labelCfg});
                            lastX = itemX;
                            i++;
                        }
                    }, this);
                }
            }
        },

        /**
         * @override
         * @protected
         */
        renderContent: function () {
            var contentLayout = this.layout.content;
            var group = this.group;
            var dataRangeModel = this.dataRangeModel;

            zrUtil.each(contentLayout.items, function (itemCfg, index) {

                var symbolCfg = itemCfg.symbol;
                if (symbolCfg) {
                    var pieceInterval = dataRangeModel.getPieceInterval(index);
                    var representValue = (pieceInterval[0] + pieceInterval[1]) / 2;
                    var mappings = dataRangeModel.controllerVisuals[
                        dataRangeModel.getValueState(representValue)
                    ];

                    var visualWrap = this._createDefaultVisual();
                    zrUtil.each(mappings, function (visualMapping, visualKey) {
                        visualMapping && visualMapping.applyVisual(
                            representValue, visualWrap.getter, visualWrap.setter
                        );
                    });

                    var shape = symbolCfg.shape;
                    var symbol = symbolCreators.createSymbol(
                        visualWrap.visual.symbol,
                        shape.x, shape.y, shape.width, shape.height,
                        visualWrap.visual.color
                    );

                    // FIXME
                    // group onclick
                    symbol.onclick = zrUtil.bind(this._onItemClick, this, index);

                    this.group.add(symbol);
                }

                if (itemCfg.label) {
                    group.add(new graphic.Text(itemCfg.label));
                }

            }, this);

            contentLayout.textHead && group.add(new graphic.Text(contentLayout.textHead));
            contentLayout.textTail && group.add(new graphic.Text(contentLayout.textTail));
        },

        /**
         * @private
         */
        _createDefaultVisual: function () {
            var dataRangeModel = this.dataRangeModel;
            var visual = {
                symbol: dataRangeModel.get('itemSymbol'),
                color: dataRangeModel.get('contentColor')
            };
            return {
                visual: visual,
                getter: function (key) {
                    return visual[key];
                },
                setter: function (key, value) {
                    zrUtil.isObject(key)
                        ? zrUtil.extend(visual, key)
                        : (visual[key] = value);
                }
            };
        },

        /**
         * @private
         */
        _onItemClick: function (index) {
            var dataRangeModel = this.dataRangeModel;
            var selected = dataRangeModel.get('selected');

            if (dataRangeModel.get('selectedMode') === 'single') {
                zrUtil.each(selected, function (item, index) {
                    selected[index] = false;
                });
            }
            selected[index] = !selected[index];

            this.api.dispatch({
                type: 'dataRangeSelected',
                from: this.uid,
                dataRangeModelId: this.dataRangeModel.uid,
                selected: selected.slice()
            });
        }
    });

    return PiecewiseDataRangeView;
});
