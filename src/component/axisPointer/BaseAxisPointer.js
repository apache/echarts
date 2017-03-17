define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var clazzUtil = require('../../util/clazz');
    var graphic = require('../../util/graphic');
    var get = require('../../util/model').makeGetter();
    var axisPointerModelHelper = require('./modelHelper');

    var extend = zrUtil.extend;
    var clone = zrUtil.clone;

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
            this.makeElOption(elOption, value, axisModel, axisPointerModel);

            // Enable change axis pointer type.
            var graphicKey = elOption.graphicKey;
            if (graphicKey !== this._lastGraphicKey) {
                this.clear(api);
            }
            this._lastGraphicKey = graphicKey;

            var moveAnimation = this.determineAnimation(axisModel, axisPointerModel);

            if (!group) {
                group = this._group = new graphic.Group();
                this.createEl(group, elOption, axisModel, axisPointerModel);
                api.getZr().add(group);
            }
            else {
                this.updateEl(group, moveAnimation, elOption, axisModel, axisPointerModel);
            }

            this._renderHandle(value, moveAnimation, axisModel, axisPointerModel, api);
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

            if (animation === 'auto' || animation == null) {
                var axis = axisModel.axis;

                var animationThreshold = this.animationThreshold;
                if (axis.type === 'category' && axis.getBandWidth() > animationThreshold) {
                    return true;
                }

                // It is important to auto animation when snap used. Consider if there is
                // a dataZoom, animation will be disabled when too many points exist, while
                // it will be enabled for better visual effect when little points exist.
                if (axisPointerModel.get('snap')) {
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
        makeElOption: function (elOption, value, axisModel, axisPointerModel) {
            // Shoule be implemenented by sub-class.
        },

        /**
         * @protected
         */
        createEl: function (group, elOption, axisModel, axisPointerModel) {
            var basicOpt = {
                z: axisPointerModel.get('z'),
                zlevel: axisPointerModel.get('zlevel'),
                silent: true
            };

            this.createPointerEl(group, elOption, basicOpt, axisModel, axisPointerModel);
            this.createLabelEl(group, elOption, basicOpt, axisModel, axisPointerModel);
        },

        /**
         * @protected
         */
        createPointerEl: function (group, elOption, basicOpt, axisModel, axisPointerModel) {
            var pointerOption = elOption.pointer;
            var pointerEl = get(group).pointerEl = new graphic[pointerOption.type](
                extend(clone(basicOpt), elOption.pointer)
            );
            group.add(pointerEl);
        },

        /**
         * @protected
         */
        createLabelEl: function (group, elOption, basicOpt, axisModel, axisPointerModel) {
            var labelEl = get(group).labelEl = new graphic.Rect(
                extend(clone(basicOpt), elOption.label)
            );
            group.add(labelEl);
            updateLabelShowHide(labelEl, axisPointerModel);
        },

        /**
         * @protected
         */
        updateEl: function (group, moveAnimation, elOption, axisModel, axisPointerModel) {
            if (!group) {
                return;
            }

            var doUpdateProps = zrUtil.curry(updateProps, axisPointerModel, moveAnimation);
            this.updatePointerEl(group, elOption, doUpdateProps, axisPointerModel);
            this.updateLabelEl(group, elOption, doUpdateProps, axisPointerModel);
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
                labelEl.attr('shape', elOption.label.shape);
                updateProps(labelEl, {
                    position: elOption.label.position
                });

                updateLabelShowHide(labelEl, axisPointerModel);
            }
        },

        /**
         * @private
         */
        _renderHandle: function (value, moveAnimation, axisModel, axisPointerModel, api) {
            if (this._dragging) {
                return;
            }

            var zr = api.getZr();
            var handle = this._handle;
            var handleModel = axisPointerModel.getModel('handle');

            var status = axisPointerModel.get('status');
            if (axisPointerModel.get('triggerOn') !== 'handle' || !status || status === 'hide') {
                handle && zr.remove(handle);
                this._handle = null;
                return;
            }

            var isInit;
            if (!this._handle) {
                isInit = true;
                var iconStr = handleModel.get('icon');
                handle = this._handle = graphic.makePath(iconStr, {
                    style: {
                        strokeNoScale: true
                    },
                    rectHover: true,
                    cursor: 'move',
                    draggable: true,
                    drift: zrUtil.bind(
                        this._onHandleDragMove, this, axisModel, axisPointerModel, api
                    ),
                    ondragend: zrUtil.bind(
                        this._onHandleDragEnd, this, axisModel, axisPointerModel, moveAnimation
                    )
                }, {
                    x: -1, y: -1, width: 2, height: 2
                }, 'center');
                zr.add(handle);
            }

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

            // handle margin is from symbol center to axis,
            // which is stable when circular move.

            this._moveHandleToValue(handle, value, moveAnimation, axisModel, axisPointerModel, isInit);
        },

        /**
         * @private
         */
        _moveHandleToValue: function (handle, value, moveAnimation, axisModel, axisPointerModel, isInit) {
            var trans = this.getHandleTransform(value, axisModel, axisPointerModel);
            var valueProps = {
                position: trans.position.slice(),
                rotation: trans.rotation || 0
            };

            updateProps(axisPointerModel, !isInit && moveAnimation, handle, valueProps);
        },

        /**
         * @private
         */
        _onHandleDragMove: function (axisModel, axisPointerModel, api, dx, dy) {
            var handle = this._handle;
            if (!handle) {
                return;
            }

            this._dragging = true;

            handle.stopAnimation();

            var trans = this.updateHandleTransform(
                {position: handle.position.slice(), rotation: handle.rotation},
                [dx, dy],
                axisModel,
                axisPointerModel
            );

            handle.attr({
                position: trans.position,
                rotation: trans.rotation || 0
            });
            get(handle).lastProp = null;

            var payload = {
                type: 'updateAxisPointer',
                currTrigger: 'handle',
                x: trans.cursorPoint[0],
                y: trans.cursorPoint[1],
                tooltipOption: {
                    verticalAlign: 'middle'
                },
                highDownKey: 'axisPointerHandle'
            };
            var axis = axisModel.axis;
            payload[axis.dim + 'AxisId'] = axisModel.id;
            api.dispatchAction(payload);
        },

        /**
         * @private
         */
        _onHandleDragEnd: function (axisModel, axisPointerModel, moveAnimation) {
            this._dragging = false;
            var handle = this._handle;
            if (!handle) {
                return;
            }

            var value = axisPointerModel.get('value');
            // Consider snap or categroy axis, handle may be not consistent with
            // axisPointer. So move handle to align the exact value position when
            // drag ended.
            this._moveHandleToValue(handle, value, moveAnimation, axisModel, axisPointerModel);
        },

        /**
         * @protected
         * @param {number} value
         * @param {module:echarts/model/Model} axisModel
         * @param {module:echarts/model/Model} axisPointerModel
         * @return {Object} {position: [x, y], rotation: 0}
         */
        getHandleTransform: function () {
            // Should be implemenented by sub-class.
        },

        /**
         * @protected
         * @param {Object} transform {position, rotation}
         * @param {Array.<number>} delta [dx, dy]
         * @param {module:echarts/model/Model} axisModel
         * @param {module:echarts/model/Model} axisPointerModel
         * @return {Object} {position: [x, y], rotation: 0, cursorPoint: [x, y]}
         */
        updateHandleTransform: function () {
            // Should be implemenented by sub-class.
        },

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
                equals &= propsEqual(lastProps[key], item);
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

    clazzUtil.enableClassExtend(BaseAxisPointer);

    return BaseAxisPointer;
});