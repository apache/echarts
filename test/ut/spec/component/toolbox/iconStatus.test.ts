
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

import { createChart, getECModel } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';
import { ToolboxComponentOption } from '../../../../../src/export/option';
import ToolboxView from '../../../../../src/component/toolbox/ToolboxView';
import { ToolboxFeature } from '../../../../../src/component/toolbox/featureManager';
import { HOVER_STATE_EMPHASIS, HOVER_STATE_NORMAL } from '../../../../../src/util/states';
import { ECElement } from '../../../../../src/util/types';
import Path from 'zrender/src/graphic/Path';
import { ElementEvent } from 'zrender/src/Element';


describe('toolbox_iconStatus', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function setOption(toolbox: ToolboxComponentOption): void {
        chart.setOption({
            animation: false,
            toolbox: toolbox,
            brush: {xAxisIndex: 0},
            xAxis: {type: 'category', data: ['a', 'b', 'c']},
            yAxis: {},
            series: [{type: 'bar', data: [1, 2, 3]}]
        });
    }

    // The icon paths are re-created whenever toolbox is re-rendered. Always fetch them when needed.
    function getFeature(featureName: string): ToolboxFeature {
        const toolboxModel = getECModel(chart).getComponent('toolbox');
        // @ts-ignore
        const toolboxView = chart._componentsMap[toolboxModel.__viewId] as ToolboxView;
        return toolboxView._features.get(featureName) as ToolboxFeature;
    }

    function getIcon(featureName: string, iconName: string): Path & ECElement {
        return getFeature(featureName).model.iconPaths[iconName] as Path & ECElement;
    }

    function trigger(icon: Path, eventName: 'click' | 'mouseover' | 'mouseout'): void {
        icon.trigger(eventName, {} as ElementEvent);
    }

    function click(featureName: string, iconName: string): void {
        trigger(getIcon(featureName, iconName), 'click');
    }

    function expectStatus(
        featureName: string,
        iconName: string,
        status: 'normal' | 'emphasis' | 'select'
    ): void {
        const icon = getIcon(featureName, iconName);
        expect(!!icon.selected).toEqual(status === 'select');
        expect(icon.hoverState || HOVER_STATE_NORMAL).toEqual(
            status === 'emphasis' ? HOVER_STATE_EMPHASIS : HOVER_STATE_NORMAL
        );
        expect(icon.currentStates).toEqual(status === 'normal' ? [] : [status]);
    }

    describe('magicType', function () {

        it('should_not_select_any_icon_initially', function () {
            setOption({feature: {magicType: {type: ['line', 'bar', 'stack']}}});

            expectStatus('magicType', 'line', 'normal');
            expectStatus('magicType', 'bar', 'normal');
            expectStatus('magicType', 'stack', 'normal');
        });

        it('should_select_the_clicked_type_and_unselect_the_other', function () {
            setOption({feature: {magicType: {type: ['line', 'bar', 'stack']}}});

            click('magicType', 'line');
            expect(getECModel(chart).getSeriesByIndex(0).subType).toEqual('line');
            expectStatus('magicType', 'line', 'select');
            expectStatus('magicType', 'bar', 'normal');
            expectStatus('magicType', 'stack', 'normal');

            click('magicType', 'bar');
            expect(getECModel(chart).getSeriesByIndex(0).subType).toEqual('bar');
            expectStatus('magicType', 'line', 'normal');
            expectStatus('magicType', 'bar', 'select');
            expectStatus('magicType', 'stack', 'normal');
        });

        it('should_toggle_stack_without_affecting_line_and_bar', function () {
            setOption({feature: {magicType: {type: ['line', 'bar', 'stack']}}});

            click('magicType', 'line');
            click('magicType', 'stack');
            expectStatus('magicType', 'line', 'select');
            expectStatus('magicType', 'stack', 'select');

            click('magicType', 'stack');
            expectStatus('magicType', 'line', 'select');
            expectStatus('magicType', 'stack', 'normal');
        });

        it('should_keep_selected_after_mouseout', function () {
            setOption({feature: {magicType: {type: ['line', 'bar']}}});

            click('magicType', 'line');
            const icon = getIcon('magicType', 'line');

            trigger(icon, 'mouseover');
            expect(icon.selected).toEqual(true);
            expect(icon.hoverState).toEqual(HOVER_STATE_EMPHASIS);

            trigger(icon, 'mouseout');
            expect(icon.selected).toEqual(true);
            expect(icon.hoverState).toEqual(HOVER_STATE_NORMAL);
        });
    });

    describe('select_iconStyle', function () {

        it('should_use_select_iconStyle_of_feature', function () {
            setOption({
                feature: {
                    magicType: {
                        type: ['line', 'bar'],
                        iconStyle: {borderColor: '#111'},
                        emphasis: {iconStyle: {borderColor: '#222'}},
                        select: {iconStyle: {borderColor: '#333', borderWidth: 3}}
                    }
                }
            });

            click('magicType', 'line');

            const selected = getIcon('magicType', 'line');
            expect(selected.states.select.style.stroke).toEqual('#333');
            expect(selected.states.emphasis.style.stroke).toEqual('#222');
            expect(selected.style.stroke).toEqual('#333');
            expect(selected.style.lineWidth).toEqual(3);

            expect(getIcon('magicType', 'bar').style.stroke).toEqual('#111');
        });

        it('should_use_select_iconStyle_of_toolbox_if_not_specified_on_feature', function () {
            setOption({
                iconStyle: {borderColor: '#111'},
                emphasis: {iconStyle: {borderColor: '#222'}},
                select: {iconStyle: {borderColor: '#333'}},
                feature: {
                    magicType: {type: ['line', 'bar']},
                    dataZoom: {
                        select: {iconStyle: {borderColor: '#444'}}
                    }
                }
            });

            click('magicType', 'line');
            expect(getIcon('magicType', 'line').style.stroke).toEqual('#333');
            expect(getIcon('magicType', 'bar').style.stroke).toEqual('#111');

            click('dataZoom', 'zoom');
            expect(getIcon('dataZoom', 'zoom').style.stroke).toEqual('#444');
        });

        it('should_fall_back_to_emphasis_iconStyle_if_not_specified', function () {
            setOption({
                emphasis: {iconStyle: {borderColor: '#222'}},
                feature: {
                    magicType: {
                        type: ['line', 'bar'],
                        iconStyle: {borderColor: '#111'}
                    }
                }
            });

            click('magicType', 'line');

            expectStatus('magicType', 'line', 'select');
            const selected = getIcon('magicType', 'line');
            expect(selected.states.select.style).toEqual(selected.states.emphasis.style);
            expect(selected.style.stroke).toEqual('#222');

            expect(getIcon('magicType', 'bar').style.stroke).toEqual('#111');
        });
    });

    describe('iconStatus_option', function () {

        it('should_support_select_specified_in_option', function () {
            setOption({
                feature: {
                    magicType: {
                        type: ['line', 'bar'],
                        iconStatus: {bar: 'select'}
                    }
                }
            });

            expectStatus('magicType', 'line', 'normal');
            expectStatus('magicType', 'bar', 'select');

            click('magicType', 'line');
            expectStatus('magicType', 'line', 'select');
            expectStatus('magicType', 'bar', 'normal');
        });

        it('should_still_support_emphasis_specified_in_option', function () {
            setOption({
                feature: {
                    magicType: {
                        type: ['line', 'bar'],
                        iconStatus: {bar: 'emphasis'}
                    }
                }
            });

            expectStatus('magicType', 'line', 'normal');
            expectStatus('magicType', 'bar', 'emphasis');

            click('magicType', 'line');
            expectStatus('magicType', 'line', 'select');
            expectStatus('magicType', 'bar', 'normal');
        });
    });

    describe('dataZoom', function () {

        it('should_toggle_select_of_zoom', function () {
            setOption({feature: {dataZoom: {}}});

            expectStatus('dataZoom', 'zoom', 'normal');
            expectStatus('dataZoom', 'back', 'normal');

            click('dataZoom', 'zoom');
            expectStatus('dataZoom', 'zoom', 'select');
            expectStatus('dataZoom', 'back', 'normal');

            click('dataZoom', 'zoom');
            expectStatus('dataZoom', 'zoom', 'normal');
        });
    });

    describe('brush', function () {

        it('should_select_the_current_brush_type_and_mode', function () {
            setOption({feature: {brush: {}}});

            expectStatus('brush', 'rect', 'normal');
            expectStatus('brush', 'keep', 'normal');
            expectStatus('brush', 'clear', 'normal');

            click('brush', 'rect');
            expectStatus('brush', 'rect', 'select');
            expectStatus('brush', 'polygon', 'normal');

            click('brush', 'polygon');
            expectStatus('brush', 'rect', 'normal');
            expectStatus('brush', 'polygon', 'select');

            click('brush', 'keep');
            expectStatus('brush', 'keep', 'select');
            expectStatus('brush', 'polygon', 'select');

            click('brush', 'polygon');
            expectStatus('brush', 'polygon', 'normal');
            expectStatus('brush', 'keep', 'select');
        });

        it('should_use_emphasis_rather_than_select_for_clear', function () {
            setOption({feature: {brush: {}}});

            chart.dispatchAction({
                type: 'brush',
                areas: [{
                    xAxisIndex: 0,
                    brushType: 'lineX',
                    coordRange: [0, 1]
                }]
            });
            // The action `brush` does not re-render toolbox. The icons are updated in the next update.
            chart.setOption({});
            expectStatus('brush', 'clear', 'emphasis');

            click('brush', 'clear');
            chart.setOption({});
            expectStatus('brush', 'clear', 'normal');
        });
    });

});
