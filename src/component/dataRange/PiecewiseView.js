define(function(require) {

    var DataRangeView = require('./DataRangeView');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var symbolCreators = require('../../util/symbol');
    var parsePercent = require('../../util/number').parsePercent;
    var layout = require('../../util/layout');

    var PiecewiseDataRangeView = DataRangeView.extend({

        type: 'dataRange.piecewise',

        /**
         * @protected
         * @override
         */
        doRender: function () {
            var thisGroup = this.group;
            thisGroup.removeAll();

            var dataRangeModel = this.dataRangeModel;
            var api = this.api;
            var ecWidth = api.getWidth();
            var ecHeight = api.getHeight();
            var textGap = dataRangeModel.get('textGap');
            var dataRangeText = dataRangeModel.get('text');
            var font = dataRangeModel.textStyleModel.getFont();
            var showLabel = !dataRangeText;
            var showEndsText = !showLabel;

            var itemWidth = parsePercent(dataRangeModel.get('itemWidth'), ecWidth);
            var itemHeight = parsePercent(dataRangeModel.get('itemHeight'), ecHeight);
            var itemAlign = this.getItemAlignByOrient('horizontal', ecWidth);

            showEndsText && this.renderEndsText(
                thisGroup, dataRangeText[0], itemWidth, itemHeight
            );

            zrUtil.each(this._getViewPieceList(), renderItem, this);

            showEndsText && this.renderEndsText(
                thisGroup, dataRangeText[1], itemWidth, itemHeight
            );

            layout.box(
                dataRangeModel.get('orient'), thisGroup, dataRangeModel.get('itemGap')
            );

            this.renderBackground(thisGroup);

            this.positionGroup(thisGroup);

            function renderItem(item) {
                var itemGroup = new graphic.Group();
                itemGroup.onclick = zrUtil.bind(this._onItemClick, this, item.index);

                this._createItemSymbol(itemGroup, item.piece, [0, 0, itemWidth, itemHeight]);

                if (showLabel) {
                    itemGroup.add(new graphic.Text({
                        style: {
                            x: itemAlign === 'right' ? itemWidth + textGap : -textGap,
                            y: itemHeight / 2,
                            text: item.piece.text,
                            textBaseline: 'middle',
                            textAlign: itemAlign === 'right' ? 'left' : 'right',
                            font: font
                        }
                    }));
                }

                thisGroup.add(itemGroup);
            }
        },

        /**
         * @private
         */
        _getViewPieceList: function () {
            var dataRangeModel = this.dataRangeModel;
            var list = zrUtil.map(dataRangeModel.getPieceList(), function (piece, index) {
                return {piece: piece, index: index};
            });
            var orient = dataRangeModel.get('orient');
            var inverse = dataRangeModel.get('inverse');

            if (orient === 'horizontal' ? inverse : !inverse) {
                list.reverse();
            }

            return list;
        },

        /**
         * @private
         */
        _createItemSymbol: function (group, piece, shapeParam) {
            var pieceInterval = piece.interval || [];
            var representValue = (pieceInterval[0] + pieceInterval[1]) / 2;
            var visualObj = this.getControllerVisual(representValue);

            group.add(symbolCreators.createSymbol(
                visualObj.symbol,
                shapeParam[0], shapeParam[1], shapeParam[2], shapeParam[3],
                visualObj.color
            ));
        },

        /**
         * @private
         */
        _onItemClick: function (index) {
            var dataRangeModel = this.dataRangeModel;
            var selected = zrUtil.clone(dataRangeModel.get('selected'), true);

            if (dataRangeModel.get('selectedMode') === 'single') {
                zrUtil.each(selected, function (item, index) {
                    selected[index] = false;
                });
            }
            selected[index] = !selected[index];

            this.api.dispatch({
                type: 'selectDataRange',
                from: this.uid,
                dataRangeModelId: this.dataRangeModel.uid,
                selected: selected
            });
        }
    });

    return PiecewiseDataRangeView;
});
