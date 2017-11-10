import * as zrUtil from 'zrender/src/core/util';
import * as clazzUtil from '../../util/clazz';
import * as graphic from '../../util/graphic';
import * as axisPointerModelHelper from './modelHelper';
import * as eventTool from 'zrender/src/core/event';
import * as throttleUtil from '../../util/throttle';
import * as modelUtil from '../../util/model';

var get = modelUtil.makeGetter();
var clone = zrUtil.clone;
var bind = zrUtil.bind;

/**
 * Base axis pointer class in 2D.
 * Implemenents {module:echarts/component/axis/IAxisPointer}.
 */
function BaseAxisPointer () {
}

BaseAxisPointer.prototype = {

    /**
     * @private
     */
    _group: null,

    /**
     * @private
     */
    _lastGraphicKey: null,

    /**
     * @private
     */
    _handle: null,

    /**
     * @private
     */
    _dragging: false,

    /**
     * @private
     */
    _lastValue: null,

    /**
     * @private
     */
    _lastStatus: null,

    /**
     * @private
     */
    _payloadInfo: null,

    /**
     * In px, arbitrary value. Do not set too small,
     * no animation is ok for most cases.
     * @protected
     */
    animationThreshold: 15,

    /**
     * @implement
     */
    render: function (axisModel, axisPointerModel, api, forceRender) {
        var value = axisPointerModel.get('value');
        var status = axisPointerModel.get('status');

        // Bind them to `this`, not in closure, otherwise they will not
        // be replaced when user calling setOption in not merge mode.
        this._axisModel = axisModel;
        this._axisPointerModel = axisPointerModel;
        this._api = api;

        // Optimize: `render` will be called repeatly during mouse move.
        // So it is power consuming if performing `render` each time,
        // especially on mobile device.
        if (!forceRender
            && this._lastValue === value
            && this._lastStatus === status
        ) {
            return;
        }
        this._lastValue = value;
        this._lastStatus = status;

        var group = this._group;
        var handle = this._handle;

        if (!status || status === 'hide') {
            // Do not clear here, for animation better.
            group && group.hide();
            handle && handle.hide();
            return;
        }
        group && group.show();
        handle && handle.show();

        // Otherwise status is 'show'
        var elOption = {};
        this.makeElOption(elOption, value, axisModel, axisPointerModel, api);

        // Enable change axis pointer type.
        var graphicKey = elOption.graphicKey;
        if (graphicKey !== this._lastGraphicKey) {
            this.clear(api);
        }
        this._lastGraphicKey = graphicKey;

        var moveAnimation = this._moveAnimation =
            this.determineAnimation(axisModel, axisPointerModel);

        if (!group) {
            group = this._group = new graphic.Group();
            this.createPointerEl(group, elOption, axisModel, axisPointerModel);
            this.createLabelEl(group, elOption, axisModel, axisPointerModel);
            api.getZr().add(group);
        }
        else {
            var doUpdateProps = zrUtil.curry(updateProps, axisPointerModel, moveAnimation);
            this.updatePointerEl(group, elOption, doUpdateProps, axisPointerModel);
            this.updateLabelEl(group, elOption, doUpdateProps, axisPointerModel);
        }

        updateMandatoryProps(group, axisPointerModel, true);

        this._renderHandle(value);
    },

    /**
     * @implement
     */
    remove: function (api) {
        this.clear(api);
    },

    /**
     * @implement
     */
    dispose: function (api) {
        this.clear(api);
    },

    /**
     * @protected
     */
    determineAnimation: function (axisModel, axisPointerModel) {
        var animation = axisPointerModel.get('animation');
        var axis = axisModel.axis;
        var isCategoryAxis = axis.type === 'category';
        var useSnap = axisPointerModel.get('snap');

        // Value axis without snap always do not snap.
        if (!useSnap && !isCategoryAxis) {
            return false;
        }

        if (animation === 'auto' || animation == null) {
            var animationThreshold = this.animationThreshold;
            if (isCategoryAxis && axis.getBandWidth() > animationThreshold) {
                return true;
            }

            // It is important to auto animation when snap used. Consider if there is
            // a dataZoom, animation will be disabled when too many points exist, while
            // it will be enabled for better visual effect when little points exist.
            if (useSnap) {
                var seriesDataCount = axisPointerModelHelper.getAxisInfo(axisModel).seriesDataCount;
                var axisExtent = axis.getExtent();
                // Approximate band width
                return Math.abs(axisExtent[0] - axisExtent[1]) / seriesDataCount > animationThreshold;
            }

            return false;
        }

        return animation === true;
    },

    /**
     * add {pointer, label, graphicKey} to elOption
     * @protected
     */
    makeElOption: function (elOption, value, axisModel, axisPointerModel, api) {
        // Shoule be implemenented by sub-class.
    },

    /**
     * @protected
     */
    createPointerEl: function (group, elOption, axisModel, axisPointerModel) {
        var pointerOption = elOption.pointer;
        if (pointerOption) {
            var pointerEl = get(group).pointerEl = new graphic[pointerOption.type](
                clone(elOption.pointer)
            );
            group.add(pointerEl);
        }
    },

    /**
     * @protected
     */
    createLabelEl: function (group, elOption, axisModel, axisPointerModel) {
        if (elOption.label) {
            var labelEl = get(group).labelEl = new graphic.Rect(
                clone(elOption.label)
            );

            group.add(labelEl);
            updateLabelShowHide(labelEl, axisPointerModel);
        }
    },

    /**
     * @protected
     */
    updatePointerEl: function (group, elOption, updateProps) {
        var pointerEl = get(group).pointerEl;
        if (pointerEl) {
            pointerEl.setStyle(elOption.pointer.style);
            updateProps(pointerEl, {shape: elOption.pointer.shape});
        }
    },

    /**
     * @protected
     */
    updateLabelEl: function (group, elOption, updateProps, axisPointerModel) {
        var labelEl = get(group).labelEl;
        if (labelEl) {
            labelEl.setStyle(elOption.label.style);
            updateProps(labelEl, {
                // Consider text length change in vertical axis, animation should
                // be used on shape, otherwise the effect will be weird.
                shape: elOption.label.shape,
                position: elOption.label.position
            });

            updateLabelShowHide(labelEl, axisPointerModel);
        }
    },

    /**
     * @private
     */
    _renderHandle: function (value) {
        if (this._dragging || !this.updateHandleTransform) {
            return;
        }

        var axisPointerModel = this._axisPointerModel;
        var zr = this._api.getZr();
        var handle = this._handle;
        var handleModel = axisPointerModel.getModel('handle');

        var status = axisPointerModel.get('status');
        if (!handleModel.get('show') || !status || status === 'hide') {
            handle && zr.remove(handle);
            this._handle = null;
            return;
        }

        var isInit;
        if (!this._handle) {
            isInit = true;
            handle = this._handle = graphic.createIcon(
                handleModel.get('icon'),
                {
                    cursor: 'move',
                    draggable: true,
                    onmousemove: function (e) {
                        // Fot mobile devicem, prevent screen slider on the button.
                        eventTool.stop(e.event);
                    },
                    onmousedown: bind(this._onHandleDragMove, this, 0, 0),
                    drift: bind(this._onHandleDragMove, this),
                    ondragend: bind(this._onHandleDragEnd, this)
                }
            );
            zr.add(handle);
        }

        updateMandatoryProps(handle, axisPointerModel, false);

        // update style
        var includeStyles = [
            'color', 'borderColor', 'borderWidth', 'opacity',
            'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'
        ];
        handle.setStyle(handleModel.getItemStyle(null, includeStyles));

        // update position
        var handleSize = handleModel.get('size');
        if (!zrUtil.isArray(handleSize)) {
            handleSize = [handleSize, handleSize];
        }
        handle.attr('scale', [handleSize[0] / 2, handleSize[1] / 2]);

        throttleUtil.createOrUpdate(
            this,
            '_doDispatchAxisPointer',
            handleModel.get('throttle') || 0,
            'fixRate'
        );

        this._moveHandleToValue(value, isInit);
    },

    /**
     * @private
     */
    _moveHandleToValue: function (value, isInit) {
        updateProps(
            this._axisPointerModel,
            !isInit && this._moveAnimation,
            this._handle,
            getHandleTransProps(this.getHandleTransform(
                value, this._axisModel, this._axisPointerModel
            ))
        );
    },

    /**
     * @private
     */
    _onHandleDragMove: function (dx, dy) {
        var handle = this._handle;
        if (!handle) {
            return;
        }

        this._dragging = true;

        // Persistent for throttle.
        var trans = this.updateHandleTransform(
            getHandleTransProps(handle),
            [dx, dy],
            this._axisModel,
            this._axisPointerModel
        );
        this._payloadInfo = trans;

        handle.stopAnimation();
        handle.attr(getHandleTransProps(trans));
        get(handle).lastProp = null;

        this._doDispatchAxisPointer();
    },

    /**
     * Throttled method.
     * @private
     */
    _doDispatchAxisPointer: function () {
        var handle = this._handle;
        if (!handle) {
            return;
        }

        var payloadInfo = this._payloadInfo;
        var axisModel = this._axisModel;
        this._api.dispatchAction({
            type: 'updateAxisPointer',
            x: payloadInfo.cursorPoint[0],
            y: payloadInfo.cursorPoint[1],
            tooltipOption: payloadInfo.tooltipOption,
            axesInfo: [{
                axisDim: axisModel.axis.dim,
                axisIndex: axisModel.componentIndex
            }]
        });
    },

    /**
     * @private
     */
    _onHandleDragEnd: function (moveAnimation) {
        this._dragging = false;
        var handle = this._handle;
        if (!handle) {
            return;
        }

        var value = this._axisPointerModel.get('value');
        // Consider snap or categroy axis, handle may be not consistent with
        // axisPointer. So move handle to align the exact value position when
        // drag ended.
        this._moveHandleToValue(value);

        // For the effect: tooltip will be shown when finger holding on handle
        // button, and will be hidden after finger left handle button.
        this._api.dispatchAction({
            type: 'hideTip'
        });
    },

    /**
     * Should be implemenented by sub-class if support `handle`.
     * @protected
     * @param {number} value
     * @param {module:echarts/model/Model} axisModel
     * @param {module:echarts/model/Model} axisPointerModel
     * @return {Object} {position: [x, y], rotation: 0}
     */
    getHandleTransform: null,

    /**
     * * Should be implemenented by sub-class if support `handle`.
     * @protected
     * @param {Object} transform {position, rotation}
     * @param {Array.<number>} delta [dx, dy]
     * @param {module:echarts/model/Model} axisModel
     * @param {module:echarts/model/Model} axisPointerModel
     * @return {Object} {position: [x, y], rotation: 0, cursorPoint: [x, y]}
     */
    updateHandleTransform: null,

    /**
     * @private
     */
    clear: function (api) {
        this._lastValue = null;
        this._lastStatus = null;

        var zr = api.getZr();
        var group = this._group;
        var handle = this._handle;
        if (zr && group) {
            this._lastGraphicKey = null;
            group && zr.remove(group);
            handle && zr.remove(handle);
            this._group = null;
            this._handle = null;
            this._payloadInfo = null;
        }
    },

    /**
     * @protected
     */
    doClear: function () {
        // Implemented by sub-class if necessary.
    },

    /**
     * @protected
     * @param {Array.<number>} xy
     * @param {Array.<number>} wh
     * @param {number} [xDimIndex=0] or 1
     */
    buildLabel: function (xy, wh, xDimIndex) {
        xDimIndex = xDimIndex || 0;
        return {
            x: xy[xDimIndex],
            y: xy[1 - xDimIndex],
            width: wh[xDimIndex],
            height: wh[1 - xDimIndex]
        };
    }
};

BaseAxisPointer.prototype.constructor = BaseAxisPointer;


function updateProps(animationModel, moveAnimation, el, props) {
    // Animation optimize.
    if (!propsEqual(get(el).lastProp, props)) {
        get(el).lastProp = props;
        moveAnimation
            ? graphic.updateProps(el, props, animationModel)
            : (el.stopAnimation(), el.attr(props));
    }
}

function propsEqual(lastProps, newProps) {
    if (zrUtil.isObject(lastProps) && zrUtil.isObject(newProps)) {
        var equals = true;
        zrUtil.each(newProps, function (item, key) {
            equals = equals && propsEqual(lastProps[key], item);
        });
        return !!equals;
    }
    else {
        return lastProps === newProps;
    }
}

function updateLabelShowHide(labelEl, axisPointerModel) {
    labelEl[axisPointerModel.get('label.show') ? 'show' : 'hide']();
}

function getHandleTransProps(trans) {
    return {
        position: trans.position.slice(),
        rotation: trans.rotation || 0
    };
}

function updateMandatoryProps(group, axisPointerModel, silent) {
    var z = axisPointerModel.get('z');
    var zlevel = axisPointerModel.get('zlevel');

    group && group.traverse(function (el) {
        if (el.type !== 'group') {
            z != null && (el.z = z);
            zlevel != null && (el.zlevel = zlevel);
            el.silent = silent;
        }
    });
}

clazzUtil.enableClassExtend(BaseAxisPointer);

export default BaseAxisPointer;