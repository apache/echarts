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

import { Dictionary } from './types';

const ECHARTS_PREFIX = '[ECharts] ';
const storedLogs: Dictionary<boolean> = {};

const hasConsole = typeof console !== 'undefined'
    // eslint-disable-next-line
    && console.warn && console.log;

export function log(str: string) {
    if (hasConsole) {
        // eslint-disable-next-line
        console.log(ECHARTS_PREFIX + str);
    }
}

export function warn(str: string) {
    if (hasConsole) {
        console.warn(ECHARTS_PREFIX + str);
    }
}

export function deprecateLog(str: string) {
    if (__DEV__) {
        if (storedLogs[str]) {  // Not display duplicate message.
            return;
        }
        if (hasConsole) {
            storedLogs[str] = true;
                console.warn(ECHARTS_PREFIX + 'DEPRECATED: ' + str);
        }
    }
}

export function deprecateReplaceLog(oldOpt: string, newOpt: string, scope?: string) {
    if (__DEV__) {
        deprecateLog((scope ? `[${scope}]` : '') + `${oldOpt} is deprecated, use ${newOpt} instead.`);
    }
}