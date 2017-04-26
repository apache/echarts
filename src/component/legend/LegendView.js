define(function (require) {

    var zrUtil = require('zrender/core/util');
    var symbolCreator = require('../../util/symbol');
    var graphic = require('../../util/graphic');
    var listComponentHelper = require('../helper/listComponent');

    var curry = zrUtil.curry;

    function dispatchSelectAction(name, api) {
        api.dispatchAction({
            type: 'legendToggleSelect',
            name: name
        });
    }

    function dispatchHighlightAction(seriesModel, dataName, api) {
        // If element hover will move to a hoverLayer.
        var el = api.getZr().storage.getDisplayList()[0];
        if (!(el && el.useHoverLayer)) {
            seriesModel.get('legendHoverLink') && api.dispatchAction({
                type: 'highlight',
                seriesName: seriesModel.name,
                name: dataName
            });
        }
    }

    function dispatchDownplayAction(seriesModel, dataName, api) {
        // If element hover will move to a hoverLayer.
        var el = api.getZr().storage.getDisplayList()[0];
        if (!(el && el.useHoverLayer)) {
            seriesModel.get('legendHoverLink') && api.dispatchAction({
                type: 'downplay',
                seriesName: seriesModel.name,
                name: dataName
            });
        }
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

            var legendDrawedMap = zrUtil.createHashMap();

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

                if (legendDrawedMap.get(name)) {
                    // Have been drawed
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
                        .on('mouseover', curry(dispatchHighlightAction, seriesModel, null, api))
                        .on('mouseout', curry(dispatchDownplayAction, seriesModel, null, api));

                    legendDrawedMap.set(name, true);
                }
                else {
                    // Data legend of pie, funnel
                    ecModel.eachRawSeries(function (seriesModel) {
                        // In case multiple series has same data name
                        if (legendDrawedMap.get(name)) {
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

                            legendDrawedMap.set(name, true);
                        }
                    }, this);
                }

                if (__DEV__) {
                    if (!legendDrawedMap.get(name)) {
                        console.warn(name + ' series not exists. Legend data should be same with series name or data name.');
                    }
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
            var inactiveColor = legendModel.get('inactiveColor');

            var isSelected = legendModel.isSelected(name);
            var itemGroup = new graphic.Group();

            var textStyleModel = itemModel.getModel('textStyle');

            var itemIcon = itemModel.get('icon');

            var tooltipModel = itemModel.getModel('tooltip');
            var legendGlobalTooltipModel = tooltipModel.parentModel;

            // Use user given icon first
            legendSymbolType = itemIcon || legendSymbolType;
            itemGroup.add(symbolCreator.createSymbol(
                legendSymbolType, 0, 0, itemWidth, itemHeight, isSelected ? color : inactiveColor
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
                    isSelected ? color : inactiveColor
                ));
            }

            // Text
            var textX = itemAlign === 'left' ? itemWidth + 5 : -5;
            var textAlign = itemAlign;

            var formatter = legendModel.get('formatter');
            var content = name;
            if (typeof formatter === 'string' && formatter) {
                content = formatter.replace('{name}', name != null ? name : '');
            }
            else if (typeof formatter === 'function') {
                content = formatter(name);
            }

            var text = new graphic.Text({
                style: {
                    text: content,
                    x: textX,
                    y: itemHeight / 2,
                    fill: isSelected ? textStyleModel.getTextColor() : inactiveColor,
                    textFont: textStyleModel.getFont(),
                    textAlign: textAlign,
                    textVerticalAlign: 'middle'
                }
            });
            itemGroup.add(text);

            // Add a invisible rect to increase the area of mouse hover
            var hitRect = new graphic.Rect({
                shape: itemGroup.getBoundingRect(),
                invisible: true,
                tooltip: tooltipModel.get('show') ? zrUtil.extend({
                    content: name,
                    // Defaul formatter
                    formatter: legendGlobalTooltipModel.get('formatter', true) || function () {
                        return name;
                    },
                    formatterParams: {
                        componentType: 'legend',
                        legendIndex: legendModel.componentIndex,
                        name: name,
                        $vars: ['name']
                    }
                }, tooltipModel.option) : null
            });
            itemGroup.add(hitRect);

            itemGroup.eachChild(function (child) {
                child.silent = true;
            });

            hitRect.silent = !selectMode;



            this.group.add(itemGroup);

            graphic.setHoverStyle(itemGroup);

            return itemGroup;
        }
    });
});