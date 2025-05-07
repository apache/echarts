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

// FIXME: use only one definition with
//  {SSRItemType} from '../../../src/util/innerStore';
type SSRItemType = 'legend' | 'chart';

export interface ECSSRClientEventParams {
    type: ECSSREvent;
    ssrType: SSRItemType;
    seriesIndex?: number;
    dataIndex?: number;
    event: Event;
}

export interface ECSSRClientOptions {
    on?: {
        mouseover?: (params: ECSSRClientEventParams) => void;
        mouseout?: (params: ECSSRClientEventParams) => void;
        click?: (params: ECSSRClientEventParams) => void;
    }
}

export type ECSSREvent = 'mouseover' | 'mouseout' | 'click';

export function hydrate(dom: HTMLElement, options: ECSSRClientOptions): void {
    const svgRoot = dom.querySelector('svg');
    if (!svgRoot) {
        console.error('No SVG element found in the DOM.');
        return;
    }

    function getIndex(child: Element, attr: string): number | undefined {
        const index = child.getAttribute(attr);
        if (index) {
            return parseInt(index, 10);
        }
        else {
            return undefined;
        }
    }

    const listeners = options.on || {};
    for (const rawEvtName in listeners) {
        if (!listeners.hasOwnProperty(rawEvtName)) {
            continue;
        }
        const eventName = rawEvtName as ECSSREvent;
        const listener = listeners[eventName as ECSSREvent];
        if (!isFunction(listener)) {
            continue;
        }

        svgRoot.addEventListener(eventName, event => {
            const targetEl = event.target as Element;
            if (!targetEl || !isFunction(targetEl.getAttribute)) {
                return;
            }
            const type = targetEl.getAttribute('ecmeta_ssr_type');
            const silent = targetEl.getAttribute('ecmeta_silent') === 'true';
            if (!type || silent) {
                return;
            }
            listener({
                type: eventName,
                ssrType: type as SSRItemType,
                seriesIndex: getIndex(targetEl, 'ecmeta_series_index'),
                dataIndex: getIndex(targetEl, 'ecmeta_data_index'),
                event
            });
        });

    }
}

function isFunction(value: any): value is Function {
    return typeof value === 'function';
}
