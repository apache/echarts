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

import { Text } from '../util/graphic';
import { deprecateLog } from '../util/log';

type TextStyleProps = Text['style'];
export function getTextRect(
    text: TextStyleProps['text'],
    font?: TextStyleProps['font'],
    align?: TextStyleProps['align'],
    verticalAlign?: TextStyleProps['verticalAlign'],
    padding?: TextStyleProps['padding'],
    rich?: TextStyleProps['rich'],
    truncate?: boolean,
    lineHeight?: number
) {
    deprecateLog('getTextRect is deprecated.');

    const textEl = new Text({
        style: {
            text,
            font,
            align,
            verticalAlign,
            padding,
            rich,
            overflow: truncate ? 'truncate' : null,
            lineHeight
        }
    });

    return textEl.getBoundingRect();
}