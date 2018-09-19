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

/**
 * @alias module:echarts/component/tooltip/TooltipRichContent
 * @constructor
 */
function TooltipRichContent(api) {

    this._zr = api.getZr();

    this._show = false;

    /**
     * @private
     */
    this._hideTimeout;
}

TooltipRichContent.prototype = {

    constructor: TooltipRichContent,

    /**
     * @private
     * @type {boolean}
     */
    _enterable: true,

    /**
     * Update when tooltip is rendered
     */
    update: function () {
        // noop
    },

    show: function (tooltipModel) {
        if (this._hideTimeout) {
            clearTimeout(this._hideTimeout);
        }

        this.el.attr('show', true);
        this._show = true;
    },

    /**
     * Set tooltip content
     *
     * @param {string} content rich text string of content
     * @param {Object} markerRich rich text style
     * @param {Object} tooltipModel tooltip model
     */
    setContent: function (content, markerRich, tooltipModel) {
        if (this.el) {
            this._zr.remove(this.el);
        }

        var markers = {};
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
                    textBackgroundColor: markerRich[name],
                    // TODO: textOffset is not implemented for rich text
                    textOffset: [3, 0]
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
                textFill: tooltipModel.get('textStyle.color'),
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
    },

    setEnterable: function (enterable) {
        this._enterable = enterable;
    },

    getSize: function () {
        var bounding = this.el.getBoundingRect();
        return [bounding.width, bounding.height];
    },

    moveTo: function (x, y) {
        if (this.el) {
            this.el.attr('position', [x, y]);
        }
    },

    hide: function () {
        this.el.hide();
        this._show = false;
    },

    hideLater: function (time) {
        if (this._show && !(this._inContent && this._enterable)) {
            if (time) {
                this._hideDelay = time;
                // Set show false to avoid invoke hideLater mutiple times
                this._show = false;
                this._hideTimeout = setTimeout(zrUtil.bind(this.hide, this), time);
            }
            else {
                this.hide();
            }
        }
    },

    isShow: function () {
        return this._show;
    },

    getOuterSize: function () {
        return this.getSize();
    }
};

export default TooltipRichContent;
