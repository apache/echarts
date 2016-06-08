define(function(require) {

    var VisualMapModel = require('./VisualMapModel');
    var zrUtil = require('zrender/core/util');
    var VisualMapping = require('../../visual/VisualMapping');

    var PiecewiseModel = VisualMapModel.extend({

        type: 'visualMap.piecewise',

        /**
         * Order Rule:
         *
         * option.categories / option.pieces / option.text / option.selected:
         *     If !option.inverse,
         *     Order when vertical: ['top', ..., 'bottom'].
         *     Order when horizontal: ['left', ..., 'right'].
         *     If option.inverse, the meaning of
         *     the order should be reversed.
         *
         * this._pieceList:
         *     The order is always [low, ..., high].
         *
         * Mapping from location to low-high:
         *     If !option.inverse
         *     When vertical, top is high.
         *     When horizontal, right is high.
         *     If option.inverse, reverse.
         */

        /**
         * @protected
         */
        defaultOption: {
            selected: null,             // Object. If not specified, means selected.
                                        // When pieces and splitNumber: {'0': true, '5': true}
                                        // When categories: {'cate1': false, 'cate3': true}
                                        // When selected === false, means all unselected.
            align: 'auto',              // 'auto', 'left', 'right'
            itemWidth: 20,              // When put the controller vertically, it is the length of
                                        // horizontal side of each item. Otherwise, vertical side.
            itemHeight: 14,             // When put the controller vertically, it is the length of
                                        // vertical side of each item. Otherwise, horizontal side.
            itemSymbol: 'roundRect',
            pieceList: null,            // Each item is Object, with some of those attrs:
                                        // {min, max, value, color, colorSaturation, colorAlpha, opacity,
                                        // symbol, symbolSize}, which customize the range or visual
                                        // coding of the certain piece. Besides, see "Order Rule".
            categories: null,           // category names, like: ['some1', 'some2', 'some3'].
                                        // Attr min/max are ignored when categories set. See "Order Rule"
            splitNumber: 5,             // If set to 5, auto split five pieces equally.
                                        // If set to 0 and component type not set, component type will be
                                        // determined as "continuous". (It is less reasonable but for ec2
                                        // compatibility, see echarts/component/visualMap/typeDefaulter)
            selectedMode: 'multiple',   // Can be 'multiple' or 'single'.
            itemGap: 10,                // The gap between two items, in px.
            hoverLink: true             // Enable hover highlight.
        },

        /**
         * @override
         */
        optionUpdated: function (newOption, isInit) {
            PiecewiseModel.superApply(this, 'optionUpdated', arguments);

            /**
             * The order is always [low, ..., high].
             * [{text: string, interval: Array.<number>}, ...]
             * @private
             * @type {Array.<Object>}
             */
            this._pieceList = [];

            this.resetTargetSeries();
            this.resetExtent();

            /**
             * 'pieces', 'categories', 'splitNumber'
             * @type {string}
             */
            var mode = this._mode = this._determineMode();

            resetMethods[this._mode].call(this);

            this._resetSelected(newOption, isInit);

            var categories = this.option.categories;

            this.resetVisual(function (mappingOption, state) {
                if (mode === 'categories') {
                    mappingOption.mappingMethod = 'category';
                    mappingOption.categories = zrUtil.clone(categories);
                }
                else {
                    mappingOption.dataExtent = this.getExtent();
                    mappingOption.mappingMethod = 'piecewise';
                    mappingOption.pieceList = zrUtil.map(this._pieceList, function (piece) {
                        var piece = zrUtil.clone(piece);
                        if (state !== 'inRange') {
                            piece.visual = null;
                        }
                        return piece;
                    });
                }
            });
        },

        _resetSelected: function (newOption, isInit) {
            var thisOption = this.option;
            var pieceList = this._pieceList;

            // Selected do not merge but all override.
            var selected = (isInit ? thisOption : newOption).selected || {};
            thisOption.selected = selected;

            // Consider 'not specified' means true.
            zrUtil.each(pieceList, function (piece, index) {
                var key = this.getSelectedMapKey(piece);
                if (!(key in selected)) {
                    selected[key] = true;
                }
            }, this);

            if (thisOption.selectedMode === 'single') {
                // Ensure there is only one selected.
                var hasSel = false;

                zrUtil.each(pieceList, function (piece, index) {
                    var key = this.getSelectedMapKey(piece);
                    if (selected[key]) {
                        hasSel
                            ? (selected[key] = false)
                            : (hasSel = true);
                    }
                }, this);
            }
            // thisOption.selectedMode === 'multiple', default: all selected.
        },

        /**
         * @public
         */
        getSelectedMapKey: function (piece) {
            return this._mode === 'categories'
                ? piece.value + '' : piece.index + '';
        },

        /**
         * @public
         */
        getPieceList: function () {
            return this._pieceList;
        },

        /**
         * @private
         * @return {string}
         */
        _determineMode: function () {
            var option = this.option;

            return option.pieces && option.pieces.length > 0
                ? 'pieces'
                : this.option.categories
                ? 'categories'
                : 'splitNumber';
        },

        /**
         * @public
         * @override
         */
        setSelected: function (selected) {
            this.option.selected = zrUtil.clone(selected);
        },

        /**
         * @public
         * @override
         */
        getValueState: function (value) {
            var index = VisualMapping.findPieceIndex(value, this._pieceList);

            return index != null
                ? (this.option.selected[this.getSelectedMapKey(this._pieceList[index])]
                    ? 'inRange' : 'outOfRange'
                )
                : 'outOfRange';
        },

        /**
         * @public
         * @params {number} pieceIndex piece index in visualMapModel.getPieceList()
         * @return {Array.<Object>} [{seriesId, dataIndices: <Array.<number>>}, ...]
         */
        findTargetDataIndices: function (pieceIndex) {
            var result = [];

            this.eachTargetSeries(function (seriesModel) {
                var dataIndices = [];
                var data = seriesModel.getData();

                data.each(this.getDataDimension(data), function (value, dataIndex) {
                    // Should always base on model pieceList, because it is order sensitive.
                    var pIdx = VisualMapping.findPieceIndex(value, this._pieceList);
                    pIdx === pieceIndex && dataIndices.push(dataIndex);
                }, true, this);

                result.push({seriesId: seriesModel.id, dataIndex: dataIndices});
            }, this);

            return result;
        }

    });

    /**
     * Key is this._mode
     * @type {Object}
     * @this {module:echarts/component/viusalMap/PiecewiseMode}
     */
    var resetMethods = {

        splitNumber: function () {
            var thisOption = this.option;
            var precision = thisOption.precision;
            var dataExtent = this.getExtent();
            var splitNumber = thisOption.splitNumber;
            splitNumber = Math.max(parseInt(splitNumber, 10), 1);
            thisOption.splitNumber = splitNumber;

            var splitStep = (dataExtent[1] - dataExtent[0]) / splitNumber;
            // Precision auto-adaption
            while (+splitStep.toFixed(precision) !== splitStep && precision < 5) {
                precision++;
            }
            thisOption.precision = precision;
            splitStep = +splitStep.toFixed(precision);

            for (var i = 0, curr = dataExtent[0]; i < splitNumber; i++, curr += splitStep) {
                var max = i === splitNumber - 1 ? dataExtent[1] : (curr + splitStep);

                this._pieceList.push({
                    text: this.formatValueText([curr, max]),
                    index: i,
                    interval: [curr, max]
                });
            }
        },

        categories: function () {
            var thisOption = this.option;
            zrUtil.each(thisOption.categories, function (cate) {
                // FIXME category模式也使用pieceList，但在visualMapping中不是使用pieceList。
                // 是否改一致。
                this._pieceList.push({
                    text: this.formatValueText(cate, true),
                    value: cate
                });
            }, this);

            // See "Order Rule".
            normalizeReverse(thisOption, this._pieceList);
        },

        pieces: function () {
            var thisOption = this.option;
            zrUtil.each(thisOption.pieces, function (pieceListItem, index) {

                if (!zrUtil.isObject(pieceListItem)) {
                    pieceListItem = {value: pieceListItem};
                }

                var item = {text: '', index: index};
                var hasLabel;

                if (pieceListItem.label != null) {
                    item.text = pieceListItem.label;
                    hasLabel = true;
                }

                if (pieceListItem.hasOwnProperty('value')) {
                    item.value = pieceListItem.value;

                    if (!hasLabel) {
                        item.text = this.formatValueText(item.value);
                    }
                }
                else {
                    var min = pieceListItem.min;
                    var max = pieceListItem.max;
                    min == null && (min = -Infinity);
                    max == null && (max = Infinity);
                    if (min === max) {
                        // Consider: [{min: 5, max: 5, visual: {...}}, {min: 0, max: 5}],
                        // we use value to lift the priority when min === max
                        item.value = min;
                    }
                    item.interval = [min, max];

                    if (!hasLabel) {
                        item.text = this.formatValueText([min, max]);
                    }
                }

                item.visual = VisualMapping.retrieveVisuals(pieceListItem);

                this._pieceList.push(item);

            }, this);

            // See "Order Rule".
            normalizeReverse(thisOption, this._pieceList);
        }
    };

    function normalizeReverse(thisOption, arr) {
        var inverse = thisOption.inverse;
        if (thisOption.orient === 'vertical' ? !inverse : inverse) {
             arr.reverse();
        }
    }

    return PiecewiseModel;
});