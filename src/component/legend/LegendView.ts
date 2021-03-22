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

import * as zrUtil from 'zrender/src/core/util';
import {createSymbol} from '../../util/symbol';
import * as graphic from '../../util/graphic';
import { enableHoverEmphasis } from '../../util/states';
import {setLabelStyle, createTextStyle} from '../../label/labelStyle';
import {makeBackground} from '../helper/listComponent';
import * as layoutUtil from '../../util/layout';
import ComponentView from '../../view/Component';
import LegendModel, { LegendItemStyleOption, LegendLineStyleOption, LegendOption, LegendSelectorButtonOption, LegendTooltipFormatterParams } from './LegendModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import {
    ZRTextAlign,
    ZRColor,
    ItemStyleOption,
    ZRRectLike,
    CommonTooltipOption,
    ColorString,
    SeriesOption,
    SymbolOptionMixin,
    LineStyleOption,
    DecalObject
} from '../../util/types';
import Model from '../../model/Model';
import Displayable, { DisplayableState } from 'zrender/src/graphic/Displayable';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { parse, stringify } from 'zrender/src/tool/color';
import {PatternObject} from 'zrender/src/graphic/Pattern';
import {SeriesModel} from '../../echarts';
import linesLayout from '../../chart/lines/linesLayout';
import {LineStyleProps} from '../../model/mixin/lineStyle';
import {ItemStyleProps} from '../../model/mixin/itemStyle';
import {number} from '../../export/api';
import makeStyleMapper from '../../model/mixin/makeStyleMapper';

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
        const isFirstRender = this._isFirstRender;
        this._isFirstRender = false;

        this.resetInner();

        if (!legendModel.get('show', true)) {
            return;
        }

        let itemAlign = legendModel.get('align');
        const orient = legendModel.get('orient');
        if (!itemAlign || itemAlign === 'auto') {
            itemAlign = (
                legendModel.get('left') === 'right'
                && orient === 'vertical'
            ) ? 'right' : 'left';
        }

        // selector has been normalized to an array in model
        const selector = legendModel.get('selector', true) as LegendSelectorButtonOption[];
        let selectorPosition = legendModel.get('selectorPosition', true);
        if (selector && (!selectorPosition || selectorPosition === 'auto')) {
            selectorPosition = orient === 'horizontal' ? 'end' : 'start';
        }

        this.renderInner(itemAlign, legendModel, ecModel, api, selector, orient, selectorPosition);

        // Perform layout.
        const positionInfo = legendModel.getBoxLayoutParams();
        const viewportSize = {width: api.getWidth(), height: api.getHeight()};
        const padding = legendModel.get('padding');

        const maxSize = layoutUtil.getLayoutRect(positionInfo, viewportSize, padding);

        const mainRect = this.layoutInner(legendModel, itemAlign, maxSize, isFirstRender, selector, selectorPosition);

        // Place mainGroup, based on the calculated `mainRect`.
        const layoutRect = layoutUtil.getLayoutRect(
            zrUtil.defaults({
                width: mainRect.width,
                height: mainRect.height
            }, positionInfo),
            viewportSize,
            padding
        );
        this.group.x = layoutRect.x - mainRect.x;
        this.group.y = layoutRect.y - mainRect.y;
        this.group.markRedraw();

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
        const contentGroup = this.getContentGroup();
        const legendDrawnMap = zrUtil.createHashMap();
        const selectMode = legendModel.get('selectedMode');

        const excludeSeriesId: string[] = [];
        ecModel.eachRawSeries(function (seriesModel) {
            !seriesModel.get('legendHoverLink') && excludeSeriesId.push(seriesModel.id);
        });

        each(legendModel.getData(), function (legendItemModel, dataIndex) {
            const name = legendItemModel.get('name');

            // Use empty string or \n as a newline string
            if (!this.newlineDisabled && (name === '' || name === '\n')) {
                const g = new Group();
                // @ts-ignore
                g.newline = true;
                contentGroup.add(g);
                return;
            }

            // Representitive series.
            const seriesModel = ecModel.getSeriesByName(name)[0] as
                SeriesModel<SeriesOption & SymbolOptionMixin>;

            if (legendDrawnMap.get(name)) {
                // Have been drawed
                return;
            }

            // Legend to control series.
            if (seriesModel) {
                const data = seriesModel.getData();
                const lineVisualStyle = data.getVisual('legendLineStyle') || {};

                /**
                 * `data.getVisual('style')` may be the color from the register
                 * in series. For example, for line series,
                 */
                const style = data.getVisual('style');

                // Using rect symbol defaultly
                const legendSymbolType = data.getVisual('legendSymbol') || 'roundRect';
                const symbolType = data.getVisual('symbol');
                const symbolSize = data.getVisual('symbolSize');

                const drawType = seriesModel.visualDrawType;

                data.getVisual('symbolSize');

                const itemGroup = this._createItem(
                    name, dataIndex, legendItemModel, legendModel,
                    legendSymbolType, symbolType, symbolSize,
                    itemAlign,
                    lineVisualStyle, style, drawType, selectMode
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
                        const provider = seriesModel.legendVisualProvider;
                        if (!provider.containName(name)) {
                            return;
                        }

                        const idx = provider.indexOfName(name);

                        const style = provider.getItemVisual(idx, 'style') as PathStyleProps;

                        const colorArr = parse(style.fill as ColorString);
                        // Color may be set to transparent in visualMap when data is out of range.
                        // Do not show nothing.
                        if (colorArr && colorArr[3] === 0) {
                            colorArr[3] = 0.2;
                            // TODO color is set to 0, 0, 0, 0. Should show correct RGBA
                            style.fill = stringify(colorArr, 'rgba');
                        }

                        const legendSymbolType = 'roundRect';
                        const drawType = seriesModel.visualDrawType;

                        const itemGroup = this._createItem(
                            name, dataIndex, legendItemModel, legendModel,
                            legendSymbolType, null, null,
                            itemAlign,
                            {}, style, drawType, selectMode
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
        const selectorGroup = this.getSelectorGroup();

        each(selector, function createSelectorButton(selectorItem) {
            const type = selectorItem.type;

            const labelText = new graphic.Text({
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

            const labelModel = legendModel.getModel('selectorLabel');
            const emphasisLabelModel = legendModel.getModel(['emphasis', 'selectorLabel']);

            setLabelStyle(
                labelText, { normal: labelModel, emphasis: emphasisLabelModel },
                {
                    defaultText: selectorItem.title
                }
            );
            enableHoverEmphasis(labelText);
        });
    }

    private _createItem(
        name: string,
        dataIndex: number,
        itemModel: LegendModel['_data'][number],
        legendModel: LegendModel,
        legendSymbolType: string,
        dataSymbolType: string,
        dataSymbolSize: number | number[],
        itemAlign: LegendOption['align'],
        lineVisualStyle: LineStyleProps,
        itemVisualStyle: PathStyleProps,
        drawType: 'fill' | 'stroke',
        selectMode: LegendOption['selectedMode']
    ) {
        const itemWidth = legendModel.get('itemWidth');
        const itemHeight = legendModel.get('itemHeight');
        const isSelected = legendModel.isSelected(name);

        const symbolKeepAspect = itemModel.get('symbolKeepAspect');
        const itemIcon = itemModel.get('icon');

        let symbolSize;
        const legendSymbolSize = itemModel.get('symbolSize');
        if (legendSymbolSize === 'auto') {
            // auto: 80% itemHeight if has line, 100% elsewise
            const hasHorizontalLine = !itemIcon && dataSymbolType
                && ((dataSymbolType !== legendSymbolType) || dataSymbolType === 'none');
            symbolSize = hasHorizontalLine
                ? itemHeight * 0.8
                : [itemWidth, itemHeight];
        }
        else if (legendSymbolSize !== 'inherit')  {
            // number: legend.symbolSize
            symbolSize = legendSymbolSize;
        }
        else {
            // inherit: series.symbolSize
            symbolSize = dataSymbolSize;
        }

        dataSymbolType = dataSymbolType || 'roundRect';

        const legendLineStyle = legendModel.getModel('lineStyle');
        const style = getLegendStyle(dataSymbolType, itemModel, legendLineStyle, lineVisualStyle, itemVisualStyle, drawType, isSelected);

        const itemGroup = new Group();

        const textStyleModel = itemModel.getModel('textStyle');

        // Use user given icon first
        legendSymbolType = itemIcon || legendSymbolType;
        // Draw line
        if (legendSymbolType === 'line' || itemIcon === 'line') {
            itemGroup.add(
                createHorizontalLine(itemWidth, itemHeight, style.lineStyle)
            )
        }
        // Put symbol in the center
        if (itemIcon !== 'line') {
            itemGroup.add(
                createItem(dataSymbolType, symbolSize, symbolKeepAspect, itemWidth, itemHeight, style.itemStyle)
            );
        }

        const textX = itemAlign === 'left' ? itemWidth + 5 : -5;
        const textAlign = itemAlign as ZRTextAlign;

        const formatter = legendModel.get('formatter');
        let content = name;
        if (typeof formatter === 'string' && formatter) {
            content = formatter.replace('{name}', name != null ? name : '');
        }
        else if (typeof formatter === 'function') {
            content = formatter(name);
        }

        const inactiveColor = itemModel.get('inactiveColor');
        itemGroup.add(new graphic.Text({
            style: createTextStyle(textStyleModel, {
                text: content,
                x: textX,
                y: itemHeight / 2,
                fill: isSelected ? textStyleModel.getTextColor() : inactiveColor,
                align: textAlign,
                verticalAlign: 'middle'
            })
        }));

        // Add a invisible rect to increase the area of mouse hover
        const hitRect = new graphic.Rect({
            shape: itemGroup.getBoundingRect(),
            invisible: true
        });

        const tooltipModel = itemModel.getModel('tooltip') as Model<CommonTooltipOption<LegendTooltipFormatterParams>>;
        if (tooltipModel.get('show')) {
            graphic.setTooltipConfig({
                el: hitRect,
                componentModel: legendModel,
                itemName: name,
                itemTooltipOption: tooltipModel.option
            });
        }
        itemGroup.add(hitRect);

        itemGroup.eachChild(function (child) {
            child.silent = true;
        });

        hitRect.silent = !selectMode;

        this.getContentGroup().add(itemGroup);

        enableHoverEmphasis(itemGroup);

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
        const contentGroup = this.getContentGroup();
        const selectorGroup = this.getSelectorGroup();

        // Place items in contentGroup.
        layoutUtil.box(
            legendModel.get('orient'),
            contentGroup,
            legendModel.get('itemGap'),
            maxSize.width,
            maxSize.height
        );

        const contentRect = contentGroup.getBoundingRect();
        const contentPos = [-contentRect.x, -contentRect.y];

        selectorGroup.markRedraw();
        contentGroup.markRedraw();

        if (selector) {
            // Place buttons in selectorGroup
            layoutUtil.box(
                // Buttons in selectorGroup always layout horizontally
                'horizontal',
                selectorGroup,
                legendModel.get('selectorItemGap', true)
            );

            const selectorRect = selectorGroup.getBoundingRect();
            const selectorPos = [-selectorRect.x, -selectorRect.y];
            const selectorButtonGap = legendModel.get('selectorButtonGap', true);

            const orientIdx = legendModel.getOrient().index;
            const wh: 'width' | 'height' = orientIdx === 0 ? 'width' : 'height';
            const hw: 'width' | 'height' = orientIdx === 0 ? 'height' : 'width';
            const yx: 'x' | 'y' = orientIdx === 0 ? 'y' : 'x';

            if (selectorPosition === 'end') {
                selectorPos[orientIdx] += contentRect[wh] + selectorButtonGap;
            }
            else {
                contentPos[orientIdx] += selectorRect[wh] + selectorButtonGap;
            }

            //Always align selector to content as 'middle'
            selectorPos[1 - orientIdx] += contentRect[hw] / 2 - selectorRect[hw] / 2;
            selectorGroup.x = selectorPos[0];
            selectorGroup.y = selectorPos[1];
            contentGroup.x = contentPos[0];
            contentGroup.y = contentPos[1];

            const mainRect = {x: 0, y: 0} as ZRRectLike;
            mainRect[wh] = contentRect[wh] + selectorButtonGap + selectorRect[wh];
            mainRect[hw] = Math.max(contentRect[hw], selectorRect[hw]);
            mainRect[yx] = Math.min(0, selectorRect[yx] + selectorPos[1 - orientIdx]);
            return mainRect;
        }
        else {
            contentGroup.x = contentPos[0];
            contentGroup.y = contentPos[1];
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

function getLegendStyle(
    symbolType: string,
    legendModel: LegendModel['_data'][number],
    legendLineStyle: Model<LegendLineStyleOption>,
    lineVisualStyle: LineStyleProps,
    itemVisualStyle: PathStyleProps,
    drawType: 'fill' | 'stroke',
    isSelected: boolean
) {
    /**
     * Use series style if is inherit;
     * elsewise, use legend style
     */

    // itemStyle
    const legendItemModel = legendModel.getModel('itemStyle') as Model<LegendItemStyleOption>;
    const itemProperties = [
        ['fill', 'color'],
        ['opacity'],
        ['decal'],
        ['shadowBlur'],
        ['shadowColor'],
        ['shadowOffsetX'],
        ['shadowOffsetY'],
        ['stroke', 'borderColor'],
        ['lineWidth', 'borderWidth'],
        ['borderCap'],
        ['borderJoin'],
        ['borderDashOffset'],
        ['borderMiterLimit']
    ];
    const itemStyle: PathStyleProps = {};
    for (let i = 0; i < itemProperties.length; ++i) {
        const propName = itemProperties[i][
            itemProperties[i].length - 1
        ] as keyof LegendItemStyleOption;
        const visualName = itemProperties[i][0] as keyof PathStyleProps;
        const value = legendItemModel.getShallow(propName) as LegendItemStyleOption[keyof LegendItemStyleOption];
        if (value === 'inherit') {
            if (drawType === 'stroke' && visualName === 'fill') {
                /**
                 * Series with visualDrawType as 'stroke' should have
                 * series stroke as legend fill
                 */
                itemStyle.fill = itemVisualStyle.stroke;
            }
            else {
                (itemStyle as any)[visualName] = itemVisualStyle[visualName];
            }
        }
        else if (value === 'auto' && visualName === 'lineWidth') {
            // If lineStyle.width is 'auto', it is set to be 2 if series has border
            itemStyle.lineWidth = (itemVisualStyle.lineWidth > 0) ? 2 : 0;
        }
        else {
            (itemStyle as any)[visualName] = value;
        }
    }

    // lineStyle
    const legendLineModel = legendModel.getModel('lineStyle') as Model<LegendLineStyleOption>;
    const lineProperties = [
        ['lineWidth', 'width'],
        ['stroke', 'color'],
        ['inactiveColor'],
        ['inactiveWidth'],
        ['opacity'],
        ['type'],
        ['cap'],
        ['join'],
        ['dashOffset'],
        ['miterLimit'],
        ['shadowB'],
        ['shadowBlur'],
        ['shadowColor'],
        ['shadowOffsetX'],
        ['shadowOffsetY']
    ];
    const lineStyle: LineStyleProps = {};
    for (let i = 0; i < lineProperties.length; ++i) {
        const propName = lineProperties[i][1] as keyof LegendLineStyleOption;
        const visualName = lineProperties[i][0] as keyof LineStyleProps;
        const value = legendLineModel.getShallow(propName) as LegendLineStyleOption[keyof LegendLineStyleOption];
        if (value === 'inherit') {
            (lineStyle as any)[visualName] = lineVisualStyle[visualName];
        }
        else if (value === 'auto' && visualName === 'lineWidth') {
            // If lineStyle.width is 'auto', it is set to be 2 if series has border
            lineStyle.lineWidth = lineVisualStyle.lineWidth > 0 ? 2 : 0;
        }
        else {
            (lineStyle as any)[visualName] = value;
        }
    }

    // Fix auto color to real color
    (itemStyle.fill === 'auto') && (itemStyle.fill = itemVisualStyle.fill);
    (itemStyle.stroke === 'auto') && (itemStyle.stroke = itemVisualStyle.fill);
    (lineStyle.stroke === 'auto') && (lineStyle.stroke = itemVisualStyle.fill);

    if (!isSelected) {
        const borderWidth = legendModel.get('inactiveBorderWidth');
        /**
         * Since stroke is set to be inactiveBorderColor, it may occur that
         * there is no border in series but border in legend, so we need to
         * use border only when series has border if is set to be auto
         */
        const visualHasBorder = itemStyle[symbolType.indexOf('empty') > -1 ? 'fill' : 'stroke'];
        itemStyle.lineWidth = borderWidth === 'auto'
            ? (itemVisualStyle.lineWidth > 0 && visualHasBorder ? 2 : 0)
            : itemStyle.lineWidth;
        itemStyle.fill = legendModel.get('inactiveColor');
        itemStyle.stroke = legendModel.get('inactiveBorderColor');
        lineStyle.stroke = legendLineStyle.get('inactiveColor');
        lineStyle.lineWidth = legendLineStyle.get('inactiveWidth');
    }

    return { itemStyle, lineStyle };
}

function createHorizontalLine(
    itemWidth: number,
    itemHeight: number,
    style: LineStyleProps
) {
    const symbol = createSymbol(
        'line',
        0,
        0,
        itemWidth,
        itemHeight,
        style.stroke,
        false
    );
    symbol.setStyle(style);
    return symbol;
}

function createItem(
    symbolType: string,
    symbolSize: number | number[],
    symbolKeepAspect: boolean,
    itemWidth: number,
    itemHeight: number,
    style: ItemStyleProps
) {
    if (symbolType === 'none') {
        symbolType = 'circle';
    }
    const size = symbolSize == null
        ? [itemHeight, itemHeight]
        : (typeof symbolSize === 'object'
            ? [Math.min(itemWidth, symbolSize[0]), Math.min(itemHeight, symbolSize[1])]
            : [Math.min(itemHeight, symbolSize as number), Math.min(itemHeight, symbolSize as number)]
        );
    const symbol = createSymbol(
        symbolType,
        (itemWidth - size[0]) / 2,
        (itemHeight - size[1]) / 2,
        size[0],
        size[1],
        style.fill,
        // symbolKeepAspect default true for legend
        symbolKeepAspect == null ? true : symbolKeepAspect
    );
    symbol.setStyle(style);
    if (symbolType.indexOf('empty') > -1) {
        symbol.style.stroke = symbol.style.fill;
        symbol.style.fill = '#fff';
    }
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
    // TODO higlight immediately may cause animation loss.
    dispatchHighlightAction(seriesName, dataName, api, excludeSeriesId);
}

function isUseHoverLayer(api: ExtensionAPI) {
    const list = api.getZr().storage.getDisplayList();
    let emphasisState: DisplayableState;
    let i = 0;
    const len = list.length;
    while (i < len && !(emphasisState = list[i].states.emphasis)) {
        i++;
    }
    return emphasisState && emphasisState.hoverLayer;
}

function dispatchHighlightAction(
    seriesName: string,
    dataName: string,
    api: ExtensionAPI,
    excludeSeriesId: string[]
) {
    // If element hover will move to a hoverLayer.
    if (!isUseHoverLayer(api)) {
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
    if (!isUseHoverLayer(api)) {
        api.dispatchAction({
            type: 'downplay',
            seriesName: seriesName,
            name: dataName,
            excludeSeriesId: excludeSeriesId
        });
    }
}

export default LegendView;