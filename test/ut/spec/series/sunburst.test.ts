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

import { EChartsType } from '@/src/echarts';
import SunburstSeriesModel from '@/src/chart/sunburst/SunburstSeries';
import { TreeNode } from '@/src/data/Tree';
import { createChart, getECModel } from '../../core/utHelper';

function findNodeByName(seriesModel: SunburstSeriesModel, name: string): TreeNode {
    let targetNode: TreeNode | undefined;

    seriesModel.getData().tree.root.eachNode(node => {
        if (node.name === name) {
            targetNode = node;
        }
    });

    if (!targetNode) {
        throw new Error(`Node "${name}" not found.`);
    }

    return targetNode;
}

describe('series/sunburst', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart({
            width: 400,
            height: 400
        });
    });

    afterEach(function () {
        chart.dispose();
    });

    it('centers label when rootToNode makes an annular sector full circle', function () {
        chart.setOption({
            animation: false,
            series: {
                type: 'sunburst',
                radius: [0, '80%'],
                label: {
                    show: true,
                    align: 'center'
                },
                data: [
                    {
                        name: '华南',
                        children: [
                            {name: '广东', value: 2},
                            {name: '广西', value: 1}
                        ]
                    },
                    {
                        name: '华北',
                        children: [
                            {name: '北京', value: 2},
                            {name: '天津', value: 1}
                        ]
                    }
                ]
            }
        });

        let seriesModel = getECModel(chart).getSeriesByType('sunburst')[0] as SunburstSeriesModel;
        const targetNode = findNodeByName(seriesModel, '华南');

        chart.dispatchAction({
            type: 'sunburstRootToNode',
            targetNode: targetNode
        });

        seriesModel = getECModel(chart).getSeriesByType('sunburst')[0] as SunburstSeriesModel;
        const viewRoot = seriesModel.getViewRoot();
        const layout = viewRoot.getLayout();
        const label = seriesModel.getData().getItemGraphicEl(viewRoot.dataIndex).getTextContent();

        expect(viewRoot.name).toBe('华南');
        expect(layout.r0).toBeGreaterThan(0);
        expect(Math.abs(layout.endAngle - layout.startAngle)).toBeCloseTo(Math.PI * 2);
        expect(label.x).toBeCloseTo(layout.cx);
        expect(label.y).toBeCloseTo(layout.cy);
        expect(label.rotation).toBeCloseTo(0);
    });

    it('keeps non-view-root annular full-circle labels in their ring', function () {
        chart.setOption({
            animation: false,
            series: {
                type: 'sunburst',
                radius: [0, '80%'],
                label: {
                    show: true,
                    align: 'center'
                },
                data: [
                    {
                        name: 'root-sector',
                        children: [
                            {
                                name: 'annular-child',
                                value: 1
                            }
                        ]
                    }
                ]
            }
        });

        const seriesModel = getECModel(chart).getSeriesByType('sunburst')[0] as SunburstSeriesModel;
        const childNode = findNodeByName(seriesModel, 'annular-child');
        const layout = childNode.getLayout();
        const label = seriesModel.getData().getItemGraphicEl(childNode.dataIndex).getTextContent();
        const labelDistance = Math.sqrt(
            Math.pow(label.x - layout.cx, 2) + Math.pow(label.y - layout.cy, 2)
        );

        expect(childNode).not.toBe(seriesModel.getViewRoot());
        expect(layout.r0).toBeGreaterThan(0);
        expect(Math.abs(layout.endAngle - layout.startAngle)).toBeCloseTo(Math.PI * 2);
        expect(labelDistance).toBeCloseTo((layout.r + layout.r0) / 2);
    });

});
