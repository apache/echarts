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

/**
 * A mapping of visual provided to deverloper and visual stored in the List module.
 * To developer:
 *  'color', 'opacity', 'symbol', 'symbolSize'...
 * In the List module storage:
 *  'style', 'symbol', 'symbolSize'...
 */
import List from '../data/List';


export function getItemVisualFromData(data: List, dataIndex: number, key: string) {
    switch (key) {
        case 'color':
            const style = data.getItemVisual(dataIndex, 'style');
            return style[data.getVisual('drawType')];
        case 'opacity':
            return data.getItemVisual(dataIndex, 'style').opacity;
        case 'symbol':
        case 'symbolSize':
        case 'liftZ':
            return data.getItemVisual(dataIndex, key);
        default:
            if (__DEV__) {
                console.warn(`Unknown visual type ${key}`);
            }
    }
}

export function getVisualFromData(data: List, key: string) {
    switch (key) {
        case 'color':
            const style = data.getVisual('style');
            return style[data.getVisual('drawType')];
        case 'opacity':
            return data.getVisual('style').opacity;
        case 'symbol':
        case 'symbolSize':
        case 'liftZ':
            return data.getVisual(key);
        default:
            if (__DEV__) {
                console.warn(`Unknown visual type ${key}`);
            }
    }
}

export function setItemVisualFromData(data: List, dataIndex: number, key: string, value: any) {
    switch (key) {
        case 'color':
            // Make sure not sharing style object.
            const style = data.ensureUniqueItemVisual(dataIndex, 'style');
            style[data.getVisual('drawType')] = value;
            // Mark the color has been changed, not from palette anymore
            data.setItemVisual(dataIndex, 'colorFromPalette', false);
            break;
        case 'opacity':
            data.ensureUniqueItemVisual(dataIndex, 'style').opacity = value;
            break;
        case 'symbol':
        case 'symbolSize':
        case 'liftZ':
            data.setItemVisual(dataIndex, key, value);
            break;
        default:
            if (__DEV__) {
                console.warn(`Unknown visual type ${key}`);
            }
    }
}