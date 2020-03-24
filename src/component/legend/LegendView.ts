/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import {__DEV__} from '../../config';
import * as zrUtil from 'zrender/src/core/util';
import {createSymbol} from '../../util/symbol';
import * as graphic from '../../util/graphic';
import {makeBackground} from '../helper/listComponent';
import * as layoutUtil from '../../util/layout';
import ComponentView from '../../view/Component';
import LegendModel, { LegendOption, LegendSelectorButtonOption, LegendTooltipFormatterParams } from './LegendModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import {
    ColorString,
    ZRTextAlign,
    ZRColor,
    ItemStyleOption,
    ZRRectLike,
    ECElement,
    CommonTooltipOption
} from '../../util/types';
import Model from '../../model/Model';
import Displayable from 'zrender/src/graphic/Displayable';

const curry = zrUtil.curry;
const each = zrUtil.each;
const Group = graphic.Group;

class LegendView extends ComponentView {
    static type = 'legend.plain';
    type = LegendView.type;

    newlineDisabled = false;

    private _contentGroup: graphic.Group;

    private _backgroundEl: graphic.Rect;

    private _selectorGroup: graphic.Group;

    /**
     * If first rendering, `contentGroup.position` is [0, 0], which
     * does not make sense and may cause unexepcted animation if adopted.
     */
    private _isFirstRender: boolean;

    init() {

        this.group.add(this._contentGroup = new Group());
        this.group.add(this._selectorGroup = new Group());

        this._isFirstRender = true;
    }

    /**
     * @protected
     */
    getContentGroup() {
        return this._contentGroup;
    }

    /**
     * @protected
     */
    getSelectorGroup() {
        return this._selectorGroup;
    }

    /**
     * @override
     */
    render(
        legendModel: LegendModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        let isFirstRender = this._isFirstRender;
        this._isFirstRender = false;

        this.resetInner();

        if (!legendModel.get('show', true)) {
            return;
        }

        let itemAlign = legendModel.get('align');
        let orient = legendModel.get('orient');
        if (!itemAlign || itemAlign === 'auto') {
            itemAlign = (
                legendModel.get('left') === 'right'
                && orient === 'vertical'
            ) ? 'right' : 'left';
        }

        // selector has been normalized to an array in model
        let selector = legendModel.get('selector', true) as LegendSelectorButtonOption[];
        let selectorPosition = legendModel.get('selectorPosition', true);
        if (selector && (!selectorPosition || selectorPosition === 'auto')) {
            selectorPosition = orient === 'horizontal' ? 'end' : 'start';
        }

        this.renderInner(itemAlign, legendModel, ecModel, api, selector, orient, selectorPosition);

        // Perform layout.
        let positionInfo = legendModel.getBoxLayoutParams();
        let viewportSize = {width: api.getWidth(), height: api.getHeight()};
        let padding = legendModel.get('padding');

        let maxSize = layoutUtil.getLayoutRect(positionInfo, viewportSize, padding);

        let mainRect = this.layoutInner(legendModel, itemAlign, maxSize, isFirstRender, selector, selectorPosition);

        // Place mainGroup, based on the calculated `mainRect`.
        let layoutRect = layoutUtil.getLayoutRect(
            zrUtil.defaults({
                width: mainRect.width,
                height: mainRect.height
            }, positionInfo),
            viewportSize,
            padding
        );
        this.group.attr('position', [layoutRect.x - mainRect.x, layoutRect.y - mainRect.y]);

        // Render background after group is layout.
        this.group.add(
            this._backgroundEl = makeBackground(mainRect, legendModel)
        );
    }

    protected resetInner() {
        this.getContentGroup().removeAll();
        this._backgroundEl && this.group.remove(this._backgroundEl);
        this.getSelectorGroup().removeAll();
    }

    protected renderInner(
        itemAlign: LegendOption['align'],
        legendModel: LegendModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        selector: LegendSelectorButtonOption[],
        orient: LegendOption['orient'],
        selectorPosition: LegendOption['selectorPosition']
    ) {
        let contentGroup = this.getContentGroup();
        let legendDrawnMap = zrUtil.createHashMap();
        let selectMode = legendModel.get('selectedMode');

        let excludeSeriesId: string[] = [];
        ecModel.eachRawSeries(function (seriesModel) {
            !seriesModel.get('legendHoverLink') && excludeSeriesId.push(seriesModel.id);
        });

        each(legendModel.getData(), function (itemModel, dataIndex) {
            let name = itemModel.get('name');

            // Use empty string or \n as a newline string
            if (!this.newlineDisabled && (name === '' || name === '\n')) {
                const g = new Group();
                // @ts-ignore
                g.newline = true;
                contentGroup.add(g);
                return;
            }

            // Representitive series.
            let seriesModel = ecModel.getSeriesByName(name)[0];

            if (legendDrawnMap.get(name)) {
                // Have been drawed
                return;
            }

            // Legend to control series.
            if (seriesModel) {
                let data = seriesModel.getData();
                let color = data.getVisual('color');
                let borderColor = data.getVisual('borderColor');

                // If color is a callback function
                if (typeof color === 'function') {
                    // Use the first data
                    color = color(seriesModel.getDataParams(0));
                }

                 // If borderColor is a callback function
                if (typeof borderColor === 'function') {
                    // Use the first data
                    borderColor = borderColor(seriesModel.getDataParams(0));
                }

                // Using rect symbol defaultly
                let legendSymbolType = data.getVisual('legendSymbol') || 'roundRect';
                let symbolType = data.getVisual('symbol');

                let itemGroup = this._createItem(
                    name, dataIndex, itemModel, legendModel,
                    legendSymbolType, symbolType,
                    itemAlign, color, borderColor,
                    selectMode
                );

                itemGroup.on('click', curry(dispatchSelectAction, name, null, api, excludeSeriesId))
                    .on('mouseover', curry(dispatchHighlightAction, seriesModel.name, null, api, excludeSeriesId))
                    .on('mouseout', curry(dispatchDownplayAction, seriesModel.name, null, api, excludeSeriesId));

                legendDrawnMap.set(name, true);
            }
            else {
                // Legend to control data. In pie and funnel.
                ecModel.eachRawSeries(function (seriesModel) {

                    // In case multiple series has same data name
                    if (legendDrawnMap.get(name)) {
                        return;
                    }

                    if (seriesModel.legendVisualProvider) {
                        let provider = seriesModel.legendVisualProvider;
                        if (!provider.containName(name)) {
                            return;
                        }

                        let idx = provider.indexOfName(name);

                        let color = provider.getItemVisual(idx, 'color');
                        let borderColor = provider.getItemVisual(idx, 'borderColor');

                        let legendSymbolType = 'roundRect';

                        let itemGroup = this._createItem(
                            name, dataIndex, itemModel, legendModel,
                            legendSymbolType, null,
                            itemAlign, color, borderColor,
                            selectMode
                        );

                        // FIXME: consider different series has items with the same name.
                        itemGroup.on('click', curry(dispatchSelectAction, null, name, api, excludeSeriesId))
                            // Should not specify the series name, consider legend controls
                            // more than one pie series.
                            .on('mouseover', curry(dispatchHighlightAction, null, name, api, excludeSeriesId))
                            .on('mouseout', curry(dispatchDownplayAction, null, name, api, excludeSeriesId));

                        legendDrawnMap.set(name, true);
                    }

                }, this);
            }

            if (__DEV__) {
                if (!legendDrawnMap.get(name)) {
                    console.warn(
                        name + ' series not exists. Legend data should be same with series name or data name.'
                    );
                }
            }
        }, this);

        if (selector) {
            this._createSelector(selector, legendModel, api, orient, selectorPosition);
        }
    }

    private _createSelector(
        selector: LegendSelectorButtonOption[],
        legendModel: LegendModel,
        api: ExtensionAPI,
        orient: LegendOption['orient'],
        selectorPosition: LegendOption['selectorPosition']
    ) {
        let selectorGroup = this.getSelectorGroup();

        each(selector, function createSelectorButton(selectorItem) {
            let type = selectorItem.type;

            let labelText = new graphic.Text({
                style: {
                    x: 0,
                    y: 0,
                    align: 'center',
                    verticalAlign: 'middle'
                },
                onclick() {
                    api.dispatchAction({
                        type: type === 'all' ? 'legendAllSelect' : 'legendInverseSelect'
                    });
                }
            });

            selectorGroup.add(labelText);

            let labelModel = legendModel.getModel('selectorLabel');
            let emphasisLabelModel = legendModel.getModel(['emphasis', 'selectorLabel']);

            graphic.setLabelStyle(
                labelText, labelModel, emphasisLabelModel,
                {
                    defaultText: selectorItem.title
                }
            );
            graphic.enableHoverEmphasis(labelText);
        });
    }

    private _createItem(
        name: string,
        dataIndex: number,
        itemModel: LegendModel['_data'][number],
        legendModel: LegendModel,
        legendSymbolType: string,
        symbolType: string,
        itemAlign: LegendOption['align'],
        color: ColorString,
        borderColor: ColorString,
        selectMode: LegendOption['selectedMode']
    ) {
        let itemWidth = legendModel.get('itemWidth');
        let itemHeight = legendModel.get('itemHeight');
        let inactiveColor = legendModel.get('inactiveColor');
        let inactiveBorderColor = legendModel.get('inactiveBorderColor');
        let symbolKeepAspect = legendModel.get('symbolKeepAspect');
        let legendModelItemStyle = legendModel.getModel('itemStyle');

        let isSelected = legendModel.isSelected(name);
        let itemGroup = new Group();

        let textStyleModel = itemModel.getModel('textStyle');

        let itemIcon = itemModel.get('icon');

        let tooltipModel = itemModel.getModel('tooltip') as Model<CommonTooltipOption<LegendTooltipFormatterParams>>;
        let legendGlobalTooltipModel = tooltipModel.parentModel;

        // Use user given icon first
        legendSymbolType = itemIcon || legendSymbolType;
        let legendSymbol = createSymbol(
            legendSymbolType,
            0,
            0,
            itemWidth,
            itemHeight,
            isSelected ? color : inactiveColor,
            // symbolKeepAspect default true for legend
            symbolKeepAspect == null ? true : symbolKeepAspect
        );
        itemGroup.add(
            setSymbolStyle(
                legendSymbol, legendSymbolType, legendModelItemStyle,
                borderColor, inactiveBorderColor, isSelected
            )
        );

        // Compose symbols
        // PENDING
        if (!itemIcon && symbolType
            // At least show one symbol, can't be all none
            && ((symbolType !== legendSymbolType) || symbolType === 'none')
        ) {
            let size = itemHeight * 0.8;
            if (symbolType === 'none') {
                symbolType = 'circle';
            }
            let legendSymbolCenter = createSymbol(
                symbolType,
                (itemWidth - size) / 2,
                (itemHeight - size) / 2,
                size,
                size,
                isSelected ? color : inactiveColor,
                // symbolKeepAspect default true for legend
                symbolKeepAspect == null ? true : symbolKeepAspect
            );
            // Put symbol in the center
            itemGroup.add(
                setSymbolStyle(
                    legendSymbolCenter, symbolType, legendModelItemStyle,
                    borderColor, inactiveBorderColor, isSelected
                )
            );
        }

        let textX = itemAlign === 'left' ? itemWidth + 5 : -5;
        let textAlign = itemAlign as ZRTextAlign;

        let formatter = legendModel.get('formatter');
        let content = name;
        if (typeof formatter === 'string' && formatter) {
            content = formatter.replace('{name}', name != null ? name : '');
        }
        else if (typeof formatter === 'function') {
            content = formatter(name);
        }

        itemGroup.add(new graphic.Text({
            style: graphic.createTextStyle(textStyleModel, {
                text: content,
                x: textX,
                y: itemHeight / 2,
                fill: isSelected ? textStyleModel.getTextColor() : inactiveColor,
                align: textAlign,
                verticalAlign: 'middle'
            })
        }));

        // Add a invisible rect to increase the area of mouse hover
        let hitRect = new graphic.Rect({
            shape: itemGroup.getBoundingRect(),
            invisible: true
        });
        if (tooltipModel.get('show')) {
            const formatterParams: LegendTooltipFormatterParams = {
                componentType: 'legend',
                legendIndex: legendModel.componentIndex,
                name: name,
                $vars: ['name']
            };
            (hitRect as ECElement).tooltip = zrUtil.extend({
                content: name,
                // Defaul formatter
                formatter: legendGlobalTooltipModel.get('formatter', true)
                    || function (params: LegendTooltipFormatterParams) {
                        return params.name;
                    },
                formatterParams: formatterParams
            }, tooltipModel.option);
        }
        itemGroup.add(hitRect);

        itemGroup.eachChild(function (child) {
            child.silent = true;
        });

        hitRect.silent = !selectMode;

        this.getContentGroup().add(itemGroup);

        graphic.enableHoverEmphasis(itemGroup);

        // @ts-ignore
        itemGroup.__legendDataIndex = dataIndex;

        return itemGroup;
    }

    protected layoutInner(
        legendModel: LegendModel,
        itemAlign: LegendOption['align'],
        maxSize: { width: number, height: number },
        isFirstRender: boolean,
        selector: LegendOption['selector'],
        selectorPosition: LegendOption['selectorPosition']
    ): ZRRectLike {
        let contentGroup = this.getContentGroup();
        let selectorGroup = this.getSelectorGroup();

        // Place items in contentGroup.
        layoutUtil.box(
            legendModel.get('orient'),
            contentGroup,
            legendModel.get('itemGap'),
            maxSize.width,
            maxSize.height
        );

        let contentRect = contentGroup.getBoundingRect();
        let contentPos = [-contentRect.x, -contentRect.y];

        if (selector) {
            // Place buttons in selectorGroup
            layoutUtil.box(
                // Buttons in selectorGroup always layout horizontally
                'horizontal',
                selectorGroup,
                legendModel.get('selectorItemGap', true)
            );

            let selectorRect = selectorGroup.getBoundingRect();
            let selectorPos = [-selectorRect.x, -selectorRect.y];
            let selectorButtonGap = legendModel.get('selectorButtonGap', true);

            let orientIdx = legendModel.getOrient().index;
            let wh: 'width' | 'height' = orientIdx === 0 ? 'width' : 'height';
            let hw: 'width' | 'height' = orientIdx === 0 ? 'height' : 'width';
            let yx: 'x' | 'y' = orientIdx === 0 ? 'y' : 'x';

            if (selectorPosition === 'end') {
                selectorPos[orientIdx] += contentRect[wh] + selectorButtonGap;
            }
            else {
                contentPos[orientIdx] += selectorRect[wh] + selectorButtonGap;
            }

            //Always align selector to content as 'middle'
            selectorPos[1 - orientIdx] += contentRect[hw] / 2 - selectorRect[hw] / 2;
            selectorGroup.attr('position', selectorPos);
            contentGroup.attr('position', contentPos);

            let mainRect = {x: 0, y: 0} as ZRRectLike;
            mainRect[wh] = contentRect[wh] + selectorButtonGap + selectorRect[wh];
            mainRect[hw] = Math.max(contentRect[hw], selectorRect[hw]);
            mainRect[yx] = Math.min(0, selectorRect[yx] + selectorPos[1 - orientIdx]);
            return mainRect;
        }
        else {
            contentGroup.attr('position', contentPos);
            return this.group.getBoundingRect();
        }
    }

    /**
     * @protected
     */
    remove() {
        this.getContentGroup().removeAll();
        this._isFirstRender = true;
    }

}

function setSymbolStyle(
    symbol: graphic.Path | graphic.Image,
    symbolType: string,
    legendModelItemStyle: Model<ItemStyleOption>,
    borderColor: ZRColor,
    inactiveBorderColor: ZRColor,
    isSelected: boolean
) {
    let itemStyle;
    if (symbolType !== 'line' && symbolType.indexOf('empty') < 0) {
        itemStyle = legendModelItemStyle.getItemStyle();
        (symbol as graphic.Path).style.stroke = borderColor;
        if (!isSelected) {
            itemStyle.stroke = inactiveBorderColor;
        }
    }
    else {
        itemStyle = legendModelItemStyle.getItemStyle(['borderWidth', 'borderColor']);
    }
    (symbol as Displayable).setStyle(itemStyle);
    return symbol;
}

function dispatchSelectAction(
    seriesName: string,
    dataName: string,
    api: ExtensionAPI,
    excludeSeriesId: string[]
) {
    // downplay before unselect
    dispatchDownplayAction(seriesName, dataName, api, excludeSeriesId);
    api.dispatchAction({
        type: 'legendToggleSelect',
        name: seriesName != null ? seriesName : dataName
    });
    // highlight after select
    dispatchHighlightAction(seriesName, dataName, api, excludeSeriesId);
}

function dispatchHighlightAction(
    seriesName: string,
    dataName: string,
    api: ExtensionAPI,
    excludeSeriesId: string[]
) {
    // If element hover will move to a hoverLayer.
    let el = api.getZr().storage.getDisplayList()[0];
    if (!(el && el.useHoverLayer)) {
        api.dispatchAction({
            type: 'highlight',
            seriesName: seriesName,
            name: dataName,
            excludeSeriesId: excludeSeriesId
        });
    }
}

function dispatchDownplayAction(
    seriesName: string,
    dataName: string,
    api: ExtensionAPI,
    excludeSeriesId: string[]
) {
    // If element hover will move to a hoverLayer.
    let el = api.getZr().storage.getDisplayList()[0];
    if (!(el && el.useHoverLayer)) {
        api.dispatchAction({
            type: 'downplay',
            seriesName: seriesName,
            name: dataName,
            excludeSeriesId: excludeSeriesId
        });
    }
}


ComponentView.registerClass(LegendView);

export default LegendView;