define(function (require) {

    var zrUtil = require('zrender/core/util');
    var symbolCreator = require('../../util/symbol');
    var graphic = require('../../util/graphic');
    var listComponentHelper = require('../helper/listComponent');

    var curry = zrUtil.curry;

    var LEGEND_DISABLE_COLOR = '#ccc';

    function dispatchSelectAction(name, api) {
        api.dispatchAction({
            type: 'legendToggleSelect',
            name: name
        });
    }

    function dispatchHighlightAction(seriesModel, dataName, api) {
        seriesModel.get('legendHoverLink') && api.dispatchAction({
            type: 'highlight',
            seriesName: seriesModel.name,
            name: dataName
        });
    }

    function dispatchDownplayAction(seriesModel, dataName, api) {
        seriesModel.get('legendHoverLink') && api.dispatchAction({
            type: 'downplay',
            seriesName: seriesModel.name,
            name: dataName
        });
    }

    return require('../../echarts').extendComponentView({

        type: 'legend',

        init: function () {
            this._symbolTypeStore = {};
        },

        render: function (legendModel, ecModel, api) {
            var group = this.group;
            group.removeAll();

            if (!legendModel.get('show')) {
                return;
            }

            var selectMode = legendModel.get('selectedMode');
            var itemAlign = legendModel.get('align');

            if (itemAlign === 'auto') {
                itemAlign = (legendModel.get('left') === 'right'
                    && legendModel.get('orient') === 'vertical')
                    ? 'right' : 'left';
            }

            var legendDrawedMap = {};

            zrUtil.each(legendModel.getData(), function (itemModel) {
                var name = itemModel.get('name');

                // Use empty string or \n as a newline string
                if (name === '' || name === '\n') {
                    group.add(new graphic.Group({
                        newline: true
                    }));
                    return;
                }

                var seriesModel = ecModel.getSeriesByName(name)[0];

                if (legendDrawedMap[name]) {
                    // Series not exists
                    return;
                }

                // Series legend
                if (seriesModel) {
                    var data = seriesModel.getData();
                    var color = data.getVisual('color');

                    // If color is a callback function
                    if (typeof color === 'function') {
                        // Use the first data
                        color = color(seriesModel.getDataParams(0));
                    }

                    // Using rect symbol defaultly
                    var legendSymbolType = data.getVisual('legendSymbol') || 'roundRect';
                    var symbolType = data.getVisual('symbol');

                    var itemGroup = this._createItem(
                        name, itemModel, legendModel,
                        legendSymbolType, symbolType,
                        itemAlign, color,
                        selectMode
                    );

                    itemGroup.on('click', curry(dispatchSelectAction, name, api))
                        .on('mouseover', curry(dispatchHighlightAction, seriesModel, '', api))
                        .on('mouseout', curry(dispatchDownplayAction, seriesModel, '', api));

                    legendDrawedMap[name] = true;
                }
                else {
                    // Data legend of pie, funnel
                    ecModel.eachRawSeries(function (seriesModel) {
                        // In case multiple series has same data name
                        if (legendDrawedMap[name]) {
                            return;
                        }
                        if (seriesModel.legendDataProvider) {
                            var data = seriesModel.legendDataProvider();
                            var idx = data.indexOfName(name);
                            if (idx < 0) {
                                return;
                            }

                            var color = data.getItemVisual(idx, 'color');

                            var legendSymbolType = 'roundRect';

                            var itemGroup = this._createItem(
                                name, itemModel, legendModel,
                                legendSymbolType, null,
                                itemAlign, color,
                                selectMode
                            );

                            itemGroup.on('click', curry(dispatchSelectAction, name, api))
                                // FIXME Should not specify the series name
                                .on('mouseover', curry(dispatchHighlightAction, seriesModel, name, api))
                                .on('mouseout', curry(dispatchDownplayAction, seriesModel, name, api));

                            legendDrawedMap[name] = true;
                        }
                    }, this);
                }
            }, this);

            listComponentHelper.layout(group, legendModel, api);
            // Render background after group is layout
            // FIXME
            listComponentHelper.addBackground(group, legendModel);
        },

        _createItem: function (
            name, itemModel, legendModel,
            legendSymbolType, symbolType,
            itemAlign, color, selectMode
        ) {
            var itemWidth = legendModel.get('itemWidth');
            var itemHeight = legendModel.get('itemHeight');

            var isSelected = legendModel.isSelected(name);
            var itemGroup = new graphic.Group();

            var textStyleModel = itemModel.getModel('textStyle');

            var itemIcon = itemModel.get('icon');

            // Use user given icon first
            legendSymbolType = itemIcon || legendSymbolType;
            itemGroup.add(symbolCreator.createSymbol(
                legendSymbolType, 0, 0, itemWidth, itemHeight, isSelected ? color : LEGEND_DISABLE_COLOR
            ));

            // Compose symbols
            // PENDING
            if (!itemIcon && symbolType
                // At least show one symbol, can't be all none
                && ((symbolType !== legendSymbolType) || symbolType == 'none')
            ) {
                var size = itemHeight * 0.8;
                if (symbolType === 'none') {
                    symbolType = 'circle';
                }
                // Put symbol in the center
                itemGroup.add(symbolCreator.createSymbol(
                    symbolType, (itemWidth - size) / 2, (itemHeight - size) / 2, size, size,
                    isSelected ? color : LEGEND_DISABLE_COLOR
                ));
            }

            // Text
            var textX = itemAlign === 'left' ? itemWidth + 5 : -5;
            var textAlign = itemAlign;

            var formatter = legendModel.get('formatter');
            if (typeof formatter === 'string' && formatter) {
                name = formatter.replace('{name}', name);
            }
            else if (typeof formatter === 'function') {
                name = formatter(name);
            }

            var text = new graphic.Text({
                style: {
                    text: name,
                    x: textX,
                    y: itemHeight / 2,
                    fill: isSelected ? textStyleModel.getTextColor() : LEGEND_DISABLE_COLOR,
                    textFont: textStyleModel.getFont(),
                    textAlign: textAlign,
                    textVerticalAlign: 'middle'
                }
            });
            itemGroup.add(text);

            // Add a invisible rect to increase the area of mouse hover
            itemGroup.add(new graphic.Rect({
                shape: itemGroup.getBoundingRect(),
                invisible: true
            }));

            itemGroup.eachChild(function (child) {
                child.silent = !selectMode;
            });

            this.group.add(itemGroup);

            graphic.setHoverStyle(itemGroup);

            return itemGroup;
        }
    });
});