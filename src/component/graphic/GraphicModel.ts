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
import * as modelUtil from '../../util/model';
import {
    ComponentOption,
    BoxLayoutOptionMixin,
    Dictionary,
    ZRStyleProps,
    OptionId,
    CommonTooltipOption,
    AnimationOptionMixin,
    AnimationOption
} from '../../util/types';
import ComponentModel from '../../model/Component';
import Element, { ElementTextConfig } from 'zrender/src/Element';
import Displayable from 'zrender/src/graphic/Displayable';
import { PathProps, PathStyleProps } from 'zrender/src/graphic/Path';
import { ImageStyleProps, ImageProps } from 'zrender/src/graphic/Image';
import { TextStyleProps, TextProps } from 'zrender/src/graphic/Text';
import GlobalModel from '../../model/Global';
import { copyLayoutParams, mergeLayoutParam } from '../../util/layout';
import { TransitionOptionMixin } from '../../animation/customGraphicTransition';
import { ElementKeyframeAnimationOption } from '../../animation/customGraphicKeyframeAnimation';
import { GroupProps } from 'zrender/src/graphic/Group';
import { TransformProp } from 'zrender/src/core/Transformable';
import { ElementEventNameWithOn } from 'zrender/src/core/types';

interface GraphicComponentBaseElementOption extends
    Partial<Pick<
        Element, TransformProp |
        'silent' |
        'ignore' |
        'textConfig' |
        'draggable' |
        ElementEventNameWithOn
    >>,
    /**
     * left/right/top/bottom: (like 12, '22%', 'center', default undefined)
     * If left/right is set, shape.x/shape.cx/position will not be used.
     * If top/bottom is set, shape.y/shape.cy/position will not be used.
     * This mechanism is useful when you want to position a group/element
     * against the right side or the center of this container.
     */
    Partial<Pick<BoxLayoutOptionMixin, 'left' | 'right' | 'top' | 'bottom'>> {

    /**
     * element type, mandatory.
     * Only can be omit if call setOption not at the first time and perform merge.
     */
    type?: string;

    id?: OptionId;
    name?: string;

    // Only internal usage. Use specified value does NOT make sense.
    parentId?: OptionId;
    parentOption?: GraphicComponentElementOption;
    children?: GraphicComponentElementOption[];
    hv?: [boolean, boolean];

    /**
     * bounding: (enum: 'all' (default) | 'raw')
     * Specify how to calculate boundingRect when locating.
     * 'all': Get uioned and transformed boundingRect
     *     from both itself and its descendants.
     *     This mode simplies confining a group of elements in the bounding
     *     of their ancester container (e.g., using 'right: 0').
     * 'raw': Only use the boundingRect of itself and before transformed.
     *     This mode is similar to css behavior, which is useful when you
     *     want an element to be able to overflow its container. (Consider
     *     a rotated circle needs to be located in a corner.)
     */
    bounding?: 'raw' | 'all';

    /**
     * info: custom info. enables user to mount some info on elements and use them
     * in event handlers. Update them only when user specified, otherwise, remain.
     */
    info?: GraphicExtraElementInfo;


    // `false` means remove the clipPath
    clipPath?: Omit<GraphicComponentZRPathOption, 'clipPath'> | false;

    textContent?: Omit<GraphicComponentTextOption, 'clipPath'>;
    textConfig?: ElementTextConfig;

    $action?: 'merge' | 'replace' | 'remove';

    tooltip?: CommonTooltipOption<unknown>;

    enterAnimation?: AnimationOption
    updateAnimation?: AnimationOption
    leaveAnimation?: AnimationOption
};


export interface GraphicComponentDisplayableOption extends
    GraphicComponentBaseElementOption,
    Partial<Pick<Displayable, 'zlevel' | 'z' | 'z2' | 'invisible' | 'cursor'>> {

    style?: ZRStyleProps
    z2?: number
}
// TODO: states?
// interface GraphicComponentDisplayableOptionOnState extends Partial<Pick<
//     Displayable, TransformProp | 'textConfig' | 'z2'
// >> {
//     style?: ZRStyleProps;
// }
export interface GraphicComponentGroupOption
    extends GraphicComponentBaseElementOption, TransitionOptionMixin<GroupProps> {
    type?: 'group';

    /**
     * width/height: (can only be pixel value, default 0)
     * Is only used to specify container (group) size, if needed. And
     * cannot be a percentage value (like '33%'). See the reason in the
     * layout algorithm below.
     */
    width?: number;
    height?: number;

    // TODO: Can only set focus, blur on the root element.
    // children: Omit<GraphicComponentElementOption, 'focus' | 'blurScope'>[];
    children: GraphicComponentElementOption[];

    keyframeAnimation?: ElementKeyframeAnimationOption<GroupProps> | ElementKeyframeAnimationOption<GroupProps>[]
};
export interface GraphicComponentZRPathOption
    extends GraphicComponentDisplayableOption, TransitionOptionMixin<PathProps> {
    shape?: PathProps['shape'] & TransitionOptionMixin<PathProps['shape']>;
    style?: PathStyleProps & TransitionOptionMixin<PathStyleProps>

    keyframeAnimation?: ElementKeyframeAnimationOption<PathProps> | ElementKeyframeAnimationOption<PathProps>[];
}
export interface GraphicComponentImageOption
    extends GraphicComponentDisplayableOption, TransitionOptionMixin<ImageProps> {
    type?: 'image';
    style?: ImageStyleProps & TransitionOptionMixin<ImageStyleProps>;

    keyframeAnimation?: ElementKeyframeAnimationOption<ImageProps> | ElementKeyframeAnimationOption<ImageProps>[];
}
// TODO: states?
// interface GraphicComponentImageOptionOnState extends GraphicComponentDisplayableOptionOnState {
//     style?: ImageStyleProps;
// }
export interface GraphicComponentTextOption
    extends Omit<GraphicComponentDisplayableOption, 'textContent' | 'textConfig'>, TransitionOptionMixin<TextProps> {
    type?: 'text';
    style?: TextStyleProps & TransitionOptionMixin<TextStyleProps>;

    keyframeAnimation?: ElementKeyframeAnimationOption<TextProps> | ElementKeyframeAnimationOption<TextProps>[];
}
export type GraphicComponentElementOption =
    GraphicComponentGroupOption |
    GraphicComponentZRPathOption |
    GraphicComponentImageOption |
    GraphicComponentTextOption;
// type GraphicComponentElementOptionOnState =
//     GraphicComponentDisplayableOptionOnState
//     | GraphicComponentImageOptionOnState;
type GraphicExtraElementInfo = Dictionary<unknown>;
export type ElementMap = zrUtil.HashMap<Element, string>;


export type GraphicComponentLooseOption = (GraphicComponentOption | GraphicComponentElementOption) & {
    mainType?: 'graphic';
};

export interface GraphicComponentOption extends ComponentOption, AnimationOptionMixin {
    // Note: elements is always behind its ancestors in this elements array.
    elements?: GraphicComponentElementOption[];
};

export function setKeyInfoToNewElOption(
    resultItem: ReturnType<typeof modelUtil.mappingToExists>[number],
    newElOption: GraphicComponentElementOption
): void {
    const existElOption = resultItem.existing as GraphicComponentElementOption;

    // Set id and type after id assigned.
    newElOption.id = resultItem.keyInfo.id;
    !newElOption.type && existElOption && (newElOption.type = existElOption.type);

    // Set parent id if not specified
    if (newElOption.parentId == null) {
        const newElParentOption = newElOption.parentOption;
        if (newElParentOption) {
            newElOption.parentId = newElParentOption.id;
        }
        else if (existElOption) {
            newElOption.parentId = existElOption.parentId;
        }
    }

    // Clear
    newElOption.parentOption = null;
}

function isSetLoc(
    obj: GraphicComponentElementOption,
    props: ('left' | 'right' | 'top' | 'bottom')[]
): boolean {
    let isSet;
    zrUtil.each(props, function (prop) {
        obj[prop] != null && obj[prop] !== 'auto' && (isSet = true);
    });
    return isSet;
}
function mergeNewElOptionToExist(
    existList: GraphicComponentElementOption[],
    index: number,
    newElOption: GraphicComponentElementOption
): void {
    // Update existing options, for `getOption` feature.
    const newElOptCopy = zrUtil.extend({}, newElOption);
    const existElOption = existList[index];

    const $action = newElOption.$action || 'merge';
    if ($action === 'merge') {
        if (existElOption) {
            if (__DEV__) {
                const newType = newElOption.type;
                zrUtil.assert(
                    !newType || existElOption.type === newType,
                    'Please set $action: "replace" to change `type`'
                );
            }

            // We can ensure that newElOptCopy and existElOption are not
            // the same object, so `merge` will not change newElOptCopy.
            zrUtil.merge(existElOption, newElOptCopy, true);
            // Rigid body, use ignoreSize.
            mergeLayoutParam(existElOption, newElOptCopy, { ignoreSize: true });
            // Will be used in render.
            copyLayoutParams(newElOption, existElOption);

            // Copy transition info to new option so it can be used in the transition.
            // DO IT AFTER merge
            copyTransitionInfo(newElOption, existElOption);
            copyTransitionInfo(newElOption, existElOption, 'shape');
            copyTransitionInfo(newElOption, existElOption, 'style');
            copyTransitionInfo(newElOption, existElOption, 'extra');

            // Copy clipPath
            newElOption.clipPath = existElOption.clipPath;
        }
        else {
            existList[index] = newElOptCopy;
        }
    }
    else if ($action === 'replace') {
        existList[index] = newElOptCopy;
    }
    else if ($action === 'remove') {
        // null will be cleaned later.
        existElOption && (existList[index] = null);
    }
}

const TRANSITION_PROPS_TO_COPY = ['transition', 'enterFrom', 'leaveTo'];
const ROOT_TRANSITION_PROPS_TO_COPY =
    TRANSITION_PROPS_TO_COPY.concat(['enterAnimation', 'updateAnimation', 'leaveAnimation']);
function copyTransitionInfo(
    target: GraphicComponentElementOption,
    source: GraphicComponentElementOption,
    targetProp?: string
) {
    if (targetProp) {
        if (!(target as any)[targetProp]
            && (source as any)[targetProp]
        ) {
            // TODO avoid creating this empty object when there is no transition configuration.
            (target as any)[targetProp] = {};
        }
        target = (target as any)[targetProp];
        source = (source as any)[targetProp];
    }
    if (!target || !source) {
        return;
    }

    const props = targetProp ? TRANSITION_PROPS_TO_COPY : ROOT_TRANSITION_PROPS_TO_COPY;
    for (let i = 0; i < props.length; i++) {
        const prop = props[i];
        if ((target as any)[prop] == null && (source as any)[prop] != null) {
            (target as any)[prop] = (source as any)[prop];
        }
    }
}

function setLayoutInfoToExist(
    existItem: GraphicComponentElementOption,
    newElOption: GraphicComponentElementOption
) {
    if (!existItem) {
        return;
    }
    existItem.hv = newElOption.hv = [
        // Rigid body, don't care about `width`.
        isSetLoc(newElOption, ['left', 'right']),
        // Rigid body, don't care about `height`.
        isSetLoc(newElOption, ['top', 'bottom'])
    ];
    // Give default group size. Otherwise layout error may occur.
    if (existItem.type === 'group') {
        const existingGroupOpt = existItem as GraphicComponentGroupOption;
        const newGroupOpt = newElOption as GraphicComponentGroupOption;
        existingGroupOpt.width == null && (existingGroupOpt.width = newGroupOpt.width = 0);
        existingGroupOpt.height == null && (existingGroupOpt.height = newGroupOpt.height = 0);
    }
}

export class GraphicComponentModel extends ComponentModel<GraphicComponentOption> {

    static type = 'graphic';
    type = GraphicComponentModel.type;

    preventAutoZ = true;

    static defaultOption: GraphicComponentOption = {
        elements: []
        // parentId: null
    };

    /**
     * Save el options for the sake of the performance (only update modified graphics).
     * The order is the same as those in option. (ancesters -> descendants)
     */
    private _elOptionsToUpdate: GraphicComponentElementOption[];

    mergeOption(option: GraphicComponentOption, ecModel: GlobalModel): void {
        // Prevent default merge to elements
        const elements = this.option.elements;
        this.option.elements = null;

        super.mergeOption(option, ecModel);

        this.option.elements = elements;
    }

    optionUpdated(newOption: GraphicComponentOption, isInit: boolean): void {
        const thisOption = this.option;
        const newList = (isInit ? thisOption : newOption).elements;
        const existList = thisOption.elements = isInit ? [] : thisOption.elements;

        const flattenedList = [] as GraphicComponentElementOption[];
        this._flatten(newList, flattenedList, null);

        const mappingResult = modelUtil.mappingToExists(existList, flattenedList, 'normalMerge');

        // Clear elOptionsToUpdate
        const elOptionsToUpdate = this._elOptionsToUpdate = [] as GraphicComponentElementOption[];

        zrUtil.each(mappingResult, function (resultItem, index) {
            const newElOption = resultItem.newOption as GraphicComponentElementOption;

            if (__DEV__) {
                zrUtil.assert(
                    zrUtil.isObject(newElOption) || resultItem.existing,
                    'Empty graphic option definition'
                );
            }

            if (!newElOption) {
                return;
            }

            elOptionsToUpdate.push(newElOption);

            setKeyInfoToNewElOption(resultItem, newElOption);

            mergeNewElOptionToExist(existList, index, newElOption);

            setLayoutInfoToExist(existList[index], newElOption);

        }, this);

        // Clean
        thisOption.elements = zrUtil.filter(existList, (item) => {
            // $action should be volatile, otherwise option gotten from
            // `getOption` will contain unexpected $action.
            item && delete item.$action;
            return item != null;
        });
    }

    /**
     * Convert
     * [{
     *  type: 'group',
     *  id: 'xx',
     *  children: [{type: 'circle'}, {type: 'polygon'}]
     * }]
     * to
     * [
     *  {type: 'group', id: 'xx'},
     *  {type: 'circle', parentId: 'xx'},
     *  {type: 'polygon', parentId: 'xx'}
     * ]
     */
    private _flatten(
        optionList: GraphicComponentElementOption[],
        result: GraphicComponentElementOption[],
        parentOption: GraphicComponentElementOption
    ): void {
        zrUtil.each(optionList, function (option) {
            if (!option) {
                return;
            }

            if (parentOption) {
                option.parentOption = parentOption;
            }

            result.push(option);

            const children = option.children;
            // here we don't judge if option.type is `group`
            // when new option doesn't provide `type`, it will cause that the children can't be updated.
            if (children && children.length) {
                this._flatten(children, result, option);
            }
            // Deleting for JSON output, and for not affecting group creation.
            delete option.children;
        }, this);
    }

    // FIXME
    // Pass to view using payload? setOption has a payload?
    useElOptionsToUpdate(): GraphicComponentElementOption[] {
        const els = this._elOptionsToUpdate;
        // Clear to avoid render duplicately when zooming.
        this._elOptionsToUpdate = null;
        return els;
    }
}
