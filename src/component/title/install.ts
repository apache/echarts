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
import {getECData} from '../../util/innerStore';
import {createTextStyle} from '../../label/labelStyle';
import {getLayoutRect} from '../../util/layout';
import ComponentModel from '../../model/Component';
import {
    ComponentOption,
    BoxLayoutOptionMixin,
    ZRTextAlign,
    ZRTextVerticalAlign,
    ZRColor,
    BorderOptionMixin,
    LabelOption
} from '../../util/types';
import ComponentView from '../../view/Component';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import {windowOpen} from '../../util/format';
import { EChartsExtensionInstallRegisters } from '../../extension';


export interface TitleOption extends ComponentOption, BoxLayoutOptionMixin, BorderOptionMixin {

    mainType?: 'title'

    show?: boolean

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
    static type = 'title' as const;
    type = TitleModel.type;

    readonly layoutMode = {type: 'box', ignoreSize: true} as const;

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
            fontWeight: 'bold',
            color: '#464646'
        },
        subtextStyle: {
            fontSize: 12,
            color: '#6E7079'
        }
    };
}


// View
class TitleView extends ComponentView {

    static type = 'title' as const;
    type = TitleView.type;


    render(titleModel: TitleModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this.group.removeAll();

        if (!titleModel.get('show')) {
            return;
        }

        const group = this.group;

        const textStyleModel = titleModel.getModel('textStyle');
        const subtextStyleModel = titleModel.getModel('subtextStyle');

        let textAlign = titleModel.get('textAlign');
        let textVerticalAlign = zrUtil.retrieve2(
            titleModel.get('textBaseline'), titleModel.get('textVerticalAlign')
        );

        const textEl = new graphic.Text({
            style: createTextStyle(textStyleModel, {
                text: titleModel.get('text'),
                fill: textStyleModel.getTextColor()
            }, {disableBox: true}),
            z2: 10
        });

        const textRect = textEl.getBoundingRect();

        const subText = titleModel.get('subtext');
        const subTextEl = new graphic.Text({
            style: createTextStyle(subtextStyleModel, {
                text: subText,
                fill: subtextStyleModel.getTextColor(),
                y: textRect.height + titleModel.get('itemGap'),
                verticalAlign: 'top'
            }, {disableBox: true}),
            z2: 10
        });

        const link = titleModel.get('link');
        const sublink = titleModel.get('sublink');
        const triggerEvent = titleModel.get('triggerEvent', true);

        textEl.silent = !link && !triggerEvent;
        subTextEl.silent = !sublink && !triggerEvent;

        if (link) {
            textEl.on('click', function () {
                windowOpen(link, '_' + titleModel.get('target'));
            });
        }
        if (sublink) {
            subTextEl.on('click', function () {
                windowOpen(sublink, '_' + titleModel.get('subtarget'));
            });
        }

        getECData(textEl).eventData = getECData(subTextEl).eventData = triggerEvent
            ? {
                componentType: 'title',
                componentIndex: titleModel.componentIndex
            }
            : null;

        group.add(textEl);
        subText && group.add(subTextEl);
        // If no subText, but add subTextEl, there will be an empty line.

        let groupRect = group.getBoundingRect();
        const layoutOption = titleModel.getBoxLayoutParams();
        layoutOption.width = groupRect.width;
        layoutOption.height = groupRect.height;
        const layoutRect = getLayoutRect(
            layoutOption, {
                width: api.getWidth(),
                height: api.getHeight()
            }, titleModel.get('padding')
        );
        // Adjust text align based on position
        if (!textAlign) {
            // Align left if title is on the left. center and right is same
            textAlign = (titleModel.get('left') || titleModel.get('right')) as ZRTextAlign;
            // @ts-ignore
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
            // @ts-ignore
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

        group.x = layoutRect.x;
        group.y = layoutRect.y;
        group.markRedraw();
        const alignStyle = {
            align: textAlign,
            verticalAlign: textVerticalAlign
        };
        textEl.setStyle(alignStyle);
        subTextEl.setStyle(alignStyle);

        // Render background
        // Get groupRect again because textAlign has been changed
        groupRect = group.getBoundingRect();
        const padding = layoutRect.margin;
        const style = titleModel.getItemStyle(['color', 'opacity']);
        style.fill = titleModel.get('backgroundColor');
        const rect = new graphic.Rect({
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


export function install(registers: EChartsExtensionInstallRegisters) {
    registers.registerComponentModel(TitleModel);
    registers.registerComponentView(TitleView);
}