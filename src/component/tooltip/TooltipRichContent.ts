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
// import Group from 'zrender/src/container/Group';
import Text from 'zrender/src/graphic/Text';
import ExtensionAPI from '../../ExtensionAPI';
import { ZRenderType } from 'zrender/src/zrender';
import { TooltipOption } from './TooltipModel';
import * as graphic from '../../util/graphic';
import { Dictionary } from 'zrender/src/core/types';
import { ColorString } from '../../util/types';
import { StyleProps } from 'zrender/src/graphic/Style';
import Model from '../../model/Model';

class TooltipRichContent {

    private _zr: ZRenderType;

    private _show = false;

    private _hideTimeout: number;

    private _enterable = true;

    private _inContent: boolean;

    private _hideDelay: number;

    el: graphic.Text;

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
        tooltipModel: Model<TooltipOption>
    ) {
        if (this.el) {
            this._zr.remove(this.el);
        }

        var markers: StyleProps['rich'] = {};
        var text = content;
        var prefix = '{marker';
        var suffix = '|}';
        var startId = text.indexOf(prefix);
        while (startId >= 0) {
            var endId = text.indexOf(suffix);
            var name = text.substr(startId + prefix.length, endId - startId - prefix.length);
            if (name.indexOf('sub') > -1) {
                markers['marker' + name] = {
                    textWidth: 4,
                    textHeight: 4,
                    textBorderRadius: 2,
                    textBackgroundColor: markerRich[name]

                    // TODO: textOffset is not implemented for rich text
                    // textOffset: [3, 0]
                };
            }
            else {
                markers['marker' + name] = {
                    textWidth: 10,
                    textHeight: 10,
                    textBorderRadius: 5,
                    textBackgroundColor: markerRich[name]
                };
            }

            text = text.substr(endId + 1);
            startId = text.indexOf('{marker');
        }

        this.el = new Text({
            style: {
                rich: markers,
                text: content,
                textLineHeight: 20,
                textBackgroundColor: tooltipModel.get('backgroundColor'),
                textBorderRadius: tooltipModel.get('borderRadius'),
                textFill: tooltipModel.get(['textStyle', 'color']),
                textPadding: tooltipModel.get('padding')
            },
            z: tooltipModel.get('z')
        });
        this._zr.add(this.el);

        var self = this;
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
        var bounding = this.el.getBoundingRect();
        return [bounding.width, bounding.height];
    }

    moveTo(x: number, y: number) {
        if (this.el) {
            this.el.attr('position', [x, y]);
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
        var size = this.getSize();
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
