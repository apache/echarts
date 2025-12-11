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

import { extend } from 'zrender/src/core/util';
import { modifyHSL } from 'zrender/src/tool/color';

interface ColorToken {
    theme: string[];
    neutral00: string;
    neutral05: string;
    neutral10: string;
    neutral15: string;
    neutral20: string;
    neutral25: string;
    neutral30: string;
    neutral35: string;
    neutral40: string;
    neutral45: string;
    neutral50: string;
    neutral55: string;
    neutral60: string;
    neutral65: string;
    neutral70: string;
    neutral75: string;
    neutral80: string;
    neutral85: string;
    neutral90: string;
    neutral95: string;
    neutral99: string;
    accent05: string;
    accent10: string;
    accent15: string;
    accent20: string;
    accent25: string;
    accent30: string;
    accent35: string;
    accent40: string;
    accent45: string;
    accent50: string;
    accent55: string;
    accent60: string;
    accent65: string;
    accent70: string;
    accent75: string;
    accent80: string;
    accent85: string;
    accent90: string;
    accent95: string;
    transparent: string;
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary: string;
    disabled: string;
    highlight: string;
    border: string;
    borderTint: string;
    borderShade: string;
    background: string;
    backgroundTint: string;
    backgroundTransparent: string;
    backgroundShade: string;
    shadow: string;
    shadowTint: string;
    axisLine: string;
    axisLineTint: string;
    axisTick: string;
    axisTickMinor: string;
    axisLabel: string;
    axisSplitLine: string;
    axisMinorSplitLine: string;
}

interface Tokens {
    color: ColorToken;
    darkColor: ColorToken;
    size: {
        xxs: number;
        xs: number;
        s: number;
        m: number;
        l: number;
        xl: number;
        xxl: number;
        xxxl: number;
    };
}

const tokens: Tokens = {
    color: {} as Tokens['color'],
    darkColor: {} as Tokens['darkColor'],
    size: {} as Tokens['size']
};

const color = tokens.color = {
    theme: [
        '#5070dd',
        '#b6d634',
        '#505372',
        '#ff994d',
        '#0ca8df',
        '#ffd10a',
        '#fb628b',
        '#785db0',
        '#3fbe95'
    ],

    neutral00: '#fff',
    neutral05: '#f4f7fd',
    neutral10: '#e8ebf0',
    neutral15: '#dbdee4',
    neutral20: '#cfd2d7',
    neutral25: '#c3c5cb',
    neutral30: '#b7b9be',
    neutral35: '#aaacb2',
    neutral40: '#9ea0a5',
    neutral45: '#929399',
    neutral50: '#86878c',
    neutral55: '#797b7f',
    neutral60: '#6d6e73',
    neutral65: '#616266',
    neutral70: '#54555a',
    neutral75: '#48494d',
    neutral80: '#3c3c41',
    neutral85: '#303034',
    neutral90: '#232328',
    neutral95: '#17171b',
    neutral99: '#000',

    accent05: '#eff1f9',
    accent10: '#e0e4f2',
    accent15: '#d0d6ec',
    accent20: '#c0c9e6',
    accent25: '#b1bbdf',
    accent30: '#a1aed9',
    accent35: '#91a0d3',
    accent40: '#8292cc',
    accent45: '#7285c6',
    accent50: '#6578ba',
    accent55: '#5c6da9',
    accent60: '#536298',
    accent65: '#4a5787',
    accent70: '#404c76',
    accent75: '#374165',
    accent80: '#2e3654',
    accent85: '#252b43',
    accent90: '#1b2032',
    accent95: '#121521',

    transparent: 'rgba(0,0,0,0)',

    highlight: 'rgba(255,231,130,0.8)'
} as Tokens['color'];

extend(color, {
    primary: color.neutral80,
    secondary: color.neutral70,
    tertiary: color.neutral60,
    quaternary: color.neutral50,
    disabled: color.neutral20,

    border: color.neutral30,
    borderTint: color.neutral20,
    borderShade: color.neutral40,

    background: color.neutral05,
    backgroundTint: 'rgba(234,237,245,0.5)',
    backgroundTransparent: 'rgba(255,255,255,0)',
    backgroundShade: color.neutral10,

    shadow: 'rgba(0,0,0,0.2)',
    shadowTint: 'rgba(129,130,136,0.2)',

    axisLine: color.neutral70,
    axisLineTint: color.neutral40,
    axisTick: color.neutral70,
    axisTickMinor: color.neutral60,
    axisLabel: color.neutral70,
    axisSplitLine: color.neutral15,
    axisMinorSplitLine: color.neutral05,
} as Tokens['color']);

for (const key in color) {
    if (color.hasOwnProperty(key)) {
        const hex = color[key as keyof ColorToken];
        if (key === 'theme') {
            // Don't modify theme colors.
            tokens.darkColor.theme = color.theme.slice();
        }
        else if (key === 'highlight') {
            tokens.darkColor.highlight = 'rgba(255,231,130,0.4)';
        }
        else if (key.indexOf('accent') === 0) {
            // Desaturate and lighten accent colors.
            tokens.darkColor[key as keyof Omit<ColorToken, 'theme'>] =
                modifyHSL(hex as string, null, s => s * 0.5, l => Math.min(1, 1.3 - l));
        }
        else {
            tokens.darkColor[key as keyof Omit<ColorToken, 'theme'>] =
                modifyHSL(hex as string, null, s => s * 0.9, l => 1 - Math.pow(l, 1.5));
        }
    }
}


tokens.size = {
    xxs: 2,
    xs: 5,
    s: 10,
    m: 15,
    l: 20,
    xl: 30,
    xxl: 40,
    xxxl: 50
};

export default tokens;
