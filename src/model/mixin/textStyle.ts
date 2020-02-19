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

import * as textContain from 'zrender/src/contain/text';
import * as graphicUtil from '../../util/graphic';
import Model from '../Model';
import { LabelOption } from '../../util/types';

var PATH_COLOR = ['textStyle', 'color'] as const;

class TextStyleMixin {
    /**
     * Get color property or get color from option.textStyle.color
     * @param {boolean} [isEmphasis]
     * @return {string}
     */
    getTextColor(this: Model, isEmphasis?: boolean) {
        var ecModel = this.ecModel;
        return this.getShallow('color')
            || (
                (!isEmphasis && ecModel) ? ecModel.get(PATH_COLOR) : null
            );
    }

    /**
     * Create font string from fontStyle, fontWeight, fontSize, fontFamily
     * @return {string}
     */
    getFont(this: Model<LabelOption>) {
        return graphicUtil.getFont({
            fontStyle: this.getShallow('fontStyle'),
            fontWeight: this.getShallow('fontWeight'),
            fontSize: this.getShallow('fontSize'),
            fontFamily: this.getShallow('fontFamily')
        }, this.ecModel);
    }

    getTextRect(this: Model<LabelOption> & TextStyleMixin, text: string) {
        return textContain.getBoundingRect(
            text,
            this.getFont(),
            this.getShallow('align'),
            this.getShallow('verticalAlign') || this.getShallow('baseline'),
            this.getShallow('padding') as number[],
            this.getShallow('lineHeight'),
            this.getShallow('rich')
            // this.getShallow('truncateText')
        );
    }
};

export default TextStyleMixin;