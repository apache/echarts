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

import { createChart } from '../../../core/utHelper';
import env from 'zrender/src/core/env';
import HandlerDomProxy from 'zrender/src/dom/HandlerProxy';
import { EChartsType } from '../../../../../src/echarts';

describe('enterable tooltip release', function () {
    let chart: EChartsType;
    let external: HTMLDivElement;
    const originalPointer = env.pointerEventsSupported;
    const originalTouch = env.touchEventsSupported;

    afterEach(function () {
        if (chart) {
            const dom = chart.getDom();
            chart.dispose();
            dom.parentNode && dom.parentNode.removeChild(dom);
        }
        external && external.remove();
        env.pointerEventsSupported = originalPointer;
        env.touchEventsSupported = originalTouch;
    });

    function setup(renderer: 'canvas' | 'svg', appendTo: boolean, pointer: boolean, enterable = true) {
        env.pointerEventsSupported = pointer;
        env.touchEventsSupported = false;
        external = document.createElement('div');
        document.body.appendChild(external);
        chart = createChart({opts: {renderer}});
        document.body.appendChild(chart.getDom());
        chart.setOption({
            animation: false,
            tooltip: {
                enterable,
                appendTo: appendTo ? external : undefined,
                alwaysShowContent: true,
                position: [200, 100],
                formatter: '<button><span>child</span></button>'
            },
            series: [{
                type: 'graph', layout: 'none', roam: true,
                data: [{name: 'a', x: 0, y: 0}, {name: 'b', x: 100, y: 100}]
            }]
        });
        chart.dispatchAction({type: 'showTip', seriesIndex: 0, dataIndex: 0});
        const proxy = chart.getZr().handler.proxy as HandlerDomProxy;
        let tooltip = (appendTo ? external : chart.getDom()).querySelector('button').parentElement;
        while (!(tooltip as any).domBelongToZr) {
            tooltip = tooltip.parentElement;
        }
        const pan = jest.fn();
        const up = jest.fn();
        chart.on('graphroam', pan);
        chart.getZr().on('mouseup', up);
        function send(target: Element, type: string, x = 250, y = 200) {
            const name = pointer ? type.replace('mouse', 'pointer') : type;
            const e = new MouseEvent(name, {bubbles: true, cancelable: true, clientX: x, clientY: y});
            Object.defineProperty(e, 'offsetX', {value: x});
            Object.defineProperty(e, 'offsetY', {value: y});
            target.dispatchEvent(e);
            return e;
        }
        function start() {
            send(proxy.dom, 'mousedown');
            send(proxy.dom, 'mousemove', 260, 200);
            expect(proxy.__pointerCapturing).toBe(true);
            expect(pan).toHaveBeenCalled();
        }
        return {proxy, tooltip, pan, up, send, start};
    }

    (['canvas', 'svg'] as const).forEach(function (renderer) {
        it(`${renderer}: does not duplicate a release that bubbles through the renderer`, async function () {
            const {proxy, tooltip, up, send, start} = setup(renderer, false, false);
            // appendTo may place the tooltip inside the renderer's event root.
            proxy.dom.appendChild(tooltip);
            start();
            send(tooltip.querySelector('span'), 'mouseup');
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(up).toHaveBeenCalledTimes(1);
            expect(proxy.__pointerCapturing).toBe(false);
        });
        [false, true].forEach(function (pointer) {
            it(`${renderer}, pointer=${pointer}: nested child may stop release bubbling`, async function () {
                const {proxy, tooltip, up, send, start, pan} = setup(renderer, false, pointer);
                proxy.dom.appendChild(tooltip);
                const child = tooltip.querySelector('span');
                child.addEventListener(pointer ? 'pointerup' : 'mouseup', e => e.stopPropagation());
                start();
                send(child, 'mouseup');
                await new Promise(resolve => setTimeout(resolve, 0));
                expect(proxy.__pointerCapturing).toBe(false);
                expect(up).toHaveBeenCalledTimes(1);
                const count = pan.mock.calls.length;
                send(proxy.dom, 'mousemove', 280, 200);
                expect(pan).toHaveBeenCalledTimes(count);
            });
        });
        it(`${renderer}: pending release cannot end a new gesture`, async function () {
            const {proxy, tooltip, up, send, start} = setup(renderer, false, false);
            proxy.dom.appendChild(tooltip);
            const child = tooltip.querySelector('span');
            child.addEventListener('mouseup', e => e.stopPropagation());
            start();
            send(child, 'mouseup');
            send(proxy.dom, 'mousedown', 260, 200);
            send(proxy.dom, 'mousemove', 270, 200);
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(proxy.__pointerCapturing).toBe(true);
            expect(up).not.toHaveBeenCalled();
            send(proxy.dom, 'mouseup');
            expect(up).toHaveBeenCalledTimes(1);
        });
        it(`${renderer}: dispose cancels a pending release`, async function () {
            const {proxy, tooltip, up, send, start} = setup(renderer, false, false);
            proxy.dom.appendChild(tooltip);
            const child = tooltip.querySelector('span');
            child.addEventListener('mouseup', e => e.stopPropagation());
            start();
            send(child, 'mouseup');
            const dom = chart.getDom();
            chart.dispose();
            dom.remove();
            chart = null;
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(up).not.toHaveBeenCalled();
        });
        it(`${renderer}: a custom proxy without capture methods is left alone`, function () {
            const {proxy, tooltip, send} = setup(renderer, false, false);
            const custom = {dom: proxy.dom, __pointerCapturing: true, trigger: jest.fn()};
            const handler = chart.getZr().handler;
            const error = jest.fn((e: ErrorEvent) => e.preventDefault());
            window.addEventListener('error', error);
            try {
                handler.proxy = custom as any;
                send(tooltip.querySelector('span'), 'mouseup');
                expect(error).not.toHaveBeenCalled();
                expect(custom.trigger).not.toHaveBeenCalled();
                expect(custom.__pointerCapturing).toBe(true);
            }
            finally {
                handler.proxy = proxy;
                window.removeEventListener('error', error);
            }
        });
        [false, true].forEach(function (appendTo) {
            [false, true].forEach(function (pointer) {
                it(`${renderer}, external=${appendTo}, pointer=${pointer}: releases and restarts repeatedly`, function () {
                    const {proxy, tooltip, pan, up, send, start} = setup(renderer, appendTo, pointer);
                    // Capture on the tooltip also handles a child which stops bubbling.
                    const child = tooltip.querySelector('span');
                    child.addEventListener(pointer ? 'pointerup' : 'mouseup', e => e.stopPropagation());
                    for (let cycle = 0; cycle < 3; cycle++) {
                        pan.mockClear();
                        start();
                        const event = send(cycle % 2 ? tooltip : child, 'mouseup');
                        expect(event.defaultPrevented).toBe(false);
                        expect(proxy.__pointerCapturing).toBe(false);
                        expect(proxy.__mayPointerCapture).toBeNull();
                        expect(up).toHaveBeenCalledTimes(cycle + 1);
                        const count = pan.mock.calls.length;
                        send(proxy.dom, 'mousemove', 270, 200);
                        send(document.body, 'mousemove', 800, 600);
                        expect(pan).toHaveBeenCalledTimes(count);
                    }
                    // Compatibility mouseup after pointerup must not duplicate the release.
                    child.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                    expect(up).toHaveBeenCalledTimes(3);
                    // A tooltip-only interaction must not dispatch renderer events.
                    send(child, 'mousedown');
                    send(child, 'mouseup');
                    expect(up).toHaveBeenCalledTimes(3);
                });
            });
            it(`${renderer}, external=${appendTo}: releases before capture starts`, function () {
                const {proxy, tooltip, up, send, pan} = setup(renderer, appendTo, false);
                send(proxy.dom, 'mousedown');
                send(tooltip, 'mouseup');
                expect(proxy.__mayPointerCapture).toBeNull();
                expect(up).toHaveBeenCalledTimes(1);
                send(proxy.dom, 'mousemove', 260, 200);
                expect(pan).not.toHaveBeenCalled();
            });
            it(`${renderer}, external=${appendTo}: non-enterable and outside releases`, function () {
                const {proxy, up, send, start, pan} = setup(renderer, appendTo, false, false);
                start();
                // In a browser pointer-events:none targets the renderer underneath.
                send(proxy.dom, 'mouseup');
                expect(up).toHaveBeenCalledTimes(1);
                start();
                send(document.body, 'mouseup', 800, 600);
                expect(up).toHaveBeenCalledTimes(2);
                expect(proxy.__pointerCapturing).toBe(false);
                const count = pan.mock.calls.length;
                send(proxy.dom, 'mousemove', 280, 200);
                expect(pan).toHaveBeenCalledTimes(count);
            });
        });
    });
});
