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

import BoundingRect, { RectLike } from 'zrender/src/core/BoundingRect';
import * as matrix from 'zrender/src/core/matrix';
import * as graphic from '../../util/graphic';
import * as layout from '../../util/layout';
import TimelineView from './TimelineView';
import TimelineAxis from './TimelineAxis';
import {createSymbol} from '../../util/symbol';
import * as numberUtil from '../../util/number';
import {encodeHTML} from '../../util/format';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { merge, each, extend, clone, isString, bind } from 'zrender/src/core/util';
import SliderTimelineModel from './SliderTimelineModel';
import ComponentView from '../../view/Component';
import { LayoutOrient, ZRTextAlign, ZRTextVerticalAlign, ZRElementEvent } from '../../util/types';
import TimelineModel, { TimelineDataItemOption, TimelineCheckpointStyle } from './TimelineModel';
import { TimelineChangePayload, TimelinePlayChangePayload } from './timelineAction';
import Model from '../../model/Model';
import { PathProps } from 'zrender/src/graphic/Path';
import Scale from '../../scale/Scale';
import OrdinalScale from '../../scale/Ordinal';
import TimeScale from '../../scale/Time';
import IntervalScale from '../../scale/Interval';
import { VectorArray } from 'zrender/src/core/vector';

const PI = Math.PI;

type TimelineSymbol = ReturnType<typeof createSymbol>;

type RenderMethodName = '_renderAxisLine' | '_renderAxisTick' | '_renderControl' | '_renderCurrentPointer';

type ControlIconName = 'playIcon' | 'stopIcon' | 'nextIcon' | 'prevIcon';

interface LayoutInfo {
    viewRect: BoundingRect
    mainLength: number
    orient: LayoutOrient

    rotation: number
    labelRotation: number
    labelPosOpt: number | '+' | '-'
    labelAlign: ZRTextAlign
    labelBaseline: ZRTextVerticalAlign

    playPosition: number[]
    prevBtnPosition: number[]
    nextBtnPosition: number[]
    axisExtent: number[]

    controlSize: number
    controlGap: number
}

class SliderTimelineView extends TimelineView {

    static type = 'timeline.slider';
    type = SliderTimelineView.type;

    api: ExtensionAPI;
    model: SliderTimelineModel;
    ecModel: GlobalModel;

    private _axis: TimelineAxis;

    private _viewRect: BoundingRect;

    private _timer: number;

    private _currentPointer: TimelineSymbol;

    private _mainGroup: graphic.Group;

    private _labelGroup: graphic.Group;


    init(ecModel: GlobalModel, api: ExtensionAPI) {
        this.api = api;
    }

    /**
     * @override
     */
    render(timelineModel: SliderTimelineModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this.model = timelineModel;
        this.api = api;
        this.ecModel = ecModel;

        this.group.removeAll();

        if (timelineModel.get('show', true)) {

            let layoutInfo = this._layout(timelineModel, api);
            let mainGroup = this._createGroup('_mainGroup');
            let labelGroup = this._createGroup('_labelGroup');

            let axis = this._axis = this._createAxis(layoutInfo, timelineModel);

            timelineModel.formatTooltip = function (dataIndex: number) {
                return encodeHTML(axis.scale.getLabel(dataIndex));
            };

            each(
                ['AxisLine', 'AxisTick', 'Control', 'CurrentPointer'] as const,
                function (name) {
                    this['_render' + name as RenderMethodName](layoutInfo, mainGroup, axis, timelineModel);
                },
                this
            );

            this._renderAxisLabel(layoutInfo, labelGroup, axis, timelineModel);
            this._position(layoutInfo, timelineModel);
        }

        this._doPlayStop();
    }

    /**
     * @override
     */
    remove() {
        this._clearTimer();
        this.group.removeAll();
    }

    /**
     * @override
     */
    dispose() {
        this._clearTimer();
    }

    _layout(timelineModel: SliderTimelineModel, api: ExtensionAPI): LayoutInfo {
        let labelPosOpt = timelineModel.get(['label', 'position']);
        let orient = timelineModel.get('orient');
        let viewRect = getViewRect(timelineModel, api);
        let parsedLabelPos: number | '+' | '-';
        // Auto label offset.
        if (labelPosOpt == null || labelPosOpt === 'auto') {
            parsedLabelPos = orient === 'horizontal'
                ? ((viewRect.y + viewRect.height / 2) < api.getHeight() / 2 ? '-' : '+')
                : ((viewRect.x + viewRect.width / 2) < api.getWidth() / 2 ? '+' : '-');
        }
        else if (isString(labelPosOpt)) {
            parsedLabelPos = ({
                horizontal: {top: '-', bottom: '+'},
                vertical: {left: '-', right: '+'}
            } as const)[orient][labelPosOpt];
        }
        else {
            // is number
            parsedLabelPos = labelPosOpt;
        }

        let labelAlignMap = {
            horizontal: 'center',
            vertical: (parsedLabelPos >= 0 || parsedLabelPos === '+') ? 'left' : 'right'
        };

        let labelBaselineMap = {
            horizontal: (parsedLabelPos >= 0 || parsedLabelPos === '+') ? 'top' : 'bottom',
            vertical: 'middle'
        };
        let rotationMap = {
            horizontal: 0,
            vertical: PI / 2
        };

        // Position
        let mainLength = orient === 'vertical' ? viewRect.height : viewRect.width;

        let controlModel = timelineModel.getModel('controlStyle');
        let showControl = controlModel.get('show', true);
        let controlSize = showControl ? controlModel.get('itemSize') : 0;
        let controlGap = showControl ? controlModel.get('itemGap') : 0;
        let sizePlusGap = controlSize + controlGap;

        // Special label rotate.
        let labelRotation = timelineModel.get(['label', 'rotate']) || 0;
        labelRotation = labelRotation * PI / 180; // To radian.

        let playPosition: number[];
        let prevBtnPosition: number[];
        let nextBtnPosition: number[];
        let axisExtent: number[];
        let controlPosition = controlModel.get('position', true);
        let showPlayBtn = showControl && controlModel.get('showPlayBtn', true);
        let showPrevBtn = showControl && controlModel.get('showPrevBtn', true);
        let showNextBtn = showControl && controlModel.get('showNextBtn', true);
        let xLeft = 0;
        let xRight = mainLength;

        // position[0] means left, position[1] means middle.
        if (controlPosition === 'left' || controlPosition === 'bottom') {
            showPlayBtn && (playPosition = [0, 0], xLeft += sizePlusGap);
            showPrevBtn && (prevBtnPosition = [xLeft, 0], xLeft += sizePlusGap);
            showNextBtn && (nextBtnPosition = [xRight - controlSize, 0], xRight -= sizePlusGap);
        }
        else { // 'top' 'right'
            showPlayBtn && (playPosition = [xRight - controlSize, 0], xRight -= sizePlusGap);
            showPrevBtn && (prevBtnPosition = [0, 0], xLeft += sizePlusGap);
            showNextBtn && (nextBtnPosition = [xRight - controlSize, 0], xRight -= sizePlusGap);
        }
        axisExtent = [xLeft, xRight];

        if (timelineModel.get('inverse')) {
            axisExtent.reverse();
        }

        return {
            viewRect: viewRect,
            mainLength: mainLength,
            orient: orient,

            rotation: rotationMap[orient],
            labelRotation: labelRotation,
            labelPosOpt: parsedLabelPos,
            labelAlign: timelineModel.get(['label', 'align']) || labelAlignMap[orient] as ZRTextAlign,
            labelBaseline: timelineModel.get(['label', 'verticalAlign'])
                || timelineModel.get(['label', 'baseline'])
                || labelBaselineMap[orient] as ZRTextVerticalAlign,

            // Based on mainGroup.
            playPosition: playPosition,
            prevBtnPosition: prevBtnPosition,
            nextBtnPosition: nextBtnPosition,
            axisExtent: axisExtent,

            controlSize: controlSize,
            controlGap: controlGap
        };
    }

    _position(layoutInfo: LayoutInfo, timelineModel: SliderTimelineModel) {
        // Position is be called finally, because bounding rect is needed for
        // adapt content to fill viewRect (auto adapt offset).

        // Timeline may be not all in the viewRect when 'offset' is specified
        // as a number, because it is more appropriate that label aligns at
        // 'offset' but not the other edge defined by viewRect.

        let mainGroup = this._mainGroup;
        let labelGroup = this._labelGroup;

        let viewRect = layoutInfo.viewRect;
        if (layoutInfo.orient === 'vertical') {
            // transform to horizontal, inverse rotate by left-top point.
            let m = matrix.create();
            let rotateOriginX = viewRect.x;
            let rotateOriginY = viewRect.y + viewRect.height;
            matrix.translate(m, m, [-rotateOriginX, -rotateOriginY]);
            matrix.rotate(m, m, -PI / 2);
            matrix.translate(m, m, [rotateOriginX, rotateOriginY]);
            viewRect = viewRect.clone();
            viewRect.applyTransform(m);
        }

        let viewBound = getBound(viewRect);
        let mainBound = getBound(mainGroup.getBoundingRect());
        let labelBound = getBound(labelGroup.getBoundingRect());

        let mainPosition = mainGroup.position;
        let labelsPosition = labelGroup.position;

        labelsPosition[0] = mainPosition[0] = viewBound[0][0];

        let labelPosOpt = layoutInfo.labelPosOpt;

        if (labelPosOpt == null || isString(labelPosOpt)) { // '+' or '-'
            let mainBoundIdx = labelPosOpt === '+' ? 0 : 1;
            toBound(mainPosition, mainBound, viewBound, 1, mainBoundIdx);
            toBound(labelsPosition, labelBound, viewBound, 1, 1 - mainBoundIdx);
        }
        else {
            let mainBoundIdx = labelPosOpt >= 0 ? 0 : 1;
            toBound(mainPosition, mainBound, viewBound, 1, mainBoundIdx);
            labelsPosition[1] = mainPosition[1] + labelPosOpt;
        }

        mainGroup.attr('position', mainPosition);
        labelGroup.attr('position', labelsPosition);
        mainGroup.rotation = labelGroup.rotation = layoutInfo.rotation;

        setOrigin(mainGroup);
        setOrigin(labelGroup);

        function setOrigin(targetGroup: graphic.Group) {
            let pos = targetGroup.position;
            targetGroup.origin = [
                viewBound[0][0] - pos[0],
                viewBound[1][0] - pos[1]
            ];
        }

        function getBound(rect: RectLike) {
            // [[xmin, xmax], [ymin, ymax]]
            return [
                [rect.x, rect.x + rect.width],
                [rect.y, rect.y + rect.height]
            ];
        }

        function toBound(fromPos: VectorArray, from: number[][], to: number[][], dimIdx: number, boundIdx: number) {
            fromPos[dimIdx] += to[dimIdx][boundIdx] - from[dimIdx][boundIdx];
        }
    }

    _createAxis(layoutInfo: LayoutInfo, timelineModel: SliderTimelineModel) {
        let data = timelineModel.getData();
        let axisType = timelineModel.get('axisType');

        let scale = createScaleByModel(timelineModel, axisType);

        // Customize scale. The `tickValue` is `dataIndex`.
        scale.getTicks = function () {
            return data.mapArray(['value'], function (value: number) {
                return value;
            });
        };

        let dataExtent = data.getDataExtent('value');
        scale.setExtent(dataExtent[0], dataExtent[1]);
        scale.niceTicks();

        let axis = new TimelineAxis('value', scale, layoutInfo.axisExtent as [number, number], axisType);
        axis.model = timelineModel;

        return axis;
    }

    _createGroup(key: '_mainGroup' | '_labelGroup') {
        let newGroup = this[key] = new graphic.Group();
        this.group.add(newGroup);
        return newGroup;
    }

    _renderAxisLine(
        layoutInfo: LayoutInfo,
        group: graphic.Group,
        axis: TimelineAxis,
        timelineModel: SliderTimelineModel
    ) {
        let axisExtent = axis.getExtent();

        if (!timelineModel.get(['lineStyle', 'show'])) {
            return;
        }

        group.add(new graphic.Line({
            shape: {
                x1: axisExtent[0], y1: 0,
                x2: axisExtent[1], y2: 0
            },
            style: extend(
                {lineCap: 'round'},
                timelineModel.getModel('lineStyle').getLineStyle()
            ),
            silent: true,
            z2: 1
        }));
    }

    /**
     * @private
     */
    _renderAxisTick(
        layoutInfo: LayoutInfo,
        group: graphic.Group,
        axis: TimelineAxis,
        timelineModel: SliderTimelineModel
    ) {
        let data = timelineModel.getData();
        // Show all ticks, despite ignoring strategy.
        let ticks = axis.scale.getTicks();

        // The value is dataIndex, see the costomized scale.
        each(ticks, function (value) {
            let tickCoord = axis.dataToCoord(value);
            let itemModel = data.getItemModel<TimelineDataItemOption>(value);
            let itemStyleModel = itemModel.getModel('itemStyle');
            let hoverStyleModel = itemModel.getModel(['emphasis', 'itemStyle']);
            let symbolOpt = {
                position: [tickCoord, 0],
                onclick: bind(this._changeTimeline, this, value)
            };
            let el = giveSymbol(itemModel, itemStyleModel, group, symbolOpt);
            graphic.enableHoverEmphasis(el, hoverStyleModel.getItemStyle());

            let ecData = graphic.getECData(el);
            if (itemModel.get('tooltip')) {
                ecData.dataIndex = value;
                ecData.dataModel = timelineModel;
            }
            else {
                ecData.dataIndex = ecData.dataModel = null;
            }

        }, this);
    }

    /**
     * @private
     */
    _renderAxisLabel(
        layoutInfo: LayoutInfo,
        group: graphic.Group,
        axis: TimelineAxis,
        timelineModel: SliderTimelineModel
    ) {
        let labelModel = axis.getLabelModel();

        if (!labelModel.get('show')) {
            return;
        }

        let data = timelineModel.getData();
        let labels = axis.getViewLabels();

        each(labels, function (labelItem) {
            // The tickValue is dataIndex, see the costomized scale.
            let dataIndex = labelItem.tickValue;

            let itemModel = data.getItemModel<TimelineDataItemOption>(dataIndex);
            let normalLabelModel = itemModel.getModel('label');
            let hoverLabelModel = itemModel.getModel(['emphasis', 'label']);
            let tickCoord = axis.dataToCoord(labelItem.tickValue);
            let textEl = new graphic.Text({
                position: [tickCoord, 0],
                rotation: layoutInfo.labelRotation - layoutInfo.rotation,
                onclick: bind(this._changeTimeline, this, dataIndex),
                silent: false,
                style: graphic.createTextStyle(normalLabelModel, {
                    text: labelItem.formattedLabel,
                    align: layoutInfo.labelAlign,
                    verticalAlign: layoutInfo.labelBaseline
                })
            });

            group.add(textEl);
            graphic.enableHoverEmphasis(
                textEl, graphic.createTextStyle(hoverLabelModel)
            );

        }, this);
    }

    /**
     * @private
     */
    _renderControl(
        layoutInfo: LayoutInfo,
        group: graphic.Group,
        axis: TimelineAxis,
        timelineModel: SliderTimelineModel
    ) {
        let controlSize = layoutInfo.controlSize;
        let rotation = layoutInfo.rotation;

        let itemStyle = timelineModel.getModel('controlStyle').getItemStyle();
        let hoverStyle = timelineModel.getModel(['emphasis', 'controlStyle']).getItemStyle();
        let rect = [0, -controlSize / 2, controlSize, controlSize];
        let playState = timelineModel.getPlayState();
        let inverse = timelineModel.get('inverse', true);

        makeBtn(
            layoutInfo.nextBtnPosition,
            'nextIcon',
            bind(this._changeTimeline, this, inverse ? '-' : '+')
        );
        makeBtn(
            layoutInfo.prevBtnPosition,
            'prevIcon',
            bind(this._changeTimeline, this, inverse ? '+' : '-')
        );
        makeBtn(
            layoutInfo.playPosition,
            (playState ? 'stopIcon' : 'playIcon'),
            bind(this._handlePlayClick, this, !playState),
            true
        );

        function makeBtn(
            position: number[],
            iconPath: ControlIconName,
            onclick: () => void,
            willRotate?: boolean
        ) {
            if (!position) {
                return;
            }
            let opt = {
                position: position,
                origin: [controlSize / 2, 0],
                rotation: willRotate ? -rotation : 0,
                rectHover: true,
                style: itemStyle,
                onclick: onclick
            };
            let btn = makeControlIcon(timelineModel, iconPath, rect, opt);
            group.add(btn);
            graphic.enableHoverEmphasis(btn, hoverStyle);
        }
    }

    _renderCurrentPointer(
        layoutInfo: LayoutInfo,
        group: graphic.Group,
        axis: TimelineAxis,
        timelineModel: SliderTimelineModel
    ) {
        let data = timelineModel.getData();
        let currentIndex = timelineModel.getCurrentIndex();
        let pointerModel = data.getItemModel<TimelineDataItemOption>(currentIndex)
            .getModel('checkpointStyle');
        let me = this;

        let callback = {
            onCreate(pointer: TimelineSymbol) {
                pointer.draggable = true;
                pointer.drift = bind(me._handlePointerDrag, me);
                pointer.ondragend = bind(me._handlePointerDragend, me);
                pointerMoveTo(pointer, currentIndex, axis, timelineModel, true);
            },
            onUpdate(pointer: TimelineSymbol) {
                pointerMoveTo(pointer, currentIndex, axis, timelineModel);
            }
        };

        // Reuse when exists, for animation and drag.
        this._currentPointer = giveSymbol(
            pointerModel, pointerModel, this._mainGroup, {}, this._currentPointer, callback
        );
    }

    _handlePlayClick(nextState: boolean) {
        this._clearTimer();
        this.api.dispatchAction({
            type: 'timelinePlayChange',
            playState: nextState,
            from: this.uid
        } as TimelinePlayChangePayload);
    }

    _handlePointerDrag(dx: number, dy: number, e: ZRElementEvent) {
        this._clearTimer();
        this._pointerChangeTimeline([e.offsetX, e.offsetY]);
    }

    _handlePointerDragend(e: ZRElementEvent) {
        this._pointerChangeTimeline([e.offsetX, e.offsetY], true);
    }

    _pointerChangeTimeline(mousePos: number[], trigger?: boolean) {
        let toCoord = this._toAxisCoord(mousePos)[0];

        let axis = this._axis;
        let axisExtent = numberUtil.asc(axis.getExtent().slice());

        toCoord > axisExtent[1] && (toCoord = axisExtent[1]);
        toCoord < axisExtent[0] && (toCoord = axisExtent[0]);

        this._currentPointer.position[0] = toCoord;
        this._currentPointer.dirty();

        let targetDataIndex = this._findNearestTick(toCoord);
        let timelineModel = this.model;

        if (trigger || (
            targetDataIndex !== timelineModel.getCurrentIndex()
            && timelineModel.get('realtime')
        )) {
            this._changeTimeline(targetDataIndex);
        }
    }

    _doPlayStop() {
        this._clearTimer();

        if (this.model.getPlayState()) {
            this._timer = setTimeout(
                () => {
                    // Do not cache
                    let timelineModel = this.model;
                    this._changeTimeline(
                        timelineModel.getCurrentIndex()
                        + (timelineModel.get('rewind', true) ? -1 : 1)
                    );
                },
                this.model.get('playInterval')
            ) as any;
        }
    }

    _toAxisCoord(vertex: number[]) {
        let trans = this._mainGroup.getLocalTransform();
        return graphic.applyTransform(vertex, trans, true);
    }

    _findNearestTick(axisCoord: number) {
        let data = this.model.getData();
        let dist = Infinity;
        let targetDataIndex;
        let axis = this._axis;

        data.each(['value'], function (value, dataIndex) {
            let coord = axis.dataToCoord(value);
            let d = Math.abs(coord - axisCoord);
            if (d < dist) {
                dist = d;
                targetDataIndex = dataIndex;
            }
        });

        return targetDataIndex;
    }

    _clearTimer() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    _changeTimeline(nextIndex: number | '+' | '-') {
        let currentIndex = this.model.getCurrentIndex();

        if (nextIndex === '+') {
            nextIndex = currentIndex + 1;
        }
        else if (nextIndex === '-') {
            nextIndex = currentIndex - 1;
        }

        this.api.dispatchAction({
            type: 'timelineChange',
            currentIndex: nextIndex,
            from: this.uid
        } as TimelineChangePayload);
    }

}

function createScaleByModel(model: SliderTimelineModel, axisType?: string): Scale {
    axisType = axisType || model.get('type');
    if (axisType) {
        switch (axisType) {
            // Buildin scale
            case 'category':
                return new OrdinalScale({
                    ordinalMeta: model.getCategories(),
                    extent: [Infinity, -Infinity]
                });
            case 'time':
                return new TimeScale({
                    useUTC: model.ecModel.get('useUTC')
                });
            default:
                // default to be value
                return new IntervalScale();
        }
    }
}


function getViewRect(model: SliderTimelineModel, api: ExtensionAPI) {
    return layout.getLayoutRect(
        model.getBoxLayoutParams(),
        {
            width: api.getWidth(),
            height: api.getHeight()
        },
        model.get('padding')
    );
}

function makeControlIcon(
    timelineModel: TimelineModel,
    objPath: ControlIconName,
    rect: number[],
    opts: PathProps
) {
    let icon = graphic.makePath(
        timelineModel.get(['controlStyle', objPath]).replace(/^path:\/\//, ''),
        clone(opts || {}),
        new BoundingRect(rect[0], rect[1], rect[2], rect[3]),
        'center'
    );

    return icon;
}

/**
 * Create symbol or update symbol
 * opt: basic position and event handlers
 */
function giveSymbol(
    hostModel: Model<TimelineDataItemOption | TimelineCheckpointStyle>,
    itemStyleModel: Model<TimelineDataItemOption['itemStyle'] | TimelineCheckpointStyle>,
    group: graphic.Group,
    opt: PathProps,
    symbol?: TimelineSymbol,
    callback?: {
        onCreate?: (symbol: TimelineSymbol) => void
        onUpdate?: (symbol: TimelineSymbol) => void
    }
) {
    let color = itemStyleModel.get('color');

    if (!symbol) {
        let symbolType = hostModel.get('symbol');
        symbol = createSymbol(symbolType, -1, -1, 2, 2, color);
        symbol.setStyle('strokeNoScale', true);
        group.add(symbol);
        callback && callback.onCreate(symbol);
    }
    else {
        symbol.setColor(color);
        group.add(symbol); // Group may be new, also need to add.
        callback && callback.onUpdate(symbol);
    }

    // Style
    let itemStyle = itemStyleModel.getItemStyle(['color']);
    symbol.setStyle(itemStyle);

    // Transform and events.
    opt = merge({
        rectHover: true,
        z2: 100
    }, opt, true);

    let symbolSize = hostModel.get('symbolSize');
    symbolSize = symbolSize instanceof Array
        ? symbolSize.slice()
        : [+symbolSize, +symbolSize];
    symbolSize[0] /= 2;
    symbolSize[1] /= 2;
    opt.scale = symbolSize;

    let symbolOffset = hostModel.get('symbolOffset');
    if (symbolOffset) {
        let pos = opt.position = opt.position || [0, 0];
        pos[0] += numberUtil.parsePercent(symbolOffset[0], symbolSize[0]);
        pos[1] += numberUtil.parsePercent(symbolOffset[1], symbolSize[1]);
    }

    let symbolRotate = hostModel.get('symbolRotate');
    opt.rotation = (symbolRotate || 0) * Math.PI / 180 || 0;

    symbol.attr(opt);

    // FIXME
    // (1) When symbol.style.strokeNoScale is true and updateTransform is not performed,
    // getBoundingRect will return wrong result.
    // (This is supposed to be resolved in zrender, but it is a little difficult to
    // leverage performance and auto updateTransform)
    // (2) All of ancesters of symbol do not scale, so we can just updateTransform symbol.
    symbol.updateTransform();

    return symbol;
}

function pointerMoveTo(
    pointer: TimelineSymbol,
    dataIndex: number,
    axis: TimelineAxis,
    timelineModel: SliderTimelineModel,
    noAnimation?: boolean
) {
    if (pointer.dragging) {
        return;
    }

    let pointerModel = timelineModel.getModel('checkpointStyle');
    let toCoord = axis.dataToCoord(timelineModel.getData().get('value', dataIndex));

    if (noAnimation || !pointerModel.get('animation', true)) {
        pointer.attr({position: [toCoord, 0]});
    }
    else {
        pointer.stopAnimation(true);
        pointer.animateTo(
            { position: [toCoord, 0] },
            pointerModel.get('animationDuration', true),
            pointerModel.get('animationEasing', true)
        );
    }
}


ComponentView.registerClass(SliderTimelineView);

export default SliderTimelineView;