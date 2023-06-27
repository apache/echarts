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

export interface ECSSRClientEventParams {}

export interface ECSSRClientOptions {
    on?: {
        mouseover?: (params: ECSSRClientEventParams) => void,
        mouseout?: (params: ECSSRClientEventParams) => void,
        click?: (params: ECSSRClientEventParams) => void
    }
}

export type ECSSREvent = 'mouseover' | 'mouseout' | 'click';

export function hydrate(dom: HTMLElement, options: ECSSRClientOptions) {
    const svgRoot = dom.querySelector('svg');
    if (!svgRoot) {
        console.error('No SVG element found in the DOM.');
        return;
    }

    const children = svgRoot.children;

    function getIndex(child: Element, attr: string) {
        const index = child.getAttribute(attr);
        if (index) {
            return parseInt(index, 10);
        }
        else {
            return null;
        }
    }

    const events = options.on;
    if (events) {
        for (let eventName in events) {
            if (typeof events[eventName as ECSSREvent] === 'function') {
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    const type = child.getAttribute('ecmeta_ssr_type');
                    const silent = child.getAttribute('ecmeta_silent') === 'true';
                    if (type && !silent) {
                        child.addEventListener(eventName, e => {
                            (events[eventName as ECSSREvent] as Function)({
                                type: eventName,
                                ssrType: type,
                                seriesIndex: getIndex(child, 'ecmeta_series_index'),
                                dataIndex: getIndex(child, 'ecmeta_data_index'),
                                event: e,
                            });
                        });
                    }
                }
            }
        }
    }
}
