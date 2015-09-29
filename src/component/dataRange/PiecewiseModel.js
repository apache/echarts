/**
 * @file Data zoom model
 */
define(function(require) {

    var DataRangeModel = require('./DataRangeModel');
    var zrUtil = require('zrender/core/util');

    return DataRangeModel.extend({

        type: 'dataRange.piecewise',

        /**
         * @protected
         */
        defaultOption: {
            selected: null,
            labelPosition: 'auto',      // 'auto', 'left', 'right'
            splitNumber: 5,            // 分割段数，默认为5，为0时为线性渐变
            itemWidth: 20,             // 值域图形宽度，线性渐变水平布局宽度为该值 * 10
            itemHeight: 14,            // 值域图形高度，线性渐变垂直布局高度为该值 * 10
            itemSymbol: 'roundRect',
            selectedMode: 'multiple',
            itemGap: 10                // 各个item之间的间隔，单位px，默认为10，
                                       // 横向布局时为水平间隔，纵向布局时为纵向间隔
        },

        /**
         * @override
         */
        mergeOption: function (newOption, isInit) {
            this.baseMergeOption(newOption);

            /**
             * [{text: string, interval: Array.<number>}, ...]
             *
             * @private
             * @type {Array.<Object>}
             */
            this._pieceList = [];

            this.resetTargetSeries(newOption, isInit);
            this.resetExtent();

            this.useCustomizedSplit()
                ? this._resetForCustomizedSplit()
                : this._resetForAutoSplit();

            this._inverse();
            this._resetSelected();

            this.resetVisual(function (mappingOption) {
                mappingOption.dataNormalizer = 'piecewise';

                var intervals = mappingOption.intervals = [];
                var intervalVisuals = mappingOption.intervalVisuals = [];
                zrUtil.each(this._pieceList, function (piece, index) {
                    intervals[index] = piece.interval;
                    intervalVisuals[index] = piece.visualValue;
                });
            });
        },

        _resetSelected: function () {
            var thisOption = this.option;
            var selected = thisOption.selected;
            var pieceList = this._pieceList;

            if (thisOption.selectedMode === 'single') {
                if (!selected) {
                    selected = thisOption.selected = [];
                }

                // Ensure there is only one selected.
                var hasSel = false;
                zrUtil.each(pieceList, function (piece, index) {
                    if (selected[index]) {
                        hasSel
                            ? (selected[index] = false)
                            : (hasSel = true);
                    }
                });

                // Ensure there is at least one selected.
                if (!hasSel) {
                    selected[0] = true;
                }
            }
            else { // thisOption.selectedMode === 'multiple'
                if (!selected) {
                    // Default: all selected.
                    selected = thisOption.selected = [];
                    zrUtil.each(pieceList, function () {
                        selected.push(true);
                    });
                }
            }
        },

        _resetForAutoSplit: function () {
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
                    text: this.formatValueText(curr, max),
                    interval: [curr, max]
                });
            }
        },

        _resetForCustomizedSplit: function () {
            var option = this.option;
            var splitList = option.splitList;
            var splitNumber = splitList.length;

            for (var i = 0; i < splitNumber; i++) {
                var splitListItem = splitList[splitNumber - 1 - i];
                var text = '';

                var min = splitListItem.min;
                var max = splitListItem.max;
                min == null && (min = -Infinity);
                max == null && (max = Infinity);

                if (splitListItem.label != null) {
                    text = splitListItem.label;
                }
                else if (splitListItem.single != null) {
                    text = this.formatValueText(splitListItem.single);
                }
                else {
                    text = this.formatValueText(min, max);
                }

                this._pieceList.unshift({
                    text: text,
                    interval: [min, max],
                    visualValue: splitListItem.visualValue
                        || splitListItem.color // Compatible to ec2
                });
            }
        },

        _inverse: function () {
            var thisOption = this.option;
            var orient = thisOption.orient;
            var inverse = thisOption.inverse;

            if ((orient === 'vertical' && !inverse)
                || orient === 'horizontal' && inverse
            ) {
                this._pieceList.reverse();
            }
        },

        /**
         * @public
         */
        getPieceList: function () {
            return this._pieceList;
        },

        /**
         * @protected
         * @return {boolean}
         */
        useCustomizedSplit: function () {
            var option = this.option;
            return option.splitList && option.splitList.length > 0;
        },

        /**
         * @public
         * @override
         */
        setSelected: function (selected) {
            this.option.selected = selected.slice();
        },

        /**
         * @public
         * @override
         */
        getValueState: function (value) {
            var pieceList = this._pieceList;
            for (var i = 0, len = pieceList.length; i < len; i++) {
                var targetPiece = pieceList[i];
                if (targetPiece.interval[0] <= value && value <= targetPiece.interval[1]) {
                    return this.option.selected[i] ? 'inRange' : 'outOfRange';
                }
            }
            return 'outOfRange';
        },

        /**
         * @public
         */
        getPieceInterval: function (pieceIndex) {
            return (this._pieceList[pieceIndex] || {}).interval.slice();
        }

    });

});
