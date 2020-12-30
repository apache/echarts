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
import * as graphic from '../../util/graphic';
import * as axisPointerModelHelper from './modelHelper';
import * as eventTool from 'zrender/src/core/event';
import * as throttleUtil from '../../util/throttle';
import {makeInner} from '../../util/model';
import { AxisPointer } from './AxisPointer';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import ExtensionAPI from '../../core/ExtensionAPI';
import Displayable, { DisplayableProps } from 'zrender/src/graphic/Displayable';
import Element from 'zrender/src/Element';
import { VerticalAlign, HorizontalAlign, CommonAxisPointerOption } from '../../util/types';
import { PathProps } from 'zrender/src/graphic/Path';
import Model from '../../model/Model';
import { TextProps } from 'zrender/src/graphic/Text';

const inner = makeInner<{
    lastProp?: DisplayableProps
    labelEl?: graphic.Text
    pointerEl?: Displayable
}, Element>();
const clone = zrUtil.clone;
const bind = zrUtil.bind;

type Icon = ReturnType<typeof graphic.createIcon>;
interface Transform {
    x: number,
    y: number,
    rotation: number
}

type AxisValue = CommonAxisPointerOption['value'];

// Not use top level axisPointer model
type AxisPointerModel = Model<CommonAxisPointerOption>;

interface BaseAxisPointer {

    /**
     * Should be implemenented by sub-class if support `handle`.
     */
    getHandleTransform(value: AxisValue, axisModel: AxisBaseModel, axisPointerModel: AxisPointerModel): Transform

    /**
     * * Should be implemenented by sub-class if support `handle`.
     */
    updateHandleTransform(
        transform: Transform,
        delta: number[],
        axisModel: AxisBaseModel,
        axisPointerModel: AxisPointerModel
    ): Transform & {
        cursorPoint: number[]
        tooltipOption?: {
            verticalAlign?: VerticalAlign
            align?: HorizontalAlign
        }
    }

}

export interface AxisPointerElementOptions {
    graphicKey: string

    pointer: PathProps & {
        type: 'Line' | 'Rect' | 'Circle' | 'Sector'
    }

    label: TextProps
}
/**
 * Base axis pointer class in 2D.
 */
class BaseAxisPointer implements AxisPointer {

    private _group: graphic.Group;

    private _lastGraphicKey: string;

    private _handle: Icon;

    private _dragging = false;

    private _lastValue: AxisValue;

    private _lastStatus: CommonAxisPointerOption['status'];

    private _payloadInfo: ReturnType<BaseAxisPointer['updateHandleTransform']>;

    /**
     * If have transition animation
     */
    private _moveAnimation: boolean;

    private _axisModel: AxisBaseModel;
    private _axisPointerModel: AxisPointerModel;
    private _api: ExtensionAPI;

    /**
     * In px, arbitrary value. Do not set too small,
     * no animation is ok for most cases.
     */
    protected animationThreshold = 15;

    /**
     * @implement
     */
    render(axisModel: AxisBaseModel, axisPointerModel: AxisPointerModel, api: ExtensionAPI, forceRender?: boolean) {
        const value = axisPointerModel.get('value');
        const status = axisPointerModel.get('status');

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

        let group = this._group;
        const handle = this._handle;

        if (!status || status === 'hide') {
            // Do not clear here, for animation better.
            group && group.hide();
            handle && handle.hide();
            return;
        }
        group && group.show();
        handle && handle.show();

        // Otherwise status is 'show'
        const elOption = {} as AxisPointerElementOptions;
        this.makeElOption(elOption, value, axisModel, axisPointerModel, api);

        // Enable change axis pointer type.
        const graphicKey = elOption.graphicKey;
        if (graphicKey !== this._lastGraphicKey) {
            this.clear(api);
        }
        this._lastGraphicKey = graphicKey;

        const moveAnimation = this._moveAnimation =
            this.determineAnimation(axisModel, axisPointerModel);

        if (!group) {
            group = this._group = new graphic.Group();
            this.createPointerEl(group, elOption, axisModel, axisPointerModel);
            this.createLabelEl(group, elOption, axisModel, axisPointerModel);
            api.getZr().add(group);
        }
        else {
            const doUpdateProps = zrUtil.curry(updateProps, axisPointerModel, moveAnimation);
            this.updatePointerEl(group, elOption, doUpdateProps);
            this.updateLabelEl(group, elOption, doUpdateProps, axisPointerModel);
        }

        updateMandatoryProps(group, axisPointerModel, true);

        this._renderHandle(value);
    }

    /**
     * @implement
     */
    remove(api: ExtensionAPI) {
        this.clear(api);
    }

    /**
     * @implement
     */
    dispose(api: ExtensionAPI) {
        this.clear(api);
    }

    /**
     * @protected
     */
    determineAnimation(axisModel: AxisBaseModel, axisPointerModel: AxisPointerModel): boolean {
        const animation = axisPointerModel.get('animation');
        const axis = axisModel.axis;
        const isCategoryAxis = axis.type === 'category';
        const useSnap = axisPointerModel.get('snap');

        // Value axis without snap always do not snap.
        if (!useSnap && !isCategoryAxis) {
            return false;
        }

        if (animation === 'auto' || animation == null) {
            const animationThreshold = this.animationThreshold;
            if (isCategoryAxis && axis.getBandWidth() > animationThreshold) {
                return true;
            }

            // It is important to auto animation when snap used. Consider if there is
            // a dataZoom, animation will be disabled when too many points exist, while
            // it will be enabled for better visual effect when little points exist.
            if (useSnap) {
                const seriesDataCount = axisPointerModelHelper.getAxisInfo(axisModel).seriesDataCount;
                const axisExtent = axis.getExtent();
                // Approximate band width
                return Math.abs(axisExtent[0] - axisExtent[1]) / seriesDataCount > animationThreshold;
            }

            return false;
        }

        return animation === true;
    }

    /**
     * add {pointer, label, graphicKey} to elOption
     * @protected
     */
    makeElOption(
        elOption: AxisPointerElementOptions,
        value: AxisValue,
        axisModel: AxisBaseModel,
        axisPointerModel: AxisPointerModel,
        api: ExtensionAPI
    ) {
        // Shoule be implemenented by sub-class.
    }

    /**
     * @protected
     */
    createPointerEl(
        group: graphic.Group,
        elOption: AxisPointerElementOptions,
        axisModel: AxisBaseModel,
        axisPointerModel: AxisPointerModel
    ) {
        const pointerOption = elOption.pointer;
        if (pointerOption) {
            const pointerEl = inner(group).pointerEl = new graphic[pointerOption.type](
                clone(elOption.pointer)
            );
            group.add(pointerEl);
        }
    }

    /**
     * @protected
     */
    createLabelEl(
        group: graphic.Group,
        elOption: AxisPointerElementOptions,
        axisModel: AxisBaseModel,
        axisPointerModel: AxisPointerModel
    ) {
        if (elOption.label) {
            const labelEl = inner(group).labelEl = new graphic.Text(
                clone(elOption.label)
            );

            group.add(labelEl);
            updateLabelShowHide(labelEl, axisPointerModel);
        }
    }

    /**
     * @protected
     */
    updatePointerEl(
        group: graphic.Group,
        elOption: AxisPointerElementOptions,
        updateProps: (el: Element, props: PathProps) => void
    ) {
        const pointerEl = inner(group).pointerEl;
        if (pointerEl && elOption.pointer) {
            pointerEl.setStyle(elOption.pointer.style);
            updateProps(pointerEl, {shape: elOption.pointer.shape});
        }
    }

    /**
     * @protected
     */
    updateLabelEl(
        group: graphic.Group,
        elOption: AxisPointerElementOptions,
        updateProps: (el: Element, props: PathProps) => void,
        axisPointerModel: AxisPointerModel
    ) {
        const labelEl = inner(group).labelEl;
        if (labelEl) {
            labelEl.setStyle(elOption.label.style);
            updateProps(labelEl, {
                // Consider text length change in vertical axis, animation should
                // be used on shape, otherwise the effect will be weird.
                // TODOTODO
                // shape: elOption.label.shape,
                x: elOption.label.x,
                y: elOption.label.y
            });

            updateLabelShowHide(labelEl, axisPointerModel);
        }
    }

    /**
     * @private
     */
    _renderHandle(value: AxisValue) {
        if (this._dragging || !this.updateHandleTransform) {
            return;
        }

        const axisPointerModel = this._axisPointerModel;
        const zr = this._api.getZr();
        let handle = this._handle;
        const handleModel = axisPointerModel.getModel('handle');

        const status = axisPointerModel.get('status');
        if (!handleModel.get('show') || !status || status === 'hide') {
            handle && zr.remove(handle);
            this._handle = null;
            return;
        }

        let isInit;
        if (!this._handle) {
            isInit = true;
            handle = this._handle = graphic.createIcon(
                handleModel.get('icon'),
                {
                    cursor: 'move',
                    draggable: true,
                    onmousemove(e) {
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
        (handle as graphic.Path).setStyle(handleModel.getItemStyle(null, [
            'color', 'borderColor', 'borderWidth', 'opacity',
            'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'
        ]));

        // update position
        let handleSize = handleModel.get('size');
        if (!zrUtil.isArray(handleSize)) {
            handleSize = [handleSize, handleSize];
        }
        handle.scaleX = handleSize[0] / 2;
        handle.scaleY = handleSize[1] / 2;

        throttleUtil.createOrUpdate(
            this,
            '_doDispatchAxisPointer',
            handleModel.get('throttle') || 0,
            'fixRate'
        );

        this._moveHandleToValue(value, isInit);
    }

    private _moveHandleToValue(value: AxisValue, isInit?: boolean) {
        updateProps(
            this._axisPointerModel,
            !isInit && this._moveAnimation,
            this._handle,
            getHandleTransProps(this.getHandleTransform(
                value, this._axisModel, this._axisPointerModel
            ))
        );
    }

    private _onHandleDragMove(dx: number, dy: number) {
        const handle = this._handle;
        if (!handle) {
            return;
        }

        this._dragging = true;

        // Persistent for throttle.
        const trans = this.updateHandleTransform(
            getHandleTransProps(handle),
            [dx, dy],
            this._axisModel,
            this._axisPointerModel
        );
        this._payloadInfo = trans;

        handle.stopAnimation();
        (handle as graphic.Path).attr(getHandleTransProps(trans));
        inner(handle).lastProp = null;

        this._doDispatchAxisPointer();
    }

    /**
     * Throttled method.
     */
    _doDispatchAxisPointer() {
        const handle = this._handle;
        if (!handle) {
            return;
        }

        const payloadInfo = this._payloadInfo;
        const axisModel = this._axisModel;
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
    }

    private _onHandleDragEnd() {
        this._dragging = false;
        const handle = this._handle;
        if (!handle) {
            return;
        }

        const value = this._axisPointerModel.get('value');
        // Consider snap or categroy axis, handle may be not consistent with
        // axisPointer. So move handle to align the exact value position when
        // drag ended.
        this._moveHandleToValue(value);

        // For the effect: tooltip will be shown when finger holding on handle
        // button, and will be hidden after finger left handle button.
        this._api.dispatchAction({
            type: 'hideTip'
        });
    }

    /**
     * @private
     */
    clear(api: ExtensionAPI) {
        this._lastValue = null;
        this._lastStatus = null;

        const zr = api.getZr();
        const group = this._group;
        const handle = this._handle;
        if (zr && group) {
            this._lastGraphicKey = null;
            group && zr.remove(group);
            handle && zr.remove(handle);
            this._group = null;
            this._handle = null;
            this._payloadInfo = null;
        }
    }

    /**
     * @protected
     */
    doClear() {
        // Implemented by sub-class if necessary.
    }

    buildLabel(xy: number[], wh: number[], xDimIndex: 0 | 1) {
        xDimIndex = xDimIndex || 0;
        return {
            x: xy[xDimIndex],
            y: xy[1 - xDimIndex],
            width: wh[xDimIndex],
            height: wh[1 - xDimIndex]
        };
    }
}


function updateProps(
    animationModel: AxisPointerModel,
    moveAnimation: boolean,
    el: Element,
    props: DisplayableProps
) {
    // Animation optimize.
    if (!propsEqual(inner(el).lastProp, props)) {
        inner(el).lastProp = props;
        moveAnimation
            ? graphic.updateProps(el, props, animationModel as Model<
                // Ignore animation property
                Pick<CommonAxisPointerOption, 'animationDurationUpdate' | 'animationEasingUpdate'>
            >)
            : (el.stopAnimation(), el.attr(props));
    }
}

function propsEqual(lastProps: any, newProps: any) {
    if (zrUtil.isObject(lastProps) && zrUtil.isObject(newProps)) {
        let equals = true;
        zrUtil.each(newProps, function (item, key) {
            equals = equals && propsEqual(lastProps[key], item);
        });
        return !!equals;
    }
    else {
        return lastProps === newProps;
    }
}

function updateLabelShowHide(labelEl: Element, axisPointerModel: AxisPointerModel) {
    labelEl[axisPointerModel.get(['label', 'show']) ? 'show' : 'hide']();
}

function getHandleTransProps(trans: Transform): Transform {
    return {
        x: trans.x || 0,
        y: trans.y || 0,
        rotation: trans.rotation || 0
    };
}

function updateMandatoryProps(
    group: Element,
    axisPointerModel: AxisPointerModel,
    silent?: boolean
) {
    const z = axisPointerModel.get('z');
    const zlevel = axisPointerModel.get('zlevel');

    group && group.traverse(function (el: Displayable) {
        if (el.type !== 'group') {
            z != null && (el.z = z);
            zlevel != null && (el.zlevel = zlevel);
            el.silent = silent;
        }
    });
}

export default BaseAxisPointer;