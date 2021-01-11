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
import env from 'zrender/src/core/env';
import TooltipHTMLContent from './TooltipHTMLContent';
import TooltipRichContent from './TooltipRichContent';
import * as formatUtil from '../../util/format';
import * as numberUtil from '../../util/number';
import * as graphic from '../../util/graphic';
import findPointFromSeries from '../axisPointer/findPointFromSeries';
import * as layoutUtil from '../../util/layout';
import Model from '../../model/Model';
import * as globalListener from '../axisPointer/globalListener';
import * as axisHelper from '../../coord/axisHelper';
import * as axisPointerViewHelper from '../axisPointer/viewHelper';
import { getTooltipRenderMode } from '../../util/model';
import ComponentView from '../../view/Component';
import { format as timeFormat } from '../../util/time';
import {
    HorizontalAlign,
    VerticalAlign,
    ZRRectLike,
    BoxLayoutOptionMixin,
    CallbackDataParams,
    TooltipRenderMode,
    ECElement,
    CommonTooltipOption,
    ZRColor
} from '../../util/types';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import TooltipModel, {TooltipOption} from './TooltipModel';
import Element from 'zrender/src/Element';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
// import { isDimensionStacked } from '../../data/helper/dataStackHelper';
import { getECData } from '../../util/innerStore';
import { shouldTooltipConfine } from './helper';
import { DataByCoordSys, DataByAxis } from '../axisPointer/axisTrigger';
import { normalizeTooltipFormatResult } from '../../model/mixin/dataFormat';
import { createTooltipMarkup, buildTooltipMarkup, TooltipMarkupStyleCreator } from './tooltipMarkup';
import { findEventDispatcher } from '../../util/event';

const bind = zrUtil.bind;
const each = zrUtil.each;
const parsePercent = numberUtil.parsePercent;

const proxyRect = new graphic.Rect({
    shape: {x: -1, y: -1, width: 2, height: 2}
});

interface DataIndex {
    seriesIndex: number
    dataIndex: number

    dataIndexInside: number
}

interface ShowTipPayload {
    type?: 'showTip'
    from?: string

    // Type 1
    tooltip?: ECElement['tooltip']

    // Type 2
    dataByCoordSys?: DataByCoordSys[]
    tooltipOption?: CommonTooltipOption<TooltipCallbackDataParams | TooltipCallbackDataParams[]>

    // Type 3
    seriesIndex?: number
    dataIndex?: number


    x?: number
    y?: number
    position?: TooltipOption['position']

    dispatchAction?: ExtensionAPI['dispatchAction']
}

interface HideTipPayload {
    type?: 'hideTip'
    from?: string

    dispatchAction?: ExtensionAPI['dispatchAction']
}

interface TryShowParams {
    target?: ECElement,

    offsetX?: number
    offsetY?: number

    /**
     * Used for axis trigger.
     */
    dataByCoordSys?: DataByCoordSys[]

    tooltipOption?: CommonTooltipOption<TooltipCallbackDataParams | TooltipCallbackDataParams[]>

    position?: TooltipOption['position']
}

type TooltipCallbackDataParams = CallbackDataParams & {
    axisDim?: string
    axisIndex?: number
    axisType?: string
    axisId?: string
    // TODO: TYPE Value type
    axisValue?: string | number
    axisValueLabel?: string
    marker?: formatUtil.TooltipMarker
};

class TooltipView extends ComponentView {
    static type = 'tooltip' as const;
    type = TooltipView.type;

    private _renderMode: TooltipRenderMode;

    private _tooltipModel: TooltipModel;

    private _ecModel: GlobalModel;

    private _api: ExtensionAPI;

    private _alwaysShowContent: boolean;

    private _tooltipContent: TooltipHTMLContent | TooltipRichContent;

    private _refreshUpdateTimeout: number;

    private _lastX: number;
    private _lastY: number;

    private _ticket: string;

    private _showTimout: number;

    private _lastDataByCoordSys: DataByCoordSys[];

    init(ecModel: GlobalModel, api: ExtensionAPI) {
        if (env.node) {
            return;
        }

        const tooltipModel = ecModel.getComponent('tooltip') as TooltipModel;
        const renderMode = tooltipModel.get('renderMode');
        this._renderMode = getTooltipRenderMode(renderMode);

        this._tooltipContent = this._renderMode === 'richText'
            ? new TooltipRichContent(api)
            : new TooltipHTMLContent(api.getDom(), api, {
                appendToBody: tooltipModel.get('appendToBody', true)
            });
    }

    render(
        tooltipModel: TooltipModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        if (env.node) {
            return;
        }

        // Reset
        this.group.removeAll();

        this._tooltipModel = tooltipModel;

        this._ecModel = ecModel;

        this._api = api;

        /**
         * @private
         * @type {boolean}
         */
        this._alwaysShowContent = tooltipModel.get('alwaysShowContent');

        const tooltipContent = this._tooltipContent;
        tooltipContent.update(tooltipModel);
        tooltipContent.setEnterable(tooltipModel.get('enterable'));

        this._initGlobalListener();

        this._keepShow();
    }

    private _initGlobalListener() {
        const tooltipModel = this._tooltipModel;
        const triggerOn = tooltipModel.get('triggerOn');

        globalListener.register(
            'itemTooltip',
            this._api,
            bind(function (currTrigger, e, dispatchAction) {
                // If 'none', it is not controlled by mouse totally.
                if (triggerOn !== 'none') {
                    if (triggerOn.indexOf(currTrigger) >= 0) {
                        this._tryShow(e, dispatchAction);
                    }
                    else if (currTrigger === 'leave') {
                        this._hide(dispatchAction);
                    }
                }
            }, this)
        );
    }

    private _keepShow() {
        const tooltipModel = this._tooltipModel;
        const ecModel = this._ecModel;
        const api = this._api;

        // Try to keep the tooltip show when refreshing
        if (this._lastX != null
            && this._lastY != null
            // When user is willing to control tooltip totally using API,
            // self.manuallyShowTip({x, y}) might cause tooltip hide,
            // which is not expected.
            && tooltipModel.get('triggerOn') !== 'none'
        ) {
            const self = this;
            clearTimeout(this._refreshUpdateTimeout);
            this._refreshUpdateTimeout = setTimeout(function () {
                // Show tip next tick after other charts are rendered
                // In case highlight action has wrong result
                // FIXME
                !api.isDisposed() && self.manuallyShowTip(tooltipModel, ecModel, api, {
                    x: self._lastX,
                    y: self._lastY,
                    dataByCoordSys: self._lastDataByCoordSys
                });
            });
        }
    }

    /**
     * Show tip manually by
     * dispatchAction({
     *     type: 'showTip',
     *     x: 10,
     *     y: 10
     * });
     * Or
     * dispatchAction({
     *      type: 'showTip',
     *      seriesIndex: 0,
     *      dataIndex or dataIndexInside or name
     * });
     *
     *  TODO Batch
     */
    manuallyShowTip(
        tooltipModel: TooltipModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: ShowTipPayload
    ) {
        if (payload.from === this.uid || env.node) {
            return;
        }

        const dispatchAction = makeDispatchAction(payload, api);

        // Reset ticket
        this._ticket = '';

        // When triggered from axisPointer.
        const dataByCoordSys = payload.dataByCoordSys;

        if (payload.tooltip && payload.x != null && payload.y != null) {
            const el = proxyRect as unknown as ECElement;
            el.x = payload.x;
            el.y = payload.y;
            el.update();
            el.tooltip = payload.tooltip;
            // Manually show tooltip while view is not using zrender elements.
            this._tryShow({
                offsetX: payload.x,
                offsetY: payload.y,
                target: el
            }, dispatchAction);
        }
        else if (dataByCoordSys) {
            this._tryShow({
                offsetX: payload.x,
                offsetY: payload.y,
                position: payload.position,
                dataByCoordSys: dataByCoordSys,
                tooltipOption: payload.tooltipOption
            }, dispatchAction);
        }
        else if (payload.seriesIndex != null) {

            if (this._manuallyAxisShowTip(tooltipModel, ecModel, api, payload)) {
                return;
            }

            const pointInfo = findPointFromSeries(payload, ecModel);
            const cx = pointInfo.point[0];
            const cy = pointInfo.point[1];
            if (cx != null && cy != null) {
                this._tryShow({
                    offsetX: cx,
                    offsetY: cy,
                    position: payload.position,
                    target: pointInfo.el
                }, dispatchAction);
            }
        }
        else if (payload.x != null && payload.y != null) {
            // FIXME
            // should wrap dispatchAction like `axisPointer/globalListener` ?
            api.dispatchAction({
                type: 'updateAxisPointer',
                x: payload.x,
                y: payload.y
            });

            this._tryShow({
                offsetX: payload.x,
                offsetY: payload.y,
                position: payload.position,
                target: api.getZr().findHover(payload.x, payload.y).target
            }, dispatchAction);
        }
    }

    manuallyHideTip(
        tooltipModel: TooltipModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: HideTipPayload
    ) {
        const tooltipContent = this._tooltipContent;

        if (!this._alwaysShowContent && this._tooltipModel) {
            tooltipContent.hideLater(this._tooltipModel.get('hideDelay'));
        }

        this._lastX = this._lastY = this._lastDataByCoordSys = null;

        if (payload.from !== this.uid) {
            this._hide(makeDispatchAction(payload, api));
        }
    }

    // Be compatible with previous design, that is, when tooltip.type is 'axis' and
    // dispatchAction 'showTip' with seriesIndex and dataIndex will trigger axis pointer
    // and tooltip.
    private _manuallyAxisShowTip(
        tooltipModel: TooltipModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: ShowTipPayload
    ) {
        const seriesIndex = payload.seriesIndex;
        const dataIndex = payload.dataIndex;
        // @ts-ignore
        const coordSysAxesInfo = ecModel.getComponent('axisPointer').coordSysAxesInfo;

        if (seriesIndex == null || dataIndex == null || coordSysAxesInfo == null) {
            return;
        }

        const seriesModel = ecModel.getSeriesByIndex(seriesIndex);
        if (!seriesModel) {
            return;
        }

        const data = seriesModel.getData();
        const tooltipCascadedModel = buildTooltipModel([
            data.getItemModel<TooltipableOption>(dataIndex),
            seriesModel,
            (seriesModel.coordinateSystem || {}).model,
            tooltipModel
        ]);

        if (tooltipCascadedModel.get('trigger') !== 'axis') {
            return;
        }

        api.dispatchAction({
            type: 'updateAxisPointer',
            seriesIndex: seriesIndex,
            dataIndex: dataIndex,
            position: payload.position
        });

        return true;
    }

    private _tryShow(
        e: TryShowParams,
        dispatchAction: ExtensionAPI['dispatchAction']
    ) {
        const el = e.target;
        const tooltipModel = this._tooltipModel;

        if (!tooltipModel) {
            return;
        }

        // Save mouse x, mouse y. So we can try to keep showing the tip if chart is refreshed
        this._lastX = e.offsetX;
        this._lastY = e.offsetY;

        const dataByCoordSys = e.dataByCoordSys;
        if (dataByCoordSys && dataByCoordSys.length) {
            this._showAxisTooltip(dataByCoordSys, e);
        }
        // Always show item tooltip if mouse is on the element with dataIndex
        else if (el && findEventDispatcher(el, (target) => getECData(target).dataIndex != null, true)) {
            this._lastDataByCoordSys = null;
            this._showSeriesItemTooltip(e, el, dispatchAction);
        }
        // Tooltip provided directly. Like legend.
        else if (el && el.tooltip) {
            this._lastDataByCoordSys = null;
            this._showComponentItemTooltip(e, el, dispatchAction);
        }
        else {
            this._lastDataByCoordSys = null;
            this._hide(dispatchAction);
        }
    }

    private _showOrMove(
        tooltipModel: Model<TooltipOption>,
        cb: () => void
    ) {
        // showDelay is used in this case: tooltip.enterable is set
        // as true. User intent to move mouse into tooltip and click
        // something. `showDelay` makes it easier to enter the content
        // but tooltip do not move immediately.
        const delay = tooltipModel.get('showDelay');
        cb = zrUtil.bind(cb, this);
        clearTimeout(this._showTimout);
        delay > 0
            ? (this._showTimout = setTimeout(cb, delay) as any)
            : cb();
    }

    private _showAxisTooltip(
        dataByCoordSys: DataByCoordSys[],
        e: TryShowParams
    ) {
        const ecModel = this._ecModel;
        const globalTooltipModel = this._tooltipModel;
        const point = [e.offsetX, e.offsetY];
        const singleTooltipModel = buildTooltipModel([
            e.tooltipOption,
            globalTooltipModel
        ]);
        const renderMode = this._renderMode;
        const cbParamsList: TooltipCallbackDataParams[] = [];
        const articleMarkup = createTooltipMarkup('section', {
            blocks: [],
            noHeader: true
        });
        // Only for legacy: `Serise['formatTooltip']` returns a string.
        const markupTextArrLegacy: string[] = [];
        const markupStyleCreator = new TooltipMarkupStyleCreator();

        each(dataByCoordSys, function (itemCoordSys) {
            each(itemCoordSys.dataByAxis, function (axisItem) {
                const axisModel = ecModel.getComponent(axisItem.axisDim + 'Axis', axisItem.axisIndex) as AxisBaseModel;
                const axisValue = axisItem.value;
                if (!axisModel || axisValue == null) {
                    return;
                }
                const axisValueLabel = axisPointerViewHelper.getValueLabel(
                    axisValue, axisModel.axis, ecModel,
                    axisItem.seriesDataIndices,
                    axisItem.valueLabelOpt
                );
                const axisSectionMarkup = createTooltipMarkup('section', {
                    header: axisValueLabel,
                    noHeader: !zrUtil.trim(axisValueLabel),
                    sortBlocks: true,
                    blocks: []
                });
                articleMarkup.blocks.push(axisSectionMarkup);

                zrUtil.each(axisItem.seriesDataIndices, function (idxItem) {
                    const series = ecModel.getSeriesByIndex(idxItem.seriesIndex);
                    const dataIndex = idxItem.dataIndexInside;
                    const cbParams = series.getDataParams(dataIndex) as TooltipCallbackDataParams;
                    cbParams.axisDim = axisItem.axisDim;
                    cbParams.axisIndex = axisItem.axisIndex;
                    cbParams.axisType = axisItem.axisType;
                    cbParams.axisId = axisItem.axisId;
                    cbParams.axisValue = axisHelper.getAxisRawValue(
                        axisModel.axis, { value: axisValue as number }
                    );
                    cbParams.axisValueLabel = axisValueLabel;
                    // Pre-create marker style for makers. Users can assemble richText
                    // text in `formatter` callback and use those markers style.
                    cbParams.marker = markupStyleCreator.makeTooltipMarker(
                        'item', formatUtil.convertToColorString(cbParams.color), renderMode
                    );

                    const seriesTooltipResult = normalizeTooltipFormatResult(
                        series.formatTooltip(dataIndex, true, null)
                    );
                    if (seriesTooltipResult.markupFragment) {
                        axisSectionMarkup.blocks.push(seriesTooltipResult.markupFragment);
                    }
                    if (seriesTooltipResult.markupText) {
                        markupTextArrLegacy.push(seriesTooltipResult.markupText);
                    }
                    cbParamsList.push(cbParams);
                });
            });
        });

        // In most cases, the second axis is displays upper on the first one.
        // So we reverse it to look better.
        articleMarkup.blocks.reverse();
        markupTextArrLegacy.reverse();

        const positionExpr = e.position;
        const orderMode = singleTooltipModel.get('order');

        const builtMarkupText = buildTooltipMarkup(
            articleMarkup, markupStyleCreator, renderMode, orderMode, ecModel.get('useUTC'),
            singleTooltipModel.get('textStyle')
        );
        builtMarkupText && markupTextArrLegacy.unshift(builtMarkupText);
        const blockBreak = renderMode === 'richText' ? '\n\n' : '<br/>';
        const allMarkupText = markupTextArrLegacy.join(blockBreak);

        this._showOrMove(singleTooltipModel, function (this: TooltipView) {
            if (this._updateContentNotChangedOnAxis(dataByCoordSys)) {
                this._updatePosition(
                    singleTooltipModel,
                    positionExpr,
                    point[0], point[1],
                    this._tooltipContent,
                    cbParamsList
                );
            }
            else {
                this._showTooltipContent(
                    singleTooltipModel, allMarkupText, cbParamsList, Math.random() + '',
                    point[0], point[1], positionExpr, null, markupStyleCreator
                );
            }
        });

        // Do not trigger events here, because this branch only be entered
        // from dispatchAction.
    }

    private _showSeriesItemTooltip(
        e: TryShowParams,
        el: ECElement,
        dispatchAction: ExtensionAPI['dispatchAction']
    ) {
        const dispatcher = findEventDispatcher(el, (target) => getECData(target).dataIndex != null, true);
        const ecModel = this._ecModel;
        const ecData = getECData(dispatcher);
        // Use dataModel in element if possible
        // Used when mouseover on a element like markPoint or edge
        // In which case, the data is not main data in series.
        const seriesIndex = ecData.seriesIndex;
        const seriesModel = ecModel.getSeriesByIndex(seriesIndex);

        // For example, graph link.
        const dataModel = ecData.dataModel || seriesModel;
        const dataIndex = ecData.dataIndex;
        const dataType = ecData.dataType;
        const data = dataModel.getData(dataType);
        const renderMode = this._renderMode;

        const tooltipModel = buildTooltipModel([
            data.getItemModel<TooltipableOption>(dataIndex),
            dataModel,
            seriesModel && (seriesModel.coordinateSystem || {}).model,
            this._tooltipModel
        ]);

        const tooltipTrigger = tooltipModel.get('trigger');
        if (tooltipTrigger != null && tooltipTrigger !== 'item') {
            return;
        }

        const params = dataModel.getDataParams(dataIndex, dataType);
        const markupStyleCreator = new TooltipMarkupStyleCreator();
        // Pre-create marker style for makers. Users can assemble richText
        // text in `formatter` callback and use those markers style.
        params.marker = markupStyleCreator.makeTooltipMarker(
            'item', formatUtil.convertToColorString(params.color), renderMode
        );

        const seriesTooltipResult = normalizeTooltipFormatResult(
            dataModel.formatTooltip(dataIndex, false, dataType)
        );
        const orderMode = tooltipModel.get('order');
        const markupText = seriesTooltipResult.markupFragment
            ? buildTooltipMarkup(
                seriesTooltipResult.markupFragment,
                markupStyleCreator,
                renderMode,
                orderMode,
                ecModel.get('useUTC'),
                tooltipModel.get('textStyle')
            )
            : seriesTooltipResult.markupText;

        const asyncTicket = 'item_' + dataModel.name + '_' + dataIndex;

        this._showOrMove(tooltipModel, function (this: TooltipView) {
            this._showTooltipContent(
                tooltipModel, markupText, params, asyncTicket,
                e.offsetX, e.offsetY, e.position, e.target,
                markupStyleCreator
            );
        });

        // FIXME
        // duplicated showtip if manuallyShowTip is called from dispatchAction.
        dispatchAction({
            type: 'showTip',
            dataIndexInside: dataIndex,
            dataIndex: data.getRawIndex(dataIndex),
            seriesIndex: seriesIndex,
            from: this.uid
        });
    }

    private _showComponentItemTooltip(
        e: TryShowParams,
        el: ECElement,
        dispatchAction: ExtensionAPI['dispatchAction']
    ) {
        let tooltipOpt = el.tooltip;
        if (zrUtil.isString(tooltipOpt)) {
            const content = tooltipOpt;
            tooltipOpt = {
                content: content,
                // Fixed formatter
                formatter: content
            };
        }
        const subTooltipModel = new Model(tooltipOpt, this._tooltipModel, this._ecModel);
        const defaultHtml = subTooltipModel.get('content');
        const asyncTicket = Math.random() + '';
        // PENDING: this case do not support richText style yet.
        const markupStyleCreator = new TooltipMarkupStyleCreator();

        // Do not check whether `trigger` is 'none' here, because `trigger`
        // only works on coordinate system. In fact, we have not found case
        // that requires setting `trigger` nothing on component yet.

        this._showOrMove(subTooltipModel, function (this: TooltipView) {
            this._showTooltipContent(
                // Use formatterParams from element defined in component
                subTooltipModel, defaultHtml, subTooltipModel.get('formatterParams') as any || {},
                asyncTicket, e.offsetX, e.offsetY, e.position, el, markupStyleCreator
            );
        });

        // If not dispatch showTip, tip may be hide triggered by axis.
        dispatchAction({
            type: 'showTip',
            from: this.uid
        });
    }

    private _showTooltipContent(
        // Use Model<TooltipOption> insteadof TooltipModel because this model may be from series or other options.
        // Instead of top level tooltip.
        tooltipModel: Model<TooltipOption>,
        defaultHtml: string,
        params: TooltipCallbackDataParams | TooltipCallbackDataParams[],
        asyncTicket: string,
        x: number,
        y: number,
        positionExpr: TooltipOption['position'],
        el: ECElement,
        markupStyleCreator: TooltipMarkupStyleCreator
    ) {
        // Reset ticket
        this._ticket = '';

        if (!tooltipModel.get('showContent') || !tooltipModel.get('show')) {
            return;
        }

        const tooltipContent = this._tooltipContent;

        const formatter = tooltipModel.get('formatter');
        positionExpr = positionExpr || tooltipModel.get('position');
        let html: string | HTMLElement[] = defaultHtml;
        const nearPoint = this._getNearestPoint(
            [x, y],
            params,
            tooltipModel.get('trigger'),
            tooltipModel.get('borderColor')
        );

        if (formatter && zrUtil.isString(formatter)) {
            const useUTC = tooltipModel.ecModel.get('useUTC');
            const params0 = zrUtil.isArray(params) ? params[0] : params;
            const isTimeAxis = params0 && params0.axisType && params0.axisType.indexOf('time') >= 0;
            html = formatter;
            if (isTimeAxis) {
                html = timeFormat(params0.axisValue, html, useUTC);
            }
            html = formatUtil.formatTpl(html, params, true);
        }
        else if (zrUtil.isFunction(formatter)) {
            const callback = bind(function (cbTicket: string, html: string | HTMLElement[]) {
                if (cbTicket === this._ticket) {
                    tooltipContent.setContent(html, markupStyleCreator, tooltipModel, nearPoint.color, positionExpr);
                    this._updatePosition(
                        tooltipModel, positionExpr, x, y, tooltipContent, params, el
                    );
                }
            }, this);
            this._ticket = asyncTicket;
            html = formatter(params, asyncTicket, callback);
        }

        tooltipContent.setContent(html, markupStyleCreator, tooltipModel, nearPoint.color, positionExpr);
        tooltipContent.show(tooltipModel, nearPoint.color);
        this._updatePosition(
            tooltipModel, positionExpr, x, y, tooltipContent, params, el
        );

    }

    private _getNearestPoint(
        point: number[],
        tooltipDataParams: TooltipCallbackDataParams | TooltipCallbackDataParams[],
        trigger: TooltipOption['trigger'],
        borderColor: ZRColor
    ): {
        color: ZRColor;
    } {
        if (trigger === 'axis' || zrUtil.isArray(tooltipDataParams)) {
            return {
                color: borderColor || (this._renderMode === 'html' ? '#fff' : 'none')
            };
        }

        if (!zrUtil.isArray(tooltipDataParams)) {
            return {
                color: borderColor || tooltipDataParams.color || tooltipDataParams.borderColor
            };
        }
    }

    private _updatePosition(
        tooltipModel: Model<TooltipOption>,
        positionExpr: TooltipOption['position'],
        x: number,  // Mouse x
        y: number,  // Mouse y
        content: TooltipHTMLContent | TooltipRichContent,
        params: TooltipCallbackDataParams | TooltipCallbackDataParams[],
        el?: Element
    ) {
        const viewWidth = this._api.getWidth();
        const viewHeight = this._api.getHeight();

        positionExpr = positionExpr || tooltipModel.get('position');

        const contentSize = content.getSize();
        let align = tooltipModel.get('align');
        let vAlign = tooltipModel.get('verticalAlign');
        const rect = el && el.getBoundingRect().clone();
        el && rect.applyTransform(el.transform);

        if (zrUtil.isFunction(positionExpr)) {
            // Callback of position can be an array or a string specify the position
            positionExpr = positionExpr([x, y], params, content.el, rect, {
                viewSize: [viewWidth, viewHeight],
                contentSize: contentSize.slice() as [number, number]
            });
        }

        if (zrUtil.isArray(positionExpr)) {
            x = parsePercent(positionExpr[0], viewWidth);
            y = parsePercent(positionExpr[1], viewHeight);
        }
        else if (zrUtil.isObject(positionExpr)) {
            const boxLayoutPosition = positionExpr as BoxLayoutOptionMixin;
            boxLayoutPosition.width = contentSize[0];
            boxLayoutPosition.height = contentSize[1];
            const layoutRect = layoutUtil.getLayoutRect(
                boxLayoutPosition, {width: viewWidth, height: viewHeight}
            );
            x = layoutRect.x;
            y = layoutRect.y;
            align = null;
            // When positionExpr is left/top/right/bottom,
            // align and verticalAlign will not work.
            vAlign = null;
        }
        // Specify tooltip position by string 'top' 'bottom' 'left' 'right' around graphic element
        else if (zrUtil.isString(positionExpr) && el) {
            const pos = calcTooltipPosition(
                positionExpr, rect, contentSize
            );
            x = pos[0];
            y = pos[1];
        }
        else {
            const pos = refixTooltipPosition(
                x, y, content, viewWidth, viewHeight, align ? null : 20, vAlign ? null : 20
            );
            x = pos[0];
            y = pos[1];
        }

        align && (x -= isCenterAlign(align) ? contentSize[0] / 2 : align === 'right' ? contentSize[0] : 0);
        vAlign && (y -= isCenterAlign(vAlign) ? contentSize[1] / 2 : vAlign === 'bottom' ? contentSize[1] : 0);

        if (shouldTooltipConfine(tooltipModel)) {
            const pos = confineTooltipPosition(
                x, y, content, viewWidth, viewHeight
            );
            x = pos[0];
            y = pos[1];
        }

        content.moveTo(x, y);
    }

    // FIXME
    // Should we remove this but leave this to user?
    private _updateContentNotChangedOnAxis(dataByCoordSys: DataByCoordSys[]) {
        const lastCoordSys = this._lastDataByCoordSys;
        let contentNotChanged = !!lastCoordSys
            && lastCoordSys.length === dataByCoordSys.length;

        contentNotChanged && each(lastCoordSys, function (lastItemCoordSys, indexCoordSys) {
            const lastDataByAxis = lastItemCoordSys.dataByAxis || [] as DataByAxis[];
            const thisItemCoordSys = dataByCoordSys[indexCoordSys] || {} as DataByCoordSys;
            const thisDataByAxis = thisItemCoordSys.dataByAxis || [] as DataByAxis[];
            contentNotChanged = contentNotChanged && lastDataByAxis.length === thisDataByAxis.length;

            contentNotChanged && each(lastDataByAxis, function (lastItem, indexAxis) {
                const thisItem = thisDataByAxis[indexAxis] || {} as DataByAxis;
                const lastIndices = lastItem.seriesDataIndices || [] as DataIndex[];
                const newIndices = thisItem.seriesDataIndices || [] as DataIndex[];

                contentNotChanged = contentNotChanged
                    && lastItem.value === thisItem.value
                    && lastItem.axisType === thisItem.axisType
                    && lastItem.axisId === thisItem.axisId
                    && lastIndices.length === newIndices.length;

                contentNotChanged && each(lastIndices, function (lastIdxItem, j) {
                    const newIdxItem = newIndices[j];
                    contentNotChanged = contentNotChanged
                        && lastIdxItem.seriesIndex === newIdxItem.seriesIndex
                        && lastIdxItem.dataIndex === newIdxItem.dataIndex;
                });
            });
        });

        this._lastDataByCoordSys = dataByCoordSys;

        return !!contentNotChanged;
    }

    private _hide(dispatchAction: ExtensionAPI['dispatchAction']) {
        // Do not directly hideLater here, because this behavior may be prevented
        // in dispatchAction when showTip is dispatched.

        // FIXME
        // duplicated hideTip if manuallyHideTip is called from dispatchAction.
        this._lastDataByCoordSys = null;
        dispatchAction({
            type: 'hideTip',
            from: this.uid
        });
    }

    dispose(ecModel: GlobalModel, api: ExtensionAPI) {
        if (env.node) {
            return;
        }
        this._tooltipContent.dispose();
        globalListener.unregister('itemTooltip', api);
    }
}

type TooltipableOption = {
    tooltip?: Omit<TooltipOption, 'mainType'> | string
};
/**
 * From top to bottom. (the last one should be globalTooltipModel);
 */
function buildTooltipModel(modelCascade: (
    TooltipModel | Model<TooltipableOption> | Omit<TooltipOption, 'mainType'> | string
)[]) {
    // Last is always tooltip model.
    let resultModel = modelCascade.pop() as Model<TooltipOption>;
    while (modelCascade.length) {
        let tooltipOpt = modelCascade.pop();
        if (tooltipOpt) {
            if (tooltipOpt instanceof Model) {
                tooltipOpt = (tooltipOpt as Model<TooltipableOption>).get('tooltip', true);
            }
            // In each data item tooltip can be simply write:
            // {
            //  value: 10,
            //  tooltip: 'Something you need to know'
            // }
            if (zrUtil.isString(tooltipOpt)) {
                tooltipOpt = {
                    formatter: tooltipOpt
                };
            }
            resultModel = new Model(tooltipOpt, resultModel, resultModel.ecModel) as Model<TooltipOption>;
        }
    }
    return resultModel;
}

function makeDispatchAction(payload: ShowTipPayload | HideTipPayload, api: ExtensionAPI) {
    return payload.dispatchAction || zrUtil.bind(api.dispatchAction, api);
}

function refixTooltipPosition(
    x: number, y: number,
    content: TooltipHTMLContent | TooltipRichContent,
    viewWidth: number, viewHeight: number,
    gapH: number, gapV: number
) {
    const size = content.getOuterSize();
    const width = size.width;
    const height = size.height;

    if (gapH != null) {
        // Add extra 2 pixels for this case:
        // At present the "values" in defaut tooltip are using CSS `float: right`.
        // When the right edge of the tooltip box is on the right side of the
        // viewport, the `float` layout might push the "values" to the second line.
        if (x + width + gapH + 2 > viewWidth) {
            x -= width + gapH;
        }
        else {
            x += gapH;
        }
    }
    if (gapV != null) {
        if (y + height + gapV > viewHeight) {
            y -= height + gapV;
        }
        else {
            y += gapV;
        }
    }
    return [x, y];
}

function confineTooltipPosition(
    x: number, y: number,
    content: TooltipHTMLContent | TooltipRichContent,
    viewWidth: number,
    viewHeight: number
): [number, number] {
    const size = content.getOuterSize();
    const width = size.width;
    const height = size.height;

    x = Math.min(x + width, viewWidth) - width;
    y = Math.min(y + height, viewHeight) - height;
    x = Math.max(x, 0);
    y = Math.max(y, 0);

    return [x, y];
}

function calcTooltipPosition(
    position: TooltipOption['position'],
    rect: ZRRectLike,
    contentSize: number[]
): [number, number] {
    const domWidth = contentSize[0];
    const domHeight = contentSize[1];
    const gap = 10;
    const offset = 5;
    let x = 0;
    let y = 0;
    const rectWidth = rect.width;
    const rectHeight = rect.height;
    switch (position) {
        case 'inside':
            x = rect.x + rectWidth / 2 - domWidth / 2;
            y = rect.y + rectHeight / 2 - domHeight / 2;
            break;
        case 'top':
            x = rect.x + rectWidth / 2 - domWidth / 2;
            y = rect.y - domHeight - gap;
            break;
        case 'bottom':
            x = rect.x + rectWidth / 2 - domWidth / 2;
            y = rect.y + rectHeight + gap;
            break;
        case 'left':
            x = rect.x - domWidth - gap - offset;
            y = rect.y + rectHeight / 2 - domHeight / 2;
            break;
        case 'right':
            x = rect.x + rectWidth + gap + offset;
            y = rect.y + rectHeight / 2 - domHeight / 2;
    }
    return [x, y];
}

function isCenterAlign(align: HorizontalAlign | VerticalAlign) {
    return align === 'center' || align === 'middle';
}

export default TooltipView;
