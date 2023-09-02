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
import { DisplayableState } from 'zrender/src/graphic/Displayable';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { parse, stringify } from 'zrender/src/tool/color';
import * as graphic from '../../util/graphic';
import { enableHoverEmphasis } from '../../util/states';
import {setLabelStyle, createTextStyle} from '../../label/labelStyle';
import {makeBackground} from '../helper/listComponent';
import * as layoutUtil from '../../util/layout';
import ComponentView from '../../view/Component';
import LegendModel, {
    LegendItemStyleOption,
    LegendLineStyleOption,
    LegendOption,
    LegendSelectorButtonOption,
    LegendIconParams,
    LegendTooltipFormatterParams
} from './LegendModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import {
    ZRTextAlign,
    ZRRectLike,
    CommonTooltipOption,
    ColorString,
    SeriesOption,
    SymbolOptionMixin
} from '../../util/types';
import Model from '../../model/Model';
import {LineStyleProps} from '../../model/mixin/lineStyle';
import {createSymbol, ECSymbol} from '../../util/symbol';
import SeriesModel from '../../model/Series';
import { createOrUpdatePatternFromDecal } from '../../util/decal';

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
     * does not make sense and may cause unexpected animation if adopted.
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
                // Have been drawn
                return;
            }

            // Legend to control series.
            if (seriesModel) {
                const data = seriesModel.getData();
                const lineVisualStyle = data.getVisual('legendLineStyle') || {};
                const legendIcon = data.getVisual('legendIcon');

                /**
                 * `data.getVisual('style')` may be the color from the register
                 * in series. For example, for line series,
                 */
                const style = data.getVisual('style');

                const itemGroup = this._createItem(
                    seriesModel, name, dataIndex,
                    legendItemModel, legendModel, itemAlign,
                    lineVisualStyle, style, legendIcon, selectMode, api
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

                        let style = provider.getItemVisual(idx, 'style') as PathStyleProps;
                        const legendIcon = provider.getItemVisual(idx, 'legendIcon');

                        const colorArr = parse(style.fill as ColorString);
                        // Color may be set to transparent in visualMap when data is out of range.
                        // Do not show nothing.
                        if (colorArr && colorArr[3] === 0) {
                            colorArr[3] = 0.2;
                            // TODO color is set to 0, 0, 0, 0. Should show correct RGBA
                            style = zrUtil.extend(zrUtil.extend({}, style), { fill: stringify(colorArr, 'rgba') });
                        }

                        const itemGroup = this._createItem(
                            seriesModel, name, dataIndex,
                            legendItemModel, legendModel, itemAlign,
                            {}, style, legendIcon, selectMode, api
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
        seriesModel: SeriesModel<SeriesOption & SymbolOptionMixin>,
        name: string,
        dataIndex: number,
        legendItemModel: LegendModel['_data'][number],
        legendModel: LegendModel,
        itemAlign: LegendOption['align'],
        lineVisualStyle: LineStyleProps,
        itemVisualStyle: PathStyleProps,
        legendIcon: string,
        selectMode: LegendOption['selectedMode'],
        api: ExtensionAPI
    ) {
        const drawType = seriesModel.visualDrawType;
        const itemWidth = legendModel.get('itemWidth');
        const itemHeight = legendModel.get('itemHeight');
        const isSelected = legendModel.isSelected(name);

        const iconRotate = legendItemModel.get('symbolRotate');
        const symbolKeepAspect = legendItemModel.get('symbolKeepAspect');

        const legendIconType = legendItemModel.get('icon');
        legendIcon = legendIconType || legendIcon || 'roundRect';

        const style = getLegendStyle(
            legendIcon,
            legendItemModel,
            lineVisualStyle,
            itemVisualStyle,
            drawType,
            isSelected,
            api
        );

        const itemGroup = new Group();

        const textStyleModel = legendItemModel.getModel('textStyle');

        if (zrUtil.isFunction(seriesModel.getLegendIcon)
            && (!legendIconType || legendIconType === 'inherit')
        ) {
            // Series has specific way to define legend icon
            itemGroup.add(seriesModel.getLegendIcon({
                itemWidth,
                itemHeight,
                icon: legendIcon,
                iconRotate: iconRotate,
                itemStyle: style.itemStyle,
                lineStyle: style.lineStyle,
                symbolKeepAspect
            }));
        }
        else {
            // Use default legend icon policy for most series
            const rotate = legendIconType === 'inherit' && seriesModel.getData().getVisual('symbol')
                ? (iconRotate === 'inherit'
                    ? seriesModel.getData().getVisual('symbolRotate')
                    : iconRotate
                )
                : 0; // No rotation for no icon
            itemGroup.add(getDefaultLegendIcon({
                itemWidth,
                itemHeight,
                icon: legendIcon,
                iconRotate: rotate,
                itemStyle: style.itemStyle,
                lineStyle: style.lineStyle,
                symbolKeepAspect
            }));
        }

        const textX = itemAlign === 'left' ? itemWidth + 5 : -5;
        const textAlign = itemAlign as ZRTextAlign;

        const formatter = legendModel.get('formatter');
        let content = name;
        if (zrUtil.isString(formatter) && formatter) {
            content = formatter.replace('{name}', name != null ? name : '');
        }
        else if (zrUtil.isFunction(formatter)) {
            content = formatter(name);
        }

        const textColor = isSelected
            ? textStyleModel.getTextColor() : legendItemModel.get('inactiveColor');

        itemGroup.add(new graphic.Text({
            style: createTextStyle(textStyleModel, {
                text: content,
                x: textX,
                y: itemHeight / 2,
                fill: textColor,
                align: textAlign,
                verticalAlign: 'middle'
            }, {inheritColor: textColor})
        }));

        // Add a invisible rect to increase the area of mouse hover
        const hitRect = new graphic.Rect({
            shape: itemGroup.getBoundingRect(),
            invisible: true
        });

        const tooltipModel =
            legendItemModel.getModel('tooltip') as Model<CommonTooltipOption<LegendTooltipFormatterParams>>;
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

            // Always align selector to content as 'middle'
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
    iconType: string,
    legendItemModel: LegendModel['_data'][number],
    lineVisualStyle: PathStyleProps,
    itemVisualStyle: PathStyleProps,
    drawType: 'fill' | 'stroke',
    isSelected: boolean,
    api: ExtensionAPI
) {
    /**
     * Use series style if is inherit;
     * elsewise, use legend style
     */
    function handleCommonProps(style: PathStyleProps, visualStyle: PathStyleProps) {
        // If lineStyle.width is 'auto', it is set to be 2 if series has border
        if ((style.lineWidth as any) === 'auto') {
            style.lineWidth = (visualStyle.lineWidth > 0) ? 2 : 0;
        }

        each(style, (propVal, propName) => {
            style[propName] === 'inherit' && ((style as any)[propName] = visualStyle[propName]);
        });
    }

    // itemStyle
    const itemStyleModel = legendItemModel.getModel('itemStyle') as Model<LegendItemStyleOption>;
    const itemStyle = itemStyleModel.getItemStyle();
    const iconBrushType = iconType.lastIndexOf('empty', 0) === 0 ? 'fill' : 'stroke';
    const decalStyle = itemStyleModel.getShallow('decal');
    itemStyle.decal = (!decalStyle || decalStyle === 'inherit')
                    ? itemVisualStyle.decal
                    : createOrUpdatePatternFromDecal(decalStyle, api);

    if (itemStyle.fill === 'inherit') {
        /**
         * Series with visualDrawType as 'stroke' should have
         * series stroke as legend fill
         */
        itemStyle.fill = itemVisualStyle[drawType];
    }
    if (itemStyle.stroke === 'inherit') {
        /**
         * icon type with "emptyXXX" should use fill color
         * in visual style
         */
        itemStyle.stroke = itemVisualStyle[iconBrushType];
    }
    if ((itemStyle.opacity as any) === 'inherit') {
        /**
         * Use lineStyle.opacity if drawType is stroke
         */
        itemStyle.opacity = (drawType === 'fill' ? itemVisualStyle : lineVisualStyle).opacity;
    }
    handleCommonProps(itemStyle, itemVisualStyle);

    // lineStyle
    const legendLineModel = legendItemModel.getModel('lineStyle') as Model<LegendLineStyleOption>;
    const lineStyle: LineStyleProps = legendLineModel.getLineStyle();
    handleCommonProps(lineStyle, lineVisualStyle);

    // Fix auto color to real color
    (itemStyle.fill === 'auto') && (itemStyle.fill = itemVisualStyle.fill);
    (itemStyle.stroke === 'auto') && (itemStyle.stroke = itemVisualStyle.fill);
    (lineStyle.stroke === 'auto') && (lineStyle.stroke = itemVisualStyle.fill);

    if (!isSelected) {
        const borderWidth = legendItemModel.get('inactiveBorderWidth');
        /**
         * Since stroke is set to be inactiveBorderColor, it may occur that
         * there is no border in series but border in legend, so we need to
         * use border only when series has border if is set to be auto
         */
        const visualHasBorder = itemStyle[iconBrushType];
        itemStyle.lineWidth = borderWidth === 'auto'
            ? (itemVisualStyle.lineWidth > 0 && visualHasBorder ? 2 : 0)
            : itemStyle.lineWidth;
        itemStyle.fill = legendItemModel.get('inactiveColor');
        itemStyle.stroke = legendItemModel.get('inactiveBorderColor');
        lineStyle.stroke = legendLineModel.get('inactiveColor');
        lineStyle.lineWidth = legendLineModel.get('inactiveWidth');
    }
    return { itemStyle, lineStyle };
}

function getDefaultLegendIcon(opt: LegendIconParams): ECSymbol {
    const symboType = opt.icon || 'roundRect';
    const icon = createSymbol(
        symboType,
        0,
        0,
        opt.itemWidth,
        opt.itemHeight,
        opt.itemStyle.fill,
        opt.symbolKeepAspect
    );

    icon.setStyle(opt.itemStyle);

    icon.rotation = (opt.iconRotate as number || 0) * Math.PI / 180;
    icon.setOrigin([opt.itemWidth / 2, opt.itemHeight / 2]);

    if (symboType.indexOf('empty') > -1) {
        icon.style.stroke = icon.style.fill;
        icon.style.fill = '#fff';
        icon.style.lineWidth = 2;
    }

    return icon;
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
    // TODO highlight immediately may cause animation loss.
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
