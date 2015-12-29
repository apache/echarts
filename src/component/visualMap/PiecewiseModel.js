define(function(require) {

    var VisualMapModel = require('./VisualMapModel');
    var zrUtil = require('zrender/core/util');
    var VisualMapping = require('../../visual/VisualMapping');

    return VisualMapModel.extend({

        type: 'visualMap.piecewise',

        /**
         * @protected
         */
        defaultOption: {
            selected: null,
            align: 'auto',             // 'auto', 'left', 'right'
            itemWidth: 20,             // 值域图形宽度，线性渐变水平布局宽度为该值 * 10
            itemHeight: 14,            // 值域图形高度，线性渐变垂直布局高度为该值 * 10
            itemSymbol: 'roundRect',
            splitList: null,           // 值顺序：由高到低, item can be:
                                    // {min, max, value, color, colorSaturation, colorAlpha, symbol, symbolSize}
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
             * Compatible with ec2, value order is [high, ..., low]
             * [{text: string, interval: Array.<number>}, ...]
             *
             * @private
             * @type {Array.<Object>}
             */
            this._pieceList = [];

            this.resetTargetSeries(newOption, isInit);
            this.resetExtent();

            var categories = this.option.categories;

            this.useCustomizedSplit()
                ? this._resetForCustomizedSplit()
                : categories
                ? this._resetForCategory()
                : this._resetForAutoSplit();

            this._resetSelected();

            var mappingMethod = categories ? 'category' : 'piecewise';

            this.resetVisual(function (mappingOption, state) {
                mappingOption.mappingMethod = mappingMethod;
                mappingOption.categories = categories && zrUtil.clone(categories);

                var intervals = mappingOption.intervals = [];
                var specifiedVisuals = mappingOption.specifiedVisuals = [];

                zrUtil.each(this._pieceList, function (piece, index) {
                    if (piece.interval) {
                        intervals[index] = piece.interval;
                    }
                    if (state === 'inRange') {
                        specifiedVisuals[index] = piece.visuals;
                    }
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

        _resetForCategory: function () {
            zrUtil.each(this.option.categories, function (cate) {
                this._pieceList.push({
                    text: this.formatValueText(cate, null, true),
                    value: cate
                });
            }, this);
        },

        _resetForCustomizedSplit: function () {
            var option = this.option;
            var splitList = option.splitList;
            var splitNumber = splitList.length;

            for (var i = 0; i < splitNumber; i++) {
                var splitListItem = splitList[splitNumber - 1 - i];

                if (!zrUtil.isObject(splitListItem)) {
                    splitListItem = {value: splitListItem};
                }

                var item = {text: ''};
                var hasLabel;

                if (splitListItem.label != null) {
                    item.text = splitListItem.label;
                    hasLabel = true;
                }

                if (splitListItem.hasOwnProperty('value')) {
                    item.value = splitListItem.value;

                    if (!hasLabel) {
                        item.text = this.formatValueText(item.value);
                    }
                }
                else {
                    var min = splitListItem.min;
                    var max = splitListItem.max;
                    min == null && (min = -Infinity);
                    max == null && (max = Infinity);
                    item.interval = [min, max];

                    if (!hasLabel) {
                        item.text = this.formatValueText(min, max);
                    }
                }

                item.visuals = VisualMapping.retrieveVisuals(splitListItem);

                this._pieceList.unshift(item);
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
            var targetIndex;
            for (var i = 0, len = pieceList.length; i < len; i++) {
                var targetPiece = pieceList[i];
                if (targetPiece.hasOwnProperty('value')) {
                    if (targetPiece.value === value) {
                        targetIndex = i;
                        break;
                    }
                }
                else if (targetPiece.interval[0] <= value && value <= targetPiece.interval[1]) {
                    targetIndex = i;
                    break;
                }
            }
            return targetIndex != null
                ? (this.option.selected[targetIndex] ? 'inRange' : 'outOfRange')
                : 'outOfRange';
        }

    });

});
