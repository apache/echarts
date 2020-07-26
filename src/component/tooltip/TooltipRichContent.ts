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
import ExtensionAPI from '../../ExtensionAPI';
import { ZRenderType } from 'zrender/src/zrender';
import { TooltipOption } from './TooltipModel';
import * as graphic from '../../util/graphic';
import { Dictionary } from 'zrender/src/core/types';
import { ColorString, ZRColor } from '../../util/types';
import Model from '../../model/Model';
import ZRText, { TextStyleProps } from 'zrender/src/graphic/Text';

class TooltipRichContent {

    private _zr: ZRenderType;

    private _show = false;

    private _hideTimeout: number;

    private _enterable = true;

    private _inContent: boolean;

    private _hideDelay: number;

    el: ZRText;

    constructor(api: ExtensionAPI) {
        this._zr = api.getZr();
    }

    /**
     * Update when tooltip is rendered
     */
    update() {
        // noop
    }

    show() {
        if (this._hideTimeout) {
            clearTimeout(this._hideTimeout);
        }

        this.el.show();
        this._show = true;
    }

    /**
     * Set tooltip content
     */
    setContent(
        content: string,
        markerRich: Dictionary<ColorString>,
        tooltipModel: Model<TooltipOption>,
        borderColor: ZRColor,
        arrowPosition: TooltipOption['position']
    ) {
        if (this.el) {
            this._zr.remove(this.el);
        }

        const markers: TextStyleProps['rich'] = {};
        let text = content;
        const prefix = '{marker';
        const suffix = '|}';
        let startId = text.indexOf(prefix);
        while (startId >= 0) {
            const endId = text.indexOf(suffix);
            const name = text.substr(startId + prefix.length, endId - startId - prefix.length);
            if (name.indexOf('sub') > -1) {
                markers['marker' + name] = {
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: markerRich[name]

                    // TODO: textOffset is not implemented for rich text
                    // textOffset: [3, 0]
                };
            }
            else {
                markers['marker' + name] = {
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: markerRich[name]
                };
            }

            text = text.substr(endId + 1);
            startId = text.indexOf(prefix);
        }

        this.el = new ZRText({
            style: {
                rich: markers,
                text: content,
                lineHeight: 20,
                backgroundColor: tooltipModel.get('backgroundColor'),
                borderRadius: tooltipModel.get('borderRadius'),
                borderWidth: 1,
                borderColor: borderColor as string,
                shadowBlur: tooltipModel.get('shadowBlur'),
                shadowOffsetX: tooltipModel.get('shadowOffsetX'),
                shadowOffsetY: tooltipModel.get('shadowOffsetY'),
                fill: tooltipModel.get(['textStyle', 'color']),
                padding: tooltipModel.get('padding'),
                verticalAlign: 'middle',
                align: 'left'
            },
            z: tooltipModel.get('z')
        });
        this._zr.add(this.el);

        const self = this;
        this.el.on('mouseover', function () {
            // clear the timeout in hideLater and keep showing tooltip
            if (self._enterable) {
                clearTimeout(self._hideTimeout);
                self._show = true;
            }
            self._inContent = true;
        });
        this.el.on('mouseout', function () {
            if (self._enterable) {
                if (self._show) {
                    self.hideLater(self._hideDelay);
                }
            }
            self._inContent = false;
        });
    }

    setEnterable(enterable?: boolean) {
        this._enterable = enterable;
    }

    getSize() {
        const bounding = this.el.getBoundingRect();
        return [bounding.width, bounding.height];
    }

    moveTo(x: number, y: number) {
        const el = this.el;
        if (el) {
            el.x = x;
            el.y = y;
            el.markRedraw();
        }
    }

    hide() {
        if (this.el) {
            this.el.hide();
        }
        this._show = false;
    }

    hideLater(time?: number) {
        if (this._show && !(this._inContent && this._enterable)) {
            if (time) {
                this._hideDelay = time;
                // Set show false to avoid invoke hideLater mutiple times
                this._show = false;
                this._hideTimeout = setTimeout(zrUtil.bind(this.hide, this), time) as any;
            }
            else {
                this.hide();
            }
        }
    }

    isShow() {
        return this._show;
    }

    getOuterSize() {
        const size = this.getSize();
        return {
            width: size[0],
            height: size[1]
        };
    }

    dispose() {
        this._zr.remove(this.el);
    }
}


export default TooltipRichContent;
