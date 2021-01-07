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
import { LoadingEffect } from '../util/types';
import ExtensionAPI from '../core/ExtensionAPI';

const PI = Math.PI;

/**
 * @param {module:echarts/ExtensionAPI} api
 * @param {Object} [opts]
 * @param {string} [opts.text]
 * @param {string} [opts.color]
 * @param {string} [opts.textColor]
 * @return {module:zrender/Element}
 */
export default function defaultLoading(
    api: ExtensionAPI,
    opts?: {
        text?: string;
        color?: string;
        textColor?: string;
        maskColor?: string;
        zlevel?: number;
        showSpinner?: boolean;
        spinnerRadius?: number;
        lineWidth?: number;
        fontSize?: number;
        fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
        fontStyle?: 'normal' | 'italic' | 'oblique';
        fontFamily?: string
    }
): LoadingEffect {
    opts = opts || {};
    zrUtil.defaults(opts, {
        text: 'loading',
        textColor: '#000',
        fontSize: 12,
        fontWeight: 'normal',
        fontStyle: 'normal',
        fontFamily: 'sans-serif',
        maskColor: 'rgba(255, 255, 255, 0.8)',
        showSpinner: true,
        color: '#5470c6',
        spinnerRadius: 10,
        lineWidth: 5,
        zlevel: 0
    });
    const group = new graphic.Group() as (graphic.Group & LoadingEffect);
    const mask = new graphic.Rect({
        style: {
            fill: opts.maskColor
        },
        zlevel: opts.zlevel,
        z: 10000
    });
    group.add(mask);

    const textContent = new graphic.Text({
        style: {
            text: opts.text,
            fill: opts.textColor,
            fontSize: opts.fontSize,
            fontWeight: opts.fontWeight,
            fontStyle: opts.fontStyle,
            fontFamily: opts.fontFamily
        }
    });

    const labelRect = new graphic.Rect({
        style: {
            fill: 'none'
        },
        textContent: textContent,
        textConfig: {
            position: 'right',
            distance: 10
        },
        zlevel: opts.zlevel,
        z: 10001
    });
    group.add(labelRect);
    let arc: graphic.Arc;

    if (opts.showSpinner) {
        arc = new graphic.Arc({
            shape: {
                startAngle: -PI / 2,
                endAngle: -PI / 2 + 0.1,
                r: opts.spinnerRadius
            },
            style: {
                stroke: opts.color,
                lineCap: 'round',
                lineWidth: opts.lineWidth
            },
            zlevel: opts.zlevel,
            z: 10001
        });
        arc.animateShape(true)
            .when(1000, {
                endAngle: PI * 3 / 2
            })
            .start('circularInOut');
        arc.animateShape(true)
            .when(1000, {
                startAngle: PI * 3 / 2
            })
            .delay(300)
            .start('circularInOut');

        group.add(arc);
    }

    // Inject resize
    group.resize = function () {
        const textWidth = textContent.getBoundingRect().width;
        const r = opts.showSpinner ? opts.spinnerRadius : 0;
        // cx = (containerWidth - arcDiameter - textDistance - textWidth) / 2
        // textDistance needs to be calculated when both animation and text exist
        const cx = (api.getWidth() - r * 2 - (opts.showSpinner && textWidth ? 10 : 0) - textWidth) / 2
            - (opts.showSpinner && textWidth ? 0 : 5 + textWidth / 2)
            // only show the text
            + (opts.showSpinner ? 0 : textWidth / 2)
            // only show the spinner
            + (textWidth ? 0 : r);
        const cy = api.getHeight() / 2;
        opts.showSpinner && arc.setShape({
            cx: cx,
            cy: cy
        });
        labelRect.setShape({
            x: cx - r,
            y: cy - r,
            width: r * 2,
            height: r * 2
        });

        mask.setShape({
            x: 0,
            y: 0,
            width: api.getWidth(),
            height: api.getHeight()
        });
    };
    group.resize();
    return group;
}