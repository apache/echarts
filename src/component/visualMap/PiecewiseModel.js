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
                                        // {min, max, lt, gt, lte, gte, value,
                                        // color, colorSaturation, colorAlpha, opacity,
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
        },

        /**
         * @private
         */
        getRepresentValue: function (piece) {
            var representValue;
            if (this.isCategory()) {
                representValue = piece.value;
            }
            else {
                if (piece.value != null) {
                    representValue = piece.value;
                }
                else {
                    var pieceInterval = piece.interval || [];
                    representValue = (pieceInterval[0] + pieceInterval[1]) / 2;
                }
            }
            return representValue;
        },

        getStops: function (seriesModel, getColorVisual) {
            var result = [];
            var model = this;

            if (this.isTargetSeries(seriesModel)) {
                var curr = -Infinity;
                zrUtil.each(this._pieceList, function (piece) {
                    // Do not support category yet.
                    var interval = piece.interval;
                    if (interval) {
                        interval[0] > curr && setPiece({
                            interval: [curr, interval[0]],
                            valueState: 'outOfRange'
                        });
                        setPiece({
                            interval: interval.slice(),
                            valueState: this.getValueState((interval[0] + interval[1]) / 2)
                        });
                        curr = interval[1];
                    }
                }, this);
            }
            return result;

            function setPiece(piece) {
                result.push(piece);
                piece.color = getColorVisual(
                    model, model.getRepresentValue(piece), piece.valueState
                );
            }
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
            var pieceList = this._pieceList;
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

                pieceList.push({
                    index: i,
                    interval: [curr, max],
                    close: [1, 1]
                });
            }

            normalizePieces(pieceList);

            zrUtil.each(pieceList, function (piece) {
                piece.text = this.formatValueText(piece.interval);
            }, this);
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
            var pieceList = this._pieceList;

            zrUtil.each(thisOption.pieces, function (pieceListItem, index) {

                if (!zrUtil.isObject(pieceListItem)) {
                    pieceListItem = {value: pieceListItem};
                }

                var item = {text: '', index: index};

                if (pieceListItem.label != null) {
                    item.text = pieceListItem.label;
                }

                if (pieceListItem.hasOwnProperty('value')) {
                    var value = item.value = pieceListItem.value;
                    item.interval = [value, value];
                    item.close = [1, 1];
                }
                else {
                    // `min` `max` is legacy option.
                    // `lt` `gt` `lte` `gte` is recommanded.
                    var interval = item.interval = [];
                    var close = item.close = [0, 0];

                    var closeList = [1, 0, 1];
                    var infinityList = [-Infinity, Infinity];

                    var useMinMax = [];
                    for (var lg = 0; lg < 2; lg++) {
                        var names = [['gte', 'gt', 'min'], ['lte', 'lt', 'max']][lg];
                        for (var i = 0; i < 3 && interval[lg] == null; i++) {
                            interval[lg] = pieceListItem[names[i]];
                            close[lg] = closeList[i];
                            useMinMax[lg] = i === 2;
                        }
                        interval[lg] == null && (interval[lg] = infinityList[lg]);
                    }
                    useMinMax[0] && interval[1] === Infinity && (close[0] = 0);
                    useMinMax[1] && interval[0] === -Infinity && (close[1] = 0);

                    if (__DEV__) {
                        if (interval[0] > interval[1]) {
                            console.warn(
                                'Piece ' + index + 'is illegal: ' + interval
                                + ' lower bound should not greater then uppper bound.'
                            );
                        }
                    }

                    if (interval[0] === interval[1] && close[0] && close[1]) {
                        // Consider: [{min: 5, max: 5, visual: {...}}, {min: 0, max: 5}],
                        // we use value to lift the priority when min === max
                        item.value = interval[0];
                    }
                }

                item.visual = VisualMapping.retrieveVisuals(pieceListItem);

                pieceList.push(item);

            }, this);

            // See "Order Rule".
            normalizeReverse(thisOption, pieceList);
            // Only pieces
            normalizePieces(pieceList);

            zrUtil.each(pieceList, function (piece) {
                var close = piece.close;
                var edgeSymbols = [['<', '≤'][close[1]], ['>', '≥'][close[0]]];
                piece.text = piece.text || this.formatValueText(
                    piece.value != null ? piece.value : piece.interval,
                    false,
                    edgeSymbols
                );
            }, this);
        }
    };

    function normalizeReverse(thisOption, pieceList) {
        var inverse = thisOption.inverse;
        if (thisOption.orient === 'vertical' ? !inverse : inverse) {
             pieceList.reverse();
        }
    }

    // Reorder, remove duplicate, which are needed when using gradient.
    // Not applicable for categories.
    function normalizePieces(pieceList) {
        pieceList.sort(function (a, b) {
            return littleThan(a, b) ? -1 : 1;
        });

        var curr = -Infinity;
        for (var i = 0; i < pieceList.length; i++) {
            var interval = pieceList[i].interval;
            var close = pieceList[i].close;
            for (var lg = 0; lg < 2; lg++) {
                if (interval[lg] < curr) {
                    interval[lg] = curr;
                    close[lg] = 1 - lg;
                }
                curr = interval[lg];
            }
        }
        // console.log(JSON.stringify(pieceList.map(a => a.interval)));

        function littleThan(piece, standard, lg) {
            lg = lg || 0;
            return piece.interval[lg] < standard.interval[lg]
                || (
                    piece.interval[lg] === standard.interval[lg]
                    && (
                        +piece.close[lg] > standard.close[lg]
                        || littleThan(piece, standard, 1)
                    )
                );
        }
    }

    return PiecewiseModel;
});