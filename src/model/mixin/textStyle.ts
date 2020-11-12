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

import * as graphicUtil from '../../util/graphic';
import {getFont} from '../../label/labelStyle';
import Model from '../Model';
import { LabelOption, ColorString } from '../../util/types';
import ZRText from 'zrender/src/graphic/Text';

const PATH_COLOR = ['textStyle', 'color'] as const;

export type LabelFontOption = Pick<LabelOption, 'fontStyle' | 'fontWeight' | 'fontSize' | 'fontFamily'>;
type LabelRectRelatedOption = Pick<LabelOption,
    'align' | 'verticalAlign' | 'padding' | 'lineHeight' | 'baseline' | 'rich'
> & LabelFontOption;

// TODO Performance improvement?
const tmpRichText = new ZRText();
class TextStyleMixin {
    /**
     * Get color property or get color from option.textStyle.color
     */
    // TODO Callback
    getTextColor(this: Model, isEmphasis?: boolean): ColorString {
        const ecModel = this.ecModel;
        return this.getShallow('color')
            || (
                (!isEmphasis && ecModel) ? ecModel.get(PATH_COLOR) : null
            );
    }

    /**
     * Create font string from fontStyle, fontWeight, fontSize, fontFamily
     * @return {string}
     */
    getFont(this: Model<LabelFontOption>) {
        return getFont({
            fontStyle: this.getShallow('fontStyle'),
            fontWeight: this.getShallow('fontWeight'),
            fontSize: this.getShallow('fontSize'),
            fontFamily: this.getShallow('fontFamily')
        }, this.ecModel);
    }

    getTextRect(this: Model<LabelRectRelatedOption> & TextStyleMixin, text: string): graphicUtil.BoundingRect {
        tmpRichText.useStyle({
            text,
            fontStyle: this.getShallow('fontStyle'),
            fontWeight: this.getShallow('fontWeight'),
            fontSize: this.getShallow('fontSize'),
            fontFamily: this.getShallow('fontFamily'),
            verticalAlign: this.getShallow('verticalAlign') || this.getShallow('baseline'),
            padding: this.getShallow('padding') as number[],
            lineHeight: this.getShallow('lineHeight'),
            rich: this.getShallow('rich')
        });
        tmpRichText.update();
        return tmpRichText.getBoundingRect();
    }
};

export default TextStyleMixin;