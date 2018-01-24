import * as zrUtil from 'zrender/src/core/util';
import BoundingRect from 'zrender/src/core/BoundingRect';
import * as matrix from 'zrender/src/core/matrix';
import * as graphic from '../../util/graphic';
import * as layout from '../../util/layout';
import TimelineView from './TimelineView';
import TimelineAxis from './TimelineAxis';
import {createSymbol} from '../../util/symbol';
import * as axisHelper from '../../coord/axisHelper';
import * as numberUtil from '../../util/number';
import {encodeHTML} from '../../util/format';

var bind = zrUtil.bind;
var each = zrUtil.each;

var PI = Math.PI;

export default TimelineView.extend({

    type: 'timeline.slider',

    init: function (ecModel, api) {

        this.api = api;

        /**
         * @private
         * @type {module:echarts/component/timeline/TimelineAxis}
         */
        this._axis;

        /**
         * @private
         * @type {module:zrender/core/BoundingRect}
         */
        this._viewRect;

        /**
         * @type {number}
         */
        this._timer;

        /**
         * @type {module:zrender/Element}
         */
        this._currentPointer;

        /**
         * @type {module:zrender/container/Group}
         */
        this._mainGroup;

        /**
         * @type {module:zrender/container/Group}
         */
        this._labelGroup;
    },

    /**
     * @override
     */
    render: function (timelineModel, ecModel, api, payload) {
        this.model = timelineModel;
        this.api = api;
        this.ecModel = ecModel;

        this.group.removeAll();

        if (timelineModel.get('show', true)) {

            var layoutInfo = this._layout(timelineModel, api);
            var mainGroup = this._createGroup('mainGroup');
            var labelGroup = this._createGroup('labelGroup');

            /**
             * @private
             * @type {module:echarts/component/timeline/TimelineAxis}
             */
            var axis = this._axis = this._createAxis(layoutInfo, timelineModel);

            timelineModel.formatTooltip = function (dataIndex) {
                return encodeHTML(axis.scale.getLabel(dataIndex));
            };

            each(
                ['AxisLine', 'AxisTick', 'Control', 'CurrentPointer'],
                function (name) {
                    this['_render' + name](layoutInfo, mainGroup, axis, timelineModel);
                },
                this
            );

            this._renderAxisLabel(layoutInfo, labelGroup, axis, timelineModel);
            this._position(layoutInfo, timelineModel);
        }

        this._doPlayStop();
    },

    /**
     * @override
     */
    remove: function () {
        this._clearTimer();
        this.group.removeAll();
    },

    /**
     * @override
     */
    dispose: function () {
        this._clearTimer();
    },

    _layout: function (timelineModel, api) {
        var labelPosOpt = timelineModel.get('label.position');
        var orient = timelineModel.get('orient');
        var viewRect = getViewRect(timelineModel, api);
        // Auto label offset.
        if (labelPosOpt == null || labelPosOpt === 'auto') {
            labelPosOpt = orient === 'horizontal'
                ? ((viewRect.y + viewRect.height / 2) < api.getHeight() / 2 ? '-' : '+')
                : ((viewRect.x + viewRect.width / 2) < api.getWidth() / 2 ? '+' : '-');
        }
        else if (isNaN(labelPosOpt)) {
            labelPosOpt = ({
                horizontal: {top: '-', bottom: '+'},
                vertical: {left: '-', right: '+'}
            })[orient][labelPosOpt];
        }

        var labelAlignMap = {
            horizontal: 'center',
            vertical: (labelPosOpt >= 0 || labelPosOpt === '+') ? 'left' : 'right'
        };

        var labelBaselineMap = {
            horizontal: (labelPosOpt >= 0 || labelPosOpt === '+') ? 'top' : 'bottom',
            vertical: 'middle'
        };
        var rotationMap = {
            horizontal: 0,
            vertical: PI / 2
        };

        // Position
        var mainLength = orient === 'vertical' ? viewRect.height : viewRect.width;

        var controlModel = timelineModel.getModel('controlStyle');
        var showControl = controlModel.get('show', true);
        var controlSize = showControl ? controlModel.get('itemSize') : 0;
        var controlGap = showControl ? controlModel.get('itemGap') : 0;
        var sizePlusGap = controlSize + controlGap;

        // Special label rotate.
        var labelRotation = timelineModel.get('label.rotate') || 0;
        labelRotation = labelRotation * PI / 180; // To radian.

        var playPosition;
        var prevBtnPosition;
        var nextBtnPosition;
        var axisExtent;
        var controlPosition = controlModel.get('position', true);
        var showPlayBtn = showControl && controlModel.get('showPlayBtn', true);
        var showPrevBtn = showControl && controlModel.get('showPrevBtn', true);
        var showNextBtn = showControl && controlModel.get('showNextBtn', true);
        var xLeft = 0;
        var xRight = mainLength;

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
            labelPosOpt: labelPosOpt,
            labelAlign: timelineModel.get('label.align') || labelAlignMap[orient],
            labelBaseline: timelineModel.get('label.verticalAlign')
                || timelineModel.get('label.baseline')
                || labelBaselineMap[orient],

            // Based on mainGroup.
            playPosition: playPosition,
            prevBtnPosition: prevBtnPosition,
            nextBtnPosition: nextBtnPosition,
            axisExtent: axisExtent,

            controlSize: controlSize,
            controlGap: controlGap
        };
    },

    _position: function (layoutInfo, timelineModel) {
        // Position is be called finally, because bounding rect is needed for
        // adapt content to fill viewRect (auto adapt offset).

        // Timeline may be not all in the viewRect when 'offset' is specified
        // as a number, because it is more appropriate that label aligns at
        // 'offset' but not the other edge defined by viewRect.

        var mainGroup = this._mainGroup;
        var labelGroup = this._labelGroup;

        var viewRect = layoutInfo.viewRect;
        if (layoutInfo.orient === 'vertical') {
            // transform to horizontal, inverse rotate by left-top point.
            var m = matrix.create();
            var rotateOriginX = viewRect.x;
            var rotateOriginY = viewRect.y + viewRect.height;
            matrix.translate(m, m, [-rotateOriginX, -rotateOriginY]);
            matrix.rotate(m, m, -PI / 2);
            matrix.translate(m, m, [rotateOriginX, rotateOriginY]);
            viewRect = viewRect.clone();
            viewRect.applyTransform(m);
        }

        var viewBound = getBound(viewRect);
        var mainBound = getBound(mainGroup.getBoundingRect());
        var labelBound = getBound(labelGroup.getBoundingRect());

        var mainPosition = mainGroup.position;
        var labelsPosition = labelGroup.position;

        labelsPosition[0] = mainPosition[0] = viewBound[0][0];

        var labelPosOpt = layoutInfo.labelPosOpt;

        if (isNaN(labelPosOpt)) { // '+' or '-'
            var mainBoundIdx = labelPosOpt === '+' ? 0 : 1;
            toBound(mainPosition, mainBound, viewBound, 1, mainBoundIdx);
            toBound(labelsPosition, labelBound, viewBound, 1, 1 - mainBoundIdx);
        }
        else {
            var mainBoundIdx = labelPosOpt >= 0 ? 0 : 1;
            toBound(mainPosition, mainBound, viewBound, 1, mainBoundIdx);
            labelsPosition[1] = mainPosition[1] + labelPosOpt;
        }

        mainGroup.attr('position', mainPosition);
        labelGroup.attr('position', labelsPosition);
        mainGroup.rotation = labelGroup.rotation = layoutInfo.rotation;

        setOrigin(mainGroup);
        setOrigin(labelGroup);

        function setOrigin(targetGroup) {
            var pos = targetGroup.position;
            targetGroup.origin = [
                viewBound[0][0] - pos[0],
                viewBound[1][0] - pos[1]
            ];
        }

        function getBound(rect) {
            // [[xmin, xmax], [ymin, ymax]]
            return [
                [rect.x, rect.x + rect.width],
                [rect.y, rect.y + rect.height]
            ];
        }

        function toBound(fromPos, from, to, dimIdx, boundIdx) {
            fromPos[dimIdx] += to[dimIdx][boundIdx] - from[dimIdx][boundIdx];
        }
    },

    _createAxis: function (layoutInfo, timelineModel) {
        var data = timelineModel.getData();
        var axisType = timelineModel.get('axisType');

        var scale = axisHelper.createScaleByModel(timelineModel, axisType);
        var dataExtent = data.getDataExtent('value');
        scale.setExtent(dataExtent[0], dataExtent[1]);
        this._customizeScale(scale, data);
        scale.niceTicks();

        var axis = new TimelineAxis('value', scale, layoutInfo.axisExtent, axisType);
        axis.model = timelineModel;

        return axis;
    },

    _customizeScale: function (scale, data) {

        scale.getTicks = function () {
            return data.mapArray(['value'], function (value) {
                return value;
            });
        };

        scale.getTicksLabels = function () {
            return zrUtil.map(this.getTicks(), scale.getLabel, scale);
        };
    },

    _createGroup: function (name) {
        var newGroup = this['_' + name] = new graphic.Group();
        this.group.add(newGroup);
        return newGroup;
    },

    _renderAxisLine: function (layoutInfo, group, axis, timelineModel) {
        var axisExtent = axis.getExtent();

        if (!timelineModel.get('lineStyle.show')) {
            return;
        }

        group.add(new graphic.Line({
            shape: {
                x1: axisExtent[0], y1: 0,
                x2: axisExtent[1], y2: 0
            },
            style: zrUtil.extend(
                {lineCap: 'round'},
                timelineModel.getModel('lineStyle').getLineStyle()
            ),
            silent: true,
            z2: 1
        }));
    },

    /**
     * @private
     */
    _renderAxisTick: function (layoutInfo, group, axis, timelineModel) {
        var data = timelineModel.getData();
        var ticks = axis.scale.getTicks();

        each(ticks, function (value, dataIndex) {

            var tickCoord = axis.dataToCoord(value);
            var itemModel = data.getItemModel(dataIndex);
            var itemStyleModel = itemModel.getModel('itemStyle');
            var hoverStyleModel = itemModel.getModel('emphasis.itemStyle');
            var symbolOpt = {
                position: [tickCoord, 0],
                onclick: bind(this._changeTimeline, this, dataIndex)
            };
            var el = giveSymbol(itemModel, itemStyleModel, group, symbolOpt);
            graphic.setHoverStyle(el, hoverStyleModel.getItemStyle());

            if (itemModel.get('tooltip')) {
                el.dataIndex = dataIndex;
                el.dataModel = timelineModel;
            }
            else {
                el.dataIndex = el.dataModel = null;
            }

        }, this);
    },

    /**
     * @private
     */
    _renderAxisLabel: function (layoutInfo, group, axis, timelineModel) {
        var labelModel = timelineModel.getModel('label');

        if (!labelModel.get('show')) {
            return;
        }

        var data = timelineModel.getData();
        var ticks = axis.scale.getTicks();
        var labels = axisHelper.getFormattedLabels(
            axis, labelModel.get('formatter')
        );
        var labelInterval = axis.getLabelInterval();

        each(ticks, function (tick, dataIndex) {
            if (axis.isLabelIgnored(dataIndex, labelInterval)) {
                return;
            }

            var itemModel = data.getItemModel(dataIndex);
            var normalLabelModel = itemModel.getModel('label');
            var hoverLabelModel = itemModel.getModel('emphasis.label');
            var tickCoord = axis.dataToCoord(tick);
            var textEl = new graphic.Text({
                position: [tickCoord, 0],
                rotation: layoutInfo.labelRotation - layoutInfo.rotation,
                onclick: bind(this._changeTimeline, this, dataIndex),
                silent: false
            });
            graphic.setTextStyle(textEl.style, normalLabelModel, {
                text: labels[dataIndex],
                textAlign: layoutInfo.labelAlign,
                textVerticalAlign: layoutInfo.labelBaseline
            });

            group.add(textEl);
            graphic.setHoverStyle(
                textEl, graphic.setTextStyle({}, hoverLabelModel)
            );

        }, this);
    },

    /**
     * @private
     */
    _renderControl: function (layoutInfo, group, axis, timelineModel) {
        var controlSize = layoutInfo.controlSize;
        var rotation = layoutInfo.rotation;

        var itemStyle = timelineModel.getModel('controlStyle').getItemStyle();
        var hoverStyle = timelineModel.getModel('emphasis.controlStyle').getItemStyle();
        var rect = [0, -controlSize / 2, controlSize, controlSize];
        var playState = timelineModel.getPlayState();
        var inverse = timelineModel.get('inverse', true);

        makeBtn(
            layoutInfo.nextBtnPosition,
            'controlStyle.nextIcon',
            bind(this._changeTimeline, this, inverse ? '-' : '+')
        );
        makeBtn(
            layoutInfo.prevBtnPosition,
            'controlStyle.prevIcon',
            bind(this._changeTimeline, this, inverse ? '+' : '-')
        );
        makeBtn(
            layoutInfo.playPosition,
            'controlStyle.' + (playState ? 'stopIcon' : 'playIcon'),
            bind(this._handlePlayClick, this, !playState),
            true
        );

        function makeBtn(position, iconPath, onclick, willRotate) {
            if (!position) {
                return;
            }
            var opt = {
                position: position,
                origin: [controlSize / 2, 0],
                rotation: willRotate ? -rotation : 0,
                rectHover: true,
                style: itemStyle,
                onclick: onclick
            };
            var btn = makeIcon(timelineModel, iconPath, rect, opt);
            group.add(btn);
            graphic.setHoverStyle(btn, hoverStyle);
        }
    },

    _renderCurrentPointer: function (layoutInfo, group, axis, timelineModel) {
        var data = timelineModel.getData();
        var currentIndex = timelineModel.getCurrentIndex();
        var pointerModel = data.getItemModel(currentIndex).getModel('checkpointStyle');
        var me = this;

        var callback = {
            onCreate: function (pointer) {
                pointer.draggable = true;
                pointer.drift = bind(me._handlePointerDrag, me);
                pointer.ondragend = bind(me._handlePointerDragend, me);
                pointerMoveTo(pointer, currentIndex, axis, timelineModel, true);
            },
            onUpdate: function (pointer) {
                pointerMoveTo(pointer, currentIndex, axis, timelineModel);
            }
        };

        // Reuse when exists, for animation and drag.
        this._currentPointer = giveSymbol(
            pointerModel, pointerModel, this._mainGroup, {}, this._currentPointer, callback
        );
    },

    _handlePlayClick: function (nextState) {
        this._clearTimer();
        this.api.dispatchAction({
            type: 'timelinePlayChange',
            playState: nextState,
            from: this.uid
        });
    },

    _handlePointerDrag: function (dx, dy, e) {
        this._clearTimer();
        this._pointerChangeTimeline([e.offsetX, e.offsetY]);
    },

    _handlePointerDragend: function (e) {
        this._pointerChangeTimeline([e.offsetX, e.offsetY], true);
    },

    _pointerChangeTimeline: function (mousePos, trigger) {
        var toCoord = this._toAxisCoord(mousePos)[0];

        var axis = this._axis;
        var axisExtent = numberUtil.asc(axis.getExtent().slice());

        toCoord > axisExtent[1] && (toCoord = axisExtent[1]);
        toCoord < axisExtent[0] && (toCoord = axisExtent[0]);

        this._currentPointer.position[0] = toCoord;
        this._currentPointer.dirty();

        var targetDataIndex = this._findNearestTick(toCoord);
        var timelineModel = this.model;

        if (trigger || (
            targetDataIndex !== timelineModel.getCurrentIndex()
            && timelineModel.get('realtime')
        )) {
            this._changeTimeline(targetDataIndex);
        }
    },

    _doPlayStop: function () {
        this._clearTimer();

        if (this.model.getPlayState()) {
            this._timer = setTimeout(
                bind(handleFrame, this),
                this.model.get('playInterval')
            );
        }

        function handleFrame() {
            // Do not cache
            var timelineModel = this.model;
            this._changeTimeline(
                timelineModel.getCurrentIndex()
                + (timelineModel.get('rewind', true) ? -1 : 1)
            );
        }
    },

    _toAxisCoord: function (vertex) {
        var trans = this._mainGroup.getLocalTransform();
        return graphic.applyTransform(vertex, trans, true);
    },

    _findNearestTick: function (axisCoord) {
        var data = this.model.getData();
        var dist = Infinity;
        var targetDataIndex;
        var axis = this._axis;

        data.each(['value'], function (value, dataIndex) {
            var coord = axis.dataToCoord(value);
            var d = Math.abs(coord - axisCoord);
            if (d < dist) {
                dist = d;
                targetDataIndex = dataIndex;
            }
        });

        return targetDataIndex;
    },

    _clearTimer: function () {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    },

    _changeTimeline: function (nextIndex) {
        var currentIndex = this.model.getCurrentIndex();

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
        });
    }

});

function getViewRect(model, api) {
    return layout.getLayoutRect(
        model.getBoxLayoutParams(),
        {
            width: api.getWidth(),
            height: api.getHeight()
        },
        model.get('padding')
    );
}

function makeIcon(timelineModel, objPath, rect, opts) {
    var icon = graphic.makePath(
        timelineModel.get(objPath).replace(/^path:\/\//, ''),
        zrUtil.clone(opts || {}),
        new BoundingRect(rect[0], rect[1], rect[2], rect[3]),
        'center'
    );

    return icon;
}

/**
 * Create symbol or update symbol
 * opt: basic position and event handlers
 */
function giveSymbol(hostModel, itemStyleModel, group, opt, symbol, callback) {
    var color = itemStyleModel.get('color');

    if (!symbol) {
        var symbolType = hostModel.get('symbol');
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
    var itemStyle = itemStyleModel.getItemStyle(['color', 'symbol', 'symbolSize']);
    symbol.setStyle(itemStyle);

    // Transform and events.
    opt = zrUtil.merge({
        rectHover: true,
        z2: 100
    }, opt, true);

    var symbolSize = hostModel.get('symbolSize');
    symbolSize = symbolSize instanceof Array
        ? symbolSize.slice()
        : [+symbolSize, +symbolSize];
    symbolSize[0] /= 2;
    symbolSize[1] /= 2;
    opt.scale = symbolSize;

    var symbolOffset = hostModel.get('symbolOffset');
    if (symbolOffset) {
        var pos = opt.position = opt.position || [0, 0];
        pos[0] += numberUtil.parsePercent(symbolOffset[0], symbolSize[0]);
        pos[1] += numberUtil.parsePercent(symbolOffset[1], symbolSize[1]);
    }

    var symbolRotate = hostModel.get('symbolRotate');
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

function pointerMoveTo(pointer, dataIndex, axis, timelineModel, noAnimation) {
    if (pointer.dragging) {
        return;
    }

    var pointerModel = timelineModel.getModel('checkpointStyle');
    var toCoord = axis.dataToCoord(timelineModel.getData().get(['value'], dataIndex));

    if (noAnimation || !pointerModel.get('animation', true)) {
        pointer.attr({position: [toCoord, 0]});
    }
    else {
        pointer.stopAnimation(true);
        pointer.animateTo(
            {position: [toCoord, 0]},
            pointerModel.get('animationDuration', true),
            pointerModel.get('animationEasing', true)
        );
    }
}
