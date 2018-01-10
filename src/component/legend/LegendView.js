import {__DEV__} from '../../config';
import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import {createSymbol} from '../../util/symbol';
import * as graphic from '../../util/graphic';
import {makeBackground} from '../helper/listComponent';
import * as layoutUtil from '../../util/layout';

var curry = zrUtil.curry;
var each = zrUtil.each;
var Group = graphic.Group;

export default echarts.extendComponentView({

    type: 'legend.plain',

    newlineDisabled: false,

    /**
     * @override
     */
    init: function () {

        /**
         * @private
         * @type {module:zrender/container/Group}
         */
        this.group.add(this._contentGroup = new Group());

        /**
         * @private
         * @type {module:zrender/Element}
         */
        this._backgroundEl;
    },

    /**
     * @protected
     */
    getContentGroup: function () {
        return this._contentGroup;
    },

    /**
     * @override
     */
    render: function (legendModel, ecModel, api) {

        this.resetInner();

        if (!legendModel.get('show', true)) {
            return;
        }

        var itemAlign = legendModel.get('align');
        if (!itemAlign || itemAlign === 'auto') {
            itemAlign = (
                legendModel.get('left') === 'right'
                && legendModel.get('orient') === 'vertical'
            ) ? 'right' : 'left';
        }

        this.renderInner(itemAlign, legendModel, ecModel, api);

        // Perform layout.
        var positionInfo = legendModel.getBoxLayoutParams();
        var viewportSize = {width: api.getWidth(), height: api.getHeight()};
        var padding = legendModel.get('padding');

        var maxSize = layoutUtil.getLayoutRect(positionInfo, viewportSize, padding);
        var mainRect = this.layoutInner(legendModel, itemAlign, maxSize);

        // Place mainGroup, based on the calculated `mainRect`.
        var layoutRect = layoutUtil.getLayoutRect(
            zrUtil.defaults({width: mainRect.width, height: mainRect.height}, positionInfo),
            viewportSize,
            padding
        );
        this.group.attr('position', [layoutRect.x - mainRect.x, layoutRect.y - mainRect.y]);

        // Render background after group is layout.
        this.group.add(
            this._backgroundEl = makeBackground(mainRect, legendModel)
        );
    },

    /**
     * @protected
     */
    resetInner: function () {
        this.getContentGroup().removeAll();
        this._backgroundEl && this.group.remove(this._backgroundEl);
    },

    /**
     * @protected
     */
    renderInner: function (itemAlign, legendModel, ecModel, api) {
        var contentGroup = this.getContentGroup();
        var legendDrawnMap = zrUtil.createHashMap();
        var selectMode = legendModel.get('selectedMode');

        each(legendModel.getData(), function (itemModel, dataIndex) {
            var name = itemModel.get('name');

            // Use empty string or \n as a newline string
            if (!this.newlineDisabled && (name === '' || name === '\n')) {
                contentGroup.add(new Group({
                    newline: true
                }));
                return;
            }

            var seriesModel = ecModel.getSeriesByName(name)[0];

            if (legendDrawnMap.get(name)) {
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
                    name, dataIndex, itemModel, legendModel,
                    legendSymbolType, symbolType,
                    itemAlign, color,
                    selectMode
                );

                itemGroup.on('click', curry(dispatchSelectAction, name, api))
                    .on('mouseover', curry(dispatchHighlightAction, seriesModel, null, api))
                    .on('mouseout', curry(dispatchDownplayAction, seriesModel, null, api));

                legendDrawnMap.set(name, true);
            }
            else {
                // Data legend of pie, funnel
                ecModel.eachRawSeries(function (seriesModel) {
                    // In case multiple series has same data name
                    if (legendDrawnMap.get(name)) {
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
                            name, dataIndex, itemModel, legendModel,
                            legendSymbolType, null,
                            itemAlign, color,
                            selectMode
                        );

                        itemGroup.on('click', curry(dispatchSelectAction, name, api))
                            // FIXME Should not specify the series name
                            .on('mouseover', curry(dispatchHighlightAction, seriesModel, name, api))
                            .on('mouseout', curry(dispatchDownplayAction, seriesModel, name, api));

                        legendDrawnMap.set(name, true);
                    }
                }, this);
            }

            if (__DEV__) {
                if (!legendDrawnMap.get(name)) {
                    console.warn(name + ' series not exists. Legend data should be same with series name or data name.');
                }
            }
        }, this);
    },

    _createItem: function (
        name, dataIndex, itemModel, legendModel,
        legendSymbolType, symbolType,
        itemAlign, color, selectMode
    ) {
        var itemWidth = legendModel.get('itemWidth');
        var itemHeight = legendModel.get('itemHeight');
        var inactiveColor = legendModel.get('inactiveColor');

        var isSelected = legendModel.isSelected(name);
        var itemGroup = new Group();

        var textStyleModel = itemModel.getModel('textStyle');

        var itemIcon = itemModel.get('icon');

        var tooltipModel = itemModel.getModel('tooltip');
        var legendGlobalTooltipModel = tooltipModel.parentModel;

        // Use user given icon first
        legendSymbolType = itemIcon || legendSymbolType;
        itemGroup.add(createSymbol(
            legendSymbolType,
            0,
            0,
            itemWidth,
            itemHeight,
            isSelected ? color : inactiveColor,
            true
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
            itemGroup.add(createSymbol(
                symbolType, (itemWidth - size) / 2, (itemHeight - size) / 2, size, size,
                isSelected ? color : inactiveColor
            ));
        }

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

        itemGroup.add(new graphic.Text({
            style: graphic.setTextStyle({}, textStyleModel, {
                text: content,
                x: textX,
                y: itemHeight / 2,
                textFill: isSelected ? textStyleModel.getTextColor() : inactiveColor,
                textAlign: textAlign,
                textVerticalAlign: 'middle'
            })
        }));

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

        this.getContentGroup().add(itemGroup);

        graphic.setHoverStyle(itemGroup);

        itemGroup.__legendDataIndex = dataIndex;

        return itemGroup;
    },

    /**
     * @protected
     */
    layoutInner: function (legendModel, itemAlign, maxSize) {
        var contentGroup = this.getContentGroup();

        // Place items in contentGroup.
        layoutUtil.box(
            legendModel.get('orient'),
            contentGroup,
            legendModel.get('itemGap'),
            maxSize.width,
            maxSize.height
        );

        var contentRect = contentGroup.getBoundingRect();
        contentGroup.attr('position', [-contentRect.x, -contentRect.y]);

        return this.group.getBoundingRect();
    }

});

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
