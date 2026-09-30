
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
import BrushModel from '../../../../../src/component/brush/BrushModel';
import { HOVER_STATE_EMPHASIS, HOVER_STATE_NORMAL } from '../../../../../src/util/states';
import { ECElement } from '../../../../../src/util/types';
import Path from 'zrender/src/graphic/Path';
import { ElementEvent } from 'zrender/src/Element';


describe('toolbox_brushIconStatus', function () {

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

    function getBrushedAreaCount(): number {
        return (getECModel(chart).getComponent('brush') as BrushModel).areas.length;
    }

    function brushArea(): void {
        // The action `brush` does not trigger a full update.
        chart.dispatchAction({
            type: 'brush',
            areas: [{
                xAxisIndex: 0,
                brushType: 'lineX',
                coordRange: [0, 1]
            }]
        });
    }

    function expectHighlighted(featureName: string, iconName: string, highlighted: boolean): void {
        // The states changed out of a full update are applied in the next frame.
        chart.getZr().animation.update();

        const icon = getIcon(featureName, iconName);
        expect(icon.hoverState || HOVER_STATE_NORMAL).toEqual(
            highlighted ? HOVER_STATE_EMPHASIS : HOVER_STATE_NORMAL
        );
        expect(icon.currentStates).toEqual(highlighted ? ['emphasis'] : []);
    }

    it('should_highlight_clear_as_soon_as_an_area_is_brushed', function () {
        setOption({feature: {brush: {}}});
        expectHighlighted('brush', 'clear', false);

        brushArea();
        expect(getBrushedAreaCount()).toEqual(1);
        expectHighlighted('brush', 'clear', true);

        chart.setOption({});
        expectHighlighted('brush', 'clear', true);
    });

    it('should_reset_clear_as_soon_as_the_areas_are_cleared', function () {
        setOption({feature: {brush: {}}});
        brushArea();
        expectHighlighted('brush', 'clear', true);

        trigger(getIcon('brush', 'clear'), 'mouseover');
        click('brush', 'clear');
        // The icons are re-created by the click, since the action `axisAreaSelect` triggers a full update.
        trigger(getIcon('brush', 'clear'), 'mouseout');

        expect(getBrushedAreaCount()).toEqual(0);
        expectHighlighted('brush', 'clear', false);

        chart.setOption({});
        expectHighlighted('brush', 'clear', false);
    });

    it('should_keep_the_status_of_the_other_icons_when_clear_is_clicked', function () {
        setOption({feature: {brush: {}}});

        click('brush', 'rect');
        click('brush', 'keep');
        brushArea();
        click('brush', 'clear');

        expectHighlighted('brush', 'rect', true);
        expectHighlighted('brush', 'keep', true);
        expectHighlighted('brush', 'polygon', false);
        expectHighlighted('brush', 'clear', false);
    });

    it('should_dispose_the_features_when_the_chart_is_disposed', function () {
        setOption({feature: {dataZoom: {}, brush: {}}});

        const dataZoomFeature = getFeature('dataZoom');
        const originalDispose = dataZoomFeature.dispose;
        let disposeCount = 0;
        dataZoomFeature.dispose = function (ecModel, api) {
            disposeCount++;
            originalDispose.call(this, ecModel, api);
        };

        chart.dispose();
        expect(disposeCount).toEqual(1);

        // For `afterEach`.
        chart = createChart();
    });

});
