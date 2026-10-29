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

/* global jest */

import { EChartsType } from '@/src/echarts';
import { createChart, getECModel } from '../../core/utHelper';
import Rect from 'zrender/src/graphic/shape/Rect';

describe('stacked bar animation', () => {
    let chart: EChartsType;

    beforeEach(() => {
        jest.useFakeTimers('modern');
        jest.setSystemTime(0);
    });

    afterEach(() => {
        chart.dispose();
        jest.useRealTimers();
    });

    function bars() {
        return getECModel(chart).getSeries().map(series => series.getData().getItemGraphicEl(0) as Rect);
    }

    // Sample real animation tracks, including their easing, at the same elapsed time.
    function frame(elapsed: number) {
        chart.getZr().storage.traverse(el => {
            el.animators.forEach(animator => {
                const clip = animator.getClip();
                if (clip) {
                    clip.step(0, 0);
                    clip.step(elapsed, elapsed);
                }
            });
        });
    }

    function finish() {
        chart.getZr().storage.traverse(el => el.stopAnimation(null, true));
    }

    ['canvas', 'svg'].forEach((renderer: 'canvas' | 'svg') => {
        [false, true].forEach(horizontal => {
            [false, true].forEach(inverse => {
                [1, -1].forEach(sign => {
                    const description = `${renderer}, horizontal=${horizontal}, inverse=${inverse}, sign=${sign}`;
                    it('keeps initial and restored segments adjacent: ' + description, () => {
                        chart = createChart({opts: {renderer}});
                        chart.setOption({
                            animationDuration: 1000,
                            animationDurationUpdate: 400,
                            animationEasing: 'linear',
                            animationEasingUpdate: 'cubicInOut',
                            legend: {},
                            xAxis: horizontal ? {inverse} : {data: ['a']},
                            yAxis: horizontal ? {data: ['a']} : {inverse},
                            series: [3, 2, 4].map((value, i) => ({
                                name: ['A', 'B', 'C'][i], type: 'bar', stack: 's', data: [sign * value]
                            }))
                        });
                        chart.getZr().animation.stop();
                        const position = horizontal ? 'x' : 'y';
                        const size = horizontal ? 'width' : 'height';
                        function expectAdjacent() {
                            const els = bars();
                            for (let i = 1; i < els.length; i++) {
                                expect(els[i].shape[position]).toBeCloseTo(
                                    els[i - 1].shape[position] + els[i - 1].shape[size], 8
                                );
                            }
                        }
                        frame(500);
                        expectAdjacent();
                        const targetSize = getECModel(chart).getSeriesByIndex(1).getData().getItemLayout(0)[size];
                        expect(bars()[1].shape[size]).toBeCloseTo(targetSize / 2, 8);
                        expect(bars()[1].animators.some(animator => animator.scope === 'enter')).toBe(true);
                        finish();
                        for (let i = 0; i < 2; i++) {
                            chart.dispatchAction({type: 'legendUnSelect', name: 'B'});
                            finish();
                            chart.dispatchAction({type: 'legendSelect', name: 'B'});
                            [100, 200, 300].forEach(elapsed => {
                                frame(elapsed);
                                expectAdjacent();
                            });
                            expect(bars()[1].animators.some(animator => animator.scope === 'update')).toBe(true);
                            finish();
                        }
                        chart.setOption({series: [{data: [sign * 4]}, {data: [sign]}, {data: [sign * 2]}]});
                        frame(200);
                        expectAdjacent();
                    });
                });
            });
        });
    });

    ['canvas', 'svg'].forEach((renderer: 'canvas' | 'svg') => {
        [false, true].forEach(horizontal => {
            [false, true].forEach(inverse => {
                [false, true].forEach(viaOption => {
                    const title = `continues interrupted legend transitions: ${renderer}, ${horizontal}, ${inverse}, `
                        + `setOption=${viaOption}, delay=%i`;
                    it.each([0, 40])(title, delay => {
                        chart = createChart({opts: {renderer}});
                        chart.setOption({
                            animationDuration: 1000,
                            animationDurationUpdate: 400,
                            animationDelayUpdate: delay,
                            animationEasing: 'linear',
                            animationEasingUpdate: 'cubicInOut',
                            legend: {},
                            xAxis: horizontal ? {inverse} : {data: ['positive', 'negative']},
                            yAxis: horizontal ? {data: ['positive', 'negative']} : {inverse},
                            series: [3, 2, 4].map((value, index) => ({
                                name: ['A', 'B', 'C'][index], type: 'bar', stack: 's', data: [value, -value]
                            }))
                        });
                        chart.getZr().animation.stop();
                        let time = 0;
                        function advance(ms: number) {
                            jest.setSystemTime(time += ms);
                            chart.getZr().animation.update();
                        }
                        advance(0);
                        advance(1000);
                        const series = getECModel(chart).getSeries();
                        const elements = series.map(model => [0, 1].map(index =>
                            model.getData().getItemGraphicEl(index) as Rect));
                        const position = horizontal ? 'x' : 'y';
                        const size = horizontal ? 'width' : 'height';
                        function expectConnected() {
                            for (let category = 0; category < 2; category++) {
                                for (let segment = 1; segment < 3; segment++) {
                                    const previous = elements[segment - 1][category].shape;
                                    expect(elements[segment][category].shape[position])
                                        .toBeCloseTo(previous[position] + previous[size], 8);
                                }
                            }
                        }
                        function toggle(selected: boolean) {
                            if (viaOption) {
                                chart.setOption({legend: {selected: {B: selected}}});
                            }
                            else {
                                chart.dispatchAction({type: selected ? 'legendSelect' : 'legendUnSelect', name: 'B'});
                            }
                            advance(0);
                        }
                        [false, true, false, true].forEach(selected => {
                            const shapes = elements.map(items => items.map(el => ({...el.shape})));
                            toggle(selected);
                            elements.forEach((items, segment) => items.forEach((el, category) => {
                                expect(el.shape[position]).toBeCloseTo(shapes[segment][category][position], 8);
                                expect(el.shape[size]).toBeCloseTo(shapes[segment][category][size], 8);
                                expect(el.parent).not.toBeNull();
                            }));
                            if (selected) {
                                expect(series[1].getData().getItemGraphicEl(0)).toBe(elements[1][0]);
                            }
                            expectConnected();
                            [30, 30, 60].forEach(ms => {
                                advance(ms);
                                expectConnected();
                            });
                        });
                        advance(400 + delay);
                        expectConnected();
                        toggle(false);
                        advance(400 + delay);
                        elements[1].forEach(el => expect(el.parent).toBeNull());
                        toggle(true);
                        elements[1] = [0, 1].map(index => series[1].getData().getItemGraphicEl(index) as Rect);
                        advance(200);
                        expectConnected();
                        // Hide a partially expanded bar, then reverse its shrinking animation.
                        const partialSize = Math.abs(elements[1][0].shape[size]);
                        const targetSize = Math.abs(series[1].getData().getItemLayout(0)[size]);
                        expect(partialSize).toBeGreaterThan(0);
                        expect(partialSize).toBeLessThan(targetSize);
                        toggle(false);
                        expect(Math.abs(elements[1][0].shape[size])).toBeCloseTo(partialSize, 8);
                        advance(200);
                        const shrinkingSize = Math.abs(elements[1][0].shape[size]);
                        expect(shrinkingSize).toBeGreaterThan(0);
                        expect(shrinkingSize).toBeLessThan(partialSize);
                        expectConnected();
                        toggle(true);
                        expect(Math.abs(elements[1][0].shape[size])).toBeCloseTo(shrinkingSize, 8);
                        advance(200);
                        expect(Math.abs(elements[1][0].shape[size])).toBeGreaterThan(shrinkingSize);
                        expectConnected();
                    });
                });
            });
        });
    });

    [false, true].forEach(horizontal => {
        [false, true].forEach(inverse => {
            [
                {min: -10, max: 12, startValue: -5, values: [3, 2, 4], clip: true},
                {min: 2, max: 12, startValue: -5, values: [3, 2, 4], clip: true},
                {min: -12, max: -2, startValue: 0, values: [-3, -2, -4], clip: true},
                {min: 2, max: 12, startValue: -5, values: [3, 2, 4], clip: false}
            ].forEach(({min, max, startValue, values, clip}) => {
                const title = `starts at the visible baseline: horizontal=${horizontal}, inverse=${inverse}, `
                    + `${min}/${max}, clip=${clip}`;
                it(title, () => {
                    chart = createChart();
                    const valueAxis = {min, max, startValue, inverse};
                    chart.setOption({
                        animationDuration: 1000,
                        animationEasing: 'linear',
                        animationDurationUpdate: 400,
                        animationEasingUpdate: 'linear',
                        legend: {},
                        xAxis: horizontal ? valueAxis : {data: ['a']},
                        yAxis: horizontal ? {data: ['a']} : valueAxis,
                        series: values.map((value, index) => ({
                            name: ['A', 'B', 'C'][index], type: 'bar', stack: 's', clip, data: [value]
                        }))
                    });
                    chart.getZr().animation.stop();
                    const position = horizontal ? 'x' : 'y';
                    const size = horizontal ? 'width' : 'height';
                    const start = clip ? Math.max(min, Math.min(startValue, max)) : startValue;
                    const baseline = chart.convertToPixel({[horizontal ? 'xAxisIndex' : 'yAxisIndex']: 0}, start);
                    frame(0);
                    bars().forEach(el => expect(el.shape[position]).toBeCloseTo(baseline as number, 8));
                    frame(500);
                    const els = bars();
                    for (let i = 1; i < els.length; i++) {
                        expect(els[i].shape[position]).toBeCloseTo(
                            els[i - 1].shape[position] + els[i - 1].shape[size], 8
                        );
                    }
                    finish();
                    chart.dispatchAction({type: 'legendUnSelect', name: 'B'});
                    finish();
                    chart.dispatchAction({type: 'legendSelect', name: 'B'});
                    frame(200);
                    const restored = bars();
                    for (let i = 1; i < restored.length; i++) {
                        expect(restored[i].shape[position]).toBeCloseTo(
                            restored[i - 1].shape[position] + restored[i - 1].shape[size], 8
                        );
                    }
                });
            });
        });
    });

    it('matches categories and skips opposite-sign predecessors when restoring via setOption', () => {
        chart = createChart();
        chart.setOption({
            animationDuration: 1000,
            animationDurationUpdate: 400,
            animationEasingUpdate: 'linear',
            legend: {},
            xAxis: {data: ['a', 'b']},
            yAxis: {},
            series: [
                {name: 'A', type: 'bar', stack: 's', data: [['b', 4], ['a', 3]]},
                {name: 'negative', type: 'bar', stack: 's', data: [['a', -3], ['b', -4]]},
                {name: 'B', type: 'bar', stack: 's', data: [['a', 2], ['b', 3]]},
                {name: 'C', type: 'bar', stack: 's', data: [['a', 4], ['b', 2]]}
            ]
        });
        chart.getZr().animation.stop();
        finish();
        chart.setOption({legend: {selected: {B: false}}});
        finish();
        chart.setOption({legend: {selected: {B: true}}});
        frame(200);
        const series = getECModel(chart).getSeries();
        for (let i = 0; i < 2; i++) {
            const a = (series[0].getData().getItemGraphicEl(1 - i) as Rect).shape;
            const b = (series[2].getData().getItemGraphicEl(i) as Rect).shape;
            const c = (series[3].getData().getItemGraphicEl(i) as Rect).shape;
            expect(b.y).toBeCloseTo(a.y + a.height, 8);
            expect(c.y).toBeCloseTo(b.y + b.height, 8);
        }
    });

    it.each([false, true])('restores an initially deselected series, setOption=%s', viaOption => {
        chart = createChart();
        chart.setOption({
            animationDuration: 1000,
            animationDurationUpdate: 400,
            animationEasingUpdate: 'linear',
            legend: {selected: {B: false}},
            xAxis: {data: ['a']},
            yAxis: {},
            series: [3, 2, 4].map((value, index) => ({
                name: ['A', 'B', 'C'][index], type: 'bar', stack: 's', data: [value]
            }))
        });
        chart.getZr().animation.stop();
        finish();
        if (viaOption) {
            chart.setOption({legend: {selected: {B: true}}});
        }
        else {
            chart.dispatchAction({type: 'legendSelect', name: 'B'});
        }
        frame(200);
        const els = bars();
        expect(els[1].shape.y).toBeCloseTo(els[0].shape.y + els[0].shape.height, 8);
        expect(els[2].shape.y).toBeCloseTo(els[1].shape.y + els[1].shape.height, 8);
    });

    describe('review regressions', () => {
        let time: number;
        function advance(ms: number) {
            jest.setSystemTime(time += ms);
            chart.getZr().animation.update();
        }
        function setup(option: any = {}, renderer: 'canvas' | 'svg' = 'canvas') {
            time = 0;
            chart = createChart({opts: {renderer}});
            chart.setOption({
                animationDuration: 1000, animationDurationUpdate: 400,
                animationEasing: 'linear', animationEasingUpdate: 'linear',
                legend: {}, xAxis: {data: ['a', 'b']}, yAxis: {},
                series: [3, 2, 4].map((v, i) => ({
                    name: ['A', 'B', 'C'][i], type: 'bar', stack: 's', data: [v, -v]
                })), ...option
            });
            chart.getZr().animation.stop();
            advance(0);
        }
        function toggle(name: string, selected: boolean) {
            chart.dispatchAction({type: selected ? 'legendSelect' : 'legendUnSelect', name});
            advance(0);
        }
        function connected(elements: Rect[]) {
            for (let i = 1; i < elements.length; i++) {
                expect(elements[i].shape.y).toBeCloseTo(elements[i - 1].shape.y + elements[i - 1].shape.height, 8);
            }
        }

        ['canvas', 'svg'].forEach((renderer: 'canvas' | 'svg') => {
            [false, true].forEach(viaOption => {
                it(`restores descending stacks: ${renderer}, setOption=${viaOption}`, () => {
                    setup({series: [3, 2, 4].map((v, i) => ({
                        name: ['A', 'B', 'C'][i], type: 'bar', stack: 's', stackOrder: 'seriesDesc', data: [v, -v]
                    }))}, renderer);
                    advance(1000);
                    toggle('B', false);
                    advance(400);
                    if (viaOption) {
                        chart.setOption({legend: {selected: {B: true}}});
                        advance(0);
                    }
                    else {
                        toggle('B', true);
                    }
                    [0, 100, 100, 100].forEach(ms => {
                        advance(ms);
                        [0, 1].forEach(index => connected(getECModel(chart).getSeries().map(model =>
                            model.getData().getItemGraphicEl(index) as Rect).reverse()));
                    });
                    toggle('B', false);
                    advance(100);
                    toggle('B', true);
                    advance(100);
                    [0, 1].forEach(index => connected(getECModel(chart).getSeries().map(model =>
                        model.getData().getItemGraphicEl(index) as Rect).reverse()));
                });
            });
        });

        it.each(['append', 'zoom'])('uses entrance timing for new items: %s', action => {
            setup(action === 'zoom'
                ? {dataZoom: [{type: 'inside', startValue: 0, endValue: 0, filterMode: 'filter'}]}
                : {});
            advance(1000);
            if (action === 'append') {
                chart.setOption({xAxis: {data: ['a', 'b', 'c']}, series: [3, 2, 4].map(v => ({data: [v, -v, v]}))});
            }
            else {
                chart.dispatchAction({type: 'dataZoom', startValue: 0, endValue: 1});
            }
            advance(0);
            advance(500);
            getECModel(chart).getSeries().forEach(model => {
                const data = model.getData();
                const index = data.count() - 1;
                const el = data.getItemGraphicEl(index) as Rect;
                expect(el.animators.some(animator => animator.scope === 'enter')).toBe(true);
                expect(el.shape.height).toBeCloseTo(data.getItemLayout(index).height / 2, 8);
            });
        });

        it.each(['duration', 'easing', 'delay'])('keeps independent entrance positions with different %s', setting => {
            setup({series: [3, 2, 4].map((v, i) => ({
                name: ['A', 'B', 'C'][i], type: 'bar', stack: 's', data: [v, -v],
                ...(setting === 'duration' ? {animationDuration: 1000 + i * 200}
                    : setting === 'easing' ? {animationEasing: i === 1 ? 'cubicIn' : 'linear'}
                        : {animationDelay: i * 100})
            }))});
            advance(250);
            getECModel(chart).getSeries().forEach(model => {
                const data = model.getData();
                [0, 1].forEach(index => {
                    const el = data.getItemGraphicEl(index) as Rect;
                    expect(el.shape.y).toBeCloseTo(data.getItemLayout(index).y, 8);
                    expect(Math.abs(el.shape.height)).toBeLessThan(Math.abs(data.getItemLayout(index).height));
                });
            });
        });

        it('keeps a shared category stagger connected', () => {
            setup({animationDelay: (index: number) => index * 100});
            [50, 100, 150].forEach(ms => {
                advance(ms);
                [0, 1].forEach(index => connected(getECModel(chart).getSeries().map(model =>
                    model.getData().getItemGraphicEl(index) as Rect)));
            });
        });

        it.each([false, true])('handles a removed predecessor while B leaves, replaced=%s', replace => {
            const series = [3, 2, 4].map((value, index) => ({
                id: ['A', 'B', 'C'][index], name: ['A', 'B', 'C'][index],
                type: 'bar', stack: 's', data: [value, -value]
            }));
            setup({series});
            advance(1000);
            const exiting = [0, 1].map(index => getECModel(chart).getSeriesByIndex(1)
                .getData().getItemGraphicEl(index) as Rect);
            toggle('B', false);
            advance(100);
            const next = series.slice(1);
            if (replace) {
                next.push({id: 'D', name: 'D', type: 'bar', stack: 'other', data: [3, -3]});
            }
            expect(() => chart.setOption({series: next}, {replaceMerge: ['series']})).not.toThrow();
            advance(0);
            advance(200);
            const c = getECModel(chart).getSeriesByName('C')[0].getData();
            [0, 1].forEach(index => connected([exiting[index], c.getItemGraphicEl(index) as Rect]));
            advance(200);
            toggle('B', true);
            advance(200);
            [0, 1].forEach(index => connected(['B', 'C'].map(name =>
                getECModel(chart).getSeriesByName(name)[0].getData().getItemGraphicEl(index) as Rect)));
        });

        it.each(['seriesAsc', 'seriesDesc'])('connects a recreated missing bar with %s', stackOrder => {
            setup({series: [3, NaN, 4].map((value, index) => ({
                name: ['A', 'B', 'C'][index], type: 'bar', stack: 's', stackOrder, data: [value, -value]
            }))});
            advance(1000);
            chart.setOption({series: [{}, {data: [2, -2]}]});
            [0, 100, 100, 200].forEach(ms => {
                advance(ms);
                [0, 1].forEach(index => {
                    const elements = getECModel(chart).getSeries().map(model =>
                        model.getData().getItemGraphicEl(index) as Rect);
                    connected(stackOrder === 'seriesDesc' ? elements.reverse() : elements);
                });
            });
        });

        it('does not invoke timing callbacks to compare stacked series', () => {
            const delay = jest.fn((index: number) => index * 100);
            const duration = jest.fn(() => 1000);
            setup({animationDelay: delay, animationDuration: duration});
            expect(delay).toHaveBeenCalledTimes(6);
            expect(duration).toHaveBeenCalledTimes(6);
        });

        it.each(['refresh', 'zoom', 'animation disabled'])('skips unused entrance timing checks: %s', action => {
            setup({
                animationDelay: (index: number) => index * 100,
                dataZoom: [{type: 'inside', filterMode: 'none'}]
            });
            advance(1000);
            const spies = getECModel(chart).getSeries().map(model => jest.spyOn(model, 'getShallow'));
            try {
                if (action === 'zoom') {
                    chart.dispatchAction({type: 'dataZoom', startValue: 0, endValue: 0});
                }
                else if (action === 'animation disabled') {
                    chart.setOption({
                        animation: false,
                        xAxis: {data: ['a', 'b', 'c']},
                        series: [3, 2, 4].map(value => ({data: [value, -value, value]}))
                    });
                }
                else {
                    chart.setOption({series: [4, 1, 2].map(value => ({data: [value, -value]}))});
                }
                spies.forEach(spy => {
                    expect(spy.mock.calls.filter(args => args[0] === 'animationDuration')).toHaveLength(0);
                });
            }
            finally {
                spies.forEach(spy => spy.mockRestore());
            }
        });

        it('keeps independent entrance positions when a shared callback receives reordered indices', () => {
            setup({
                animationDelay: (index: number) => index * 100,
                series: [
                    {type: 'bar', stack: 's', data: [['b', 3], ['a', 3]]},
                    {type: 'bar', stack: 's', data: [['a', 2], ['b', 2]]}
                ]
            });
            advance(250);
            getECModel(chart).getSeries().forEach(model => {
                const data = model.getData();
                [0, 1].forEach(index => {
                    const el = data.getItemGraphicEl(index) as Rect;
                    expect(el.shape.y).toBeCloseTo(data.getItemLayout(index).y, 8);
                });
            });
        });

        it.each(['hide C', 'hide A', 'update A', 'zoom'])('retargets an exiting B when we %s', action => {
            setup({dataZoom: [{type: 'inside', startValue: 0, endValue: 1, filterMode: 'none'}]});
            advance(1000);
            const stacks = [0, 1].map(index => getECModel(chart).getSeries().map(model =>
                model.getData().getItemGraphicEl(index) as Rect));
            toggle('B', false);
            advance(100);
            if (action.startsWith('hide')) {
                toggle(action.slice(-1), false);
            }
            else if (action === 'update A') {
                chart.setOption({series: [{data: [6, -6]}]});
                advance(0);
            }
            else {
                chart.dispatchAction({type: 'dataZoom', startValue: 0, endValue: 0});
                advance(0);
            }
            [50, 100, 100].forEach(ms => {
                advance(ms);
                stacks.forEach(elements => {
                    connected(elements);
                    expect(elements[1].shape.x).toBeCloseTo(elements[0].shape.x, 8);
                    expect(elements[1].shape.width).toBeCloseTo(elements[0].shape.width, 8);
                });
            });
            advance(150);
            stacks.forEach(elements => expect(elements[1].parent).toBeNull());
        });
    });
});
