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

import { Dictionary, ZRStyleProps } from './types';
import { ElementTextConfig } from 'zrender/src/Element';
import { TextStyleProps, TextStylePropsPart, TextProps } from 'zrender/src/graphic/Text';
import { each, hasOwn } from 'zrender/src/core/util';
import { ItemStyleProps } from '../model/mixin/itemStyle';

export interface LegacyStyleProps {
    legacy?: boolean
}

const deprecatedLogs = {} as Dictionary<boolean>;

/**
 * Whether need to call `convertEC4CompatibleStyle`.
 */
export function isEC4CompatibleStyle(
    style: ZRStyleProps & LegacyStyleProps,
    elType: string,
    hasOwnTextContentOption: boolean,
    hasOwnTextConfig: boolean
): boolean {
    // Since echarts5, `RectText` is separated from its host element and style.text
    // does not exist any more. The compat work brings some extra burden on performance.
    // So we provide:
    // `legacy: true` force make compat.
    // `legacy: false`, force do not compat.
    // `legacy` not set: auto detect whether legacy.
    //     But in this case we do not compat (difficult to detect and rare case):
    //     Becuse custom series and graphic component support "merge", users may firstly
    //     only set `textStrokeWidth` style or secondly only set `text`.
    return style && (
        style.legacy
        || (
            style.legacy !== false
            && !hasOwnTextContentOption
            && !hasOwnTextConfig
            && elType !== 'tspan'
            // Difficult to detect whether legacy for a "text" el.
            && (elType === 'text' || hasOwn(style, 'text'))
        )
    );
}

/**
 * `EC4CompatibleStyle` is style that might be in echarts4 format or echarts5 format.
 * @param hostStyle The properties might be modified.
 * @return If be text el, `textContentStyle` and `textConfig` will not be returned.
 *         Otherwise a `textContentStyle` and `textConfig` will be created, whose props area
 *         retried from the `hostStyle`.
 */
export function convertFromEC4CompatibleStyle(hostStyle: ZRStyleProps, elType: string, isNormal: boolean): {
    textContent: TextProps & {type: string},
    textConfig: ElementTextConfig
} {
    const srcStyle = hostStyle as Dictionary<any>;
    let textConfig: ElementTextConfig;
    let textContent: TextProps & {type: string};

    let textContentStyle: TextStyleProps;
    if (elType === 'text') {
        textContentStyle = srcStyle;
    }
    else {
        textContentStyle = {};
        hasOwn(srcStyle, 'text') && (textContentStyle.text = srcStyle.text);
        hasOwn(srcStyle, 'rich') && (textContentStyle.rich = srcStyle.rich);
        hasOwn(srcStyle, 'textFill') && (textContentStyle.fill = srcStyle.textFill);
        hasOwn(srcStyle, 'textStroke') && (textContentStyle.stroke = srcStyle.textStroke);
        hasOwn(srcStyle, 'fontFamily') && (textContentStyle.fontFamily = srcStyle.fontFamily);
        hasOwn(srcStyle, 'fontSize') && (textContentStyle.fontSize = srcStyle.fontSize);
        hasOwn(srcStyle, 'fontStyle') && (textContentStyle.fontStyle = srcStyle.fontStyle);
        hasOwn(srcStyle, 'fontWeight') && (textContentStyle.fontWeight = srcStyle.fontWeight);

        textContent = {
            type: 'text',
            style: textContentStyle,
            // ec4 does not support rectText trigger.
            // And when text position is different in normal and emphasis
            // => hover text trigger emphasis;
            // => text position changed, leave mouse pointer immediately;
            // That might cause incorrect state.
            silent: true
        };
        textConfig = {};
        const hasOwnPos = hasOwn(srcStyle, 'textPosition');
        if (isNormal) {
            textConfig.position = hasOwnPos ? srcStyle.textPosition : 'inside';
        }
        else {
            hasOwnPos && (textConfig.position = srcStyle.textPosition);
        }
        hasOwn(srcStyle, 'textPosition') && (textConfig.position = srcStyle.textPosition);
        hasOwn(srcStyle, 'textOffset') && (textConfig.offset = srcStyle.textOffset);
        hasOwn(srcStyle, 'textRotation') && (textConfig.rotation = srcStyle.textRotation);
        hasOwn(srcStyle, 'textDistance') && (textConfig.distance = srcStyle.textDistance);
    }

    convertEC4CompatibleRichItem(textContentStyle, hostStyle);

    each(textContentStyle.rich, function (richItem) {
        convertEC4CompatibleRichItem(richItem as TextStyleProps, richItem);
    });

    return {
        textConfig: textConfig,
        textContent: textContent
    };
}

/**
 * The result will be set to `out`.
 */
function convertEC4CompatibleRichItem(out: TextStylePropsPart, richItem: Dictionary<any>): void {
    if (!richItem) {
        return;
    }
    // (1) For simplicity, make textXXX properties (deprecated since ec5) has
    // higher priority. For example, consider in ec4 `borderColor: 5, textBorderColor: 10`
    // on a rect means `borderColor: 4` on the rect and `borderColor: 10` on an attached
    // richText in ec5.
    // (2) `out === richItem` if and only if `out` is text el or rich item.
    // So we can overwrite existing props in `out` since textXXX has higher priority.
    richItem.font = richItem.textFont || richItem.font;
    hasOwn(richItem, 'textStrokeWidth') && (out.lineWidth = richItem.textStrokeWidth);
    hasOwn(richItem, 'textAlign') && (out.align = richItem.textAlign);
    hasOwn(richItem, 'textVerticalAlign') && (out.verticalAlign = richItem.textVerticalAlign);
    hasOwn(richItem, 'textLineHeight') && (out.lineHeight = richItem.textLineHeight);
    hasOwn(richItem, 'textWidth') && (out.width = richItem.textWidth);
    hasOwn(richItem, 'textHeight') && (out.height = richItem.textHeight);
    hasOwn(richItem, 'textBackgroundColor') && (out.backgroundColor = richItem.textBackgroundColor);
    hasOwn(richItem, 'textPadding') && (out.padding = richItem.textPadding);
    hasOwn(richItem, 'textBorderColor') && (out.borderColor = richItem.textBorderColor);
    hasOwn(richItem, 'textBorderWidth') && (out.borderWidth = richItem.textBorderWidth);
    hasOwn(richItem, 'textBorderRadius') && (out.borderRadius = richItem.textBorderRadius);
    hasOwn(richItem, 'textBoxShadowColor') && (out.shadowColor = richItem.textBoxShadowColor);
    hasOwn(richItem, 'textBoxShadowBlur') && (out.shadowBlur = richItem.textBoxShadowBlur);
    hasOwn(richItem, 'textBoxShadowOffsetX') && (out.shadowOffsetX = richItem.textBoxShadowOffsetX);
    hasOwn(richItem, 'textBoxShadowOffsetY') && (out.shadowOffsetY = richItem.textBoxShadowOffsetY);
}

/**
 * Convert to pure echarts4 format style.
 * `itemStyle` will be modified, added with ec4 style properties from
 * `textStyle` and `textConfig`.
 *
 * [Caveat]: For simplicity, `insideRollback` in ec4 does not compat, where
 * `styleEmphasis: {textFill: 'red'}` will remove the normal auto added stroke.
 */
export function convertToEC4StyleForCustomSerise(
    itemStl: ItemStyleProps,
    txStl: TextStyleProps,
    txCfg: ElementTextConfig
): ZRStyleProps {

    const out = itemStl as Dictionary<unknown>;

    // See `custom.ts`, a trick to set extra `textPosition` firstly.
    out.textPosition = out.textPosition || txCfg.position || 'inside';
    txCfg.offset != null && (out.textOffset = txCfg.offset);
    txCfg.rotation != null && (out.textRotation = txCfg.rotation);
    txCfg.distance != null && (out.textDistance = txCfg.distance);

    const isInside = (out.textPosition as string).indexOf('inside') >= 0;
    const hostFill = itemStl.fill || '#000';

    convertToEC4RichItem(out, txStl);

    const textFillNotSet = out.textFill == null;
    if (isInside) {
        if (textFillNotSet) {
            out.textFill = txCfg.insideFill || '#fff';
            !out.textStroke && txCfg.insideStroke && (out.textStroke = txCfg.insideStroke);
            !out.textStroke && (out.textStroke = hostFill);
            out.textStrokeWidth == null && (out.textStrokeWidth = 2);
        }
    }
    else {
        if (textFillNotSet) {
            out.textFill = itemStl.fill || txCfg.outsideFill || '#000';
        }
        !out.textStroke && txCfg.outsideStroke && (out.textStroke = txCfg.outsideStroke);
    }

    out.text = txStl.text;
    out.rich = txStl.rich;

    each(txStl.rich, function (richItem) {
        convertToEC4RichItem(richItem as Dictionary<unknown>, richItem);
    });

    return out;
}

function convertToEC4RichItem(out: Dictionary<unknown>, richItem: TextStylePropsPart) {
    if (!richItem) {
        return;
    }

    hasOwn(richItem, 'fill') && (out.textFill = richItem.fill);
    hasOwn(richItem, 'stroke') && (out.textStroke = richItem.fill);

    hasOwn(richItem, 'lineWidth') && (out.textStrokeWidth = richItem.lineWidth);
    hasOwn(richItem, 'font') && (out.font = richItem.font);
    hasOwn(richItem, 'fontStyle') && (out.fontStyle = richItem.fontStyle);
    hasOwn(richItem, 'fontWeight') && (out.fontWeight = richItem.fontWeight);
    hasOwn(richItem, 'fontSize') && (out.fontSize = richItem.fontSize);
    hasOwn(richItem, 'fontFamily') && (out.fontFamily = richItem.fontFamily);

    hasOwn(richItem, 'align') && (out.textAlign = richItem.align);
    hasOwn(richItem, 'verticalAlign') && (out.textVerticalAlign = richItem.verticalAlign);
    hasOwn(richItem, 'lineHeight') && (out.textLineHeight = richItem.lineHeight);
    hasOwn(richItem, 'width') && (out.textWidth = richItem.width);
    hasOwn(richItem, 'height') && (out.textHeight = richItem.height);

    hasOwn(richItem, 'backgroundColor') && (out.textBackgroundColor = richItem.backgroundColor);
    hasOwn(richItem, 'padding') && (out.textPadding = richItem.padding);
    hasOwn(richItem, 'borderColor') && (out.textBorderColor = richItem.borderColor);
    hasOwn(richItem, 'borderWidth') && (out.textBorderWidth = richItem.borderWidth);
    hasOwn(richItem, 'borderRadius') && (out.textBorderRadius = richItem.borderRadius);

    hasOwn(richItem, 'shadowColor') && (out.textBoxShadowColor = richItem.shadowColor);
    hasOwn(richItem, 'shadowBlur') && (out.textBoxShadowBlur = richItem.shadowBlur);
    hasOwn(richItem, 'shadowOffsetX') && (out.textBoxShadowOffsetX = richItem.shadowOffsetX);
    hasOwn(richItem, 'shadowOffsetY') && (out.textBoxShadowOffsetY = richItem.shadowOffsetY);

    hasOwn(richItem, 'textShadowColor') && (out.textShadowColor = richItem.textShadowColor);
    hasOwn(richItem, 'textShadowBlur') && (out.textShadowBlur = richItem.textShadowBlur);
    hasOwn(richItem, 'textShadowOffsetX') && (out.textShadowOffsetX = richItem.textShadowOffsetX);
    hasOwn(richItem, 'textShadowOffsetY') && (out.textShadowOffsetY = richItem.textShadowOffsetY);
}

export function warnDeprecated(deprecated: string, insteadApproach: string): void {
    if (__DEV__) {
        const key = deprecated + '^_^' + insteadApproach;
        if (!deprecatedLogs[key]) {
            console.warn(`[ECharts] DEPRECATED: "${deprecated}" has been deprecated. ${insteadApproach}`);
            deprecatedLogs[key] = true;
        }
    }
}
