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
import * as graphic from '../util/graphic';
import {getLayoutRect} from '../util/layout';
import ComponentModel from '../model/Component';
import { ComponentOption, BoxLayoutOptionMixin, ZRTextAlign, ZRTextVerticalAlign, ZRColor, BorderOptionMixin, LabelOption, ECElement } from '../util/types';
import ComponentView from '../view/Component';
import GlobalModel from '../model/Global';
import ExtensionAPI from '../ExtensionAPI';

export interface TitleOption extends ComponentOption, BoxLayoutOptionMixin, BorderOptionMixin {
    type?: 'title'

    text?: string
    /**
     * Link to url
     */
    link?: string
    target?: 'self' | 'blank'

    subtext?: string
    sublink?: string
    subtarget?: 'self' | 'blank'

    textAlign?: ZRTextAlign
    textVerticalAlign?: ZRTextVerticalAlign

    /**
     * @deprecated Use textVerticalAlign instead
     */
    textBaseline?: ZRTextVerticalAlign

    backgroundColor?: ZRColor
    /**
     * Padding between text and border.
     * Support to be a single number or an array.
     */
    padding?: number | number[]
    /**
     * Gap between text and subtext
     */
    itemGap?: number

    textStyle?: LabelOption

    subtextStyle?: LabelOption

    /**
     * If trigger mouse or touch event
     */
    triggerEvent?: boolean

    /**
     * Radius of background border.
     */
    borderRadius?: number | number[]
}
class TitleModel extends ComponentModel<TitleOption> {
    static type = 'title' as const
    type = TitleModel.type

    readonly layoutMode = {type: 'box', ignoreSize: true} as const

    static defaultOption: TitleOption = {
        zlevel: 0,
        z: 6,
        show: true,

        text: '',
        target: 'blank',
        subtext: '',

        subtarget: 'blank',

        left: 0,
        top: 0,

        backgroundColor: 'rgba(0,0,0,0)',

        borderColor: '#ccc',

        borderWidth: 0,

        padding: 5,

        itemGap: 10,
        textStyle: {
            fontSize: 18,
            fontWeight: 'bolder',
            color: '#333'
        },
        subtextStyle: {
            color: '#aaa'
        }
    }
}
ComponentModel.registerClass(TitleModel);


// View
class TitleView extends ComponentView {

    static type = 'title' as const
    type = TitleView.type


    render(titleModel: TitleModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this.group.removeAll();

        if (!titleModel.get('show')) {
            return;
        }

        var group = this.group;

        var textStyleModel = titleModel.getModel('textStyle');
        var subtextStyleModel = titleModel.getModel('subtextStyle');

        var textAlign = titleModel.get('textAlign');
        var textVerticalAlign = zrUtil.retrieve2(
            titleModel.get('textBaseline'), titleModel.get('textVerticalAlign')
        );

        var textEl = new graphic.Text({
            style: graphic.setTextStyle({}, textStyleModel, {
                text: titleModel.get('text'),
                textFill: textStyleModel.getTextColor()
            }, {disableBox: true}),
            z2: 10
        });

        var textRect = textEl.getBoundingRect();

        var subText = titleModel.get('subtext');
        var subTextEl = new graphic.Text({
            style: graphic.setTextStyle({}, subtextStyleModel, {
                text: subText,
                textFill: subtextStyleModel.getTextColor(),
                y: textRect.height + titleModel.get('itemGap'),
                textVerticalAlign: 'top'
            }, {disableBox: true}),
            z2: 10
        });

        var link = titleModel.get('link');
        var sublink = titleModel.get('sublink');
        var triggerEvent = titleModel.get('triggerEvent', true);

        textEl.silent = !link && !triggerEvent;
        subTextEl.silent = !sublink && !triggerEvent;

        if (link) {
            textEl.on('click', function () {
                window.open(link, '_' + titleModel.get('target'));
            });
        }
        if (sublink) {
            subTextEl.on('click', function () {
                window.open(sublink, '_' + titleModel.get('subtarget'));
            });
        }

        (textEl as ECElement).eventData = (subTextEl as ECElement).eventData = triggerEvent
            ? {
                componentType: 'title',
                componentIndex: titleModel.componentIndex
            }
            : null;

        group.add(textEl);
        subText && group.add(subTextEl);
        // If no subText, but add subTextEl, there will be an empty line.

        var groupRect = group.getBoundingRect();
        var layoutOption = titleModel.getBoxLayoutParams();
        layoutOption.width = groupRect.width;
        layoutOption.height = groupRect.height;
        var layoutRect = getLayoutRect(
            layoutOption, {
                width: api.getWidth(),
                height: api.getHeight()
            }, titleModel.get('padding')
        );
        // Adjust text align based on position
        if (!textAlign) {
            // Align left if title is on the left. center and right is same
            textAlign = (titleModel.get('left') || titleModel.get('right')) as ZRTextAlign;
            if (textAlign === 'middle') {
                textAlign = 'center';
            }
            // Adjust layout by text align
            if (textAlign === 'right') {
                layoutRect.x += layoutRect.width;
            }
            else if (textAlign === 'center') {
                layoutRect.x += layoutRect.width / 2;
            }
        }
        if (!textVerticalAlign) {
            textVerticalAlign = (titleModel.get('top') || titleModel.get('bottom')) as ZRTextVerticalAlign;
            if (textVerticalAlign === 'center') {
                textVerticalAlign = 'middle';
            }
            if (textVerticalAlign === 'bottom') {
                layoutRect.y += layoutRect.height;
            }
            else if (textVerticalAlign === 'middle') {
                layoutRect.y += layoutRect.height / 2;
            }

            textVerticalAlign = textVerticalAlign || 'top';
        }

        group.attr('position', [layoutRect.x, layoutRect.y]);
        var alignStyle = {
            textAlign: textAlign,
            textVerticalAlign: textVerticalAlign
        };
        textEl.setStyle(alignStyle);
        subTextEl.setStyle(alignStyle);

        // Render background
        // Get groupRect again because textAlign has been changed
        groupRect = group.getBoundingRect();
        var padding = layoutRect.margin;
        var style = titleModel.getItemStyle(['color', 'opacity']);
        style.fill = titleModel.get('backgroundColor');
        var rect = new graphic.Rect({
            shape: {
                x: groupRect.x - padding[3],
                y: groupRect.y - padding[0],
                width: groupRect.width + padding[1] + padding[3],
                height: groupRect.height + padding[0] + padding[2],
                r: titleModel.get('borderRadius')
            },
            style: style,
            subPixelOptimize: true,
            silent: true
        });

        group.add(rect);
    }
}

ComponentView.registerClass(TitleView);