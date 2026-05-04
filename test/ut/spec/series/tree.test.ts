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
import { createChart, getECModel } from '../../core/utHelper';
import { TreeNode } from '@/src/data/Tree';

function findNode(root: TreeNode, name: string): TreeNode {
    let found: TreeNode;
    root.eachNode('preorder', function (node) {
        if (node.name === name) {
            found = node;
            return false;
        }
    });
    return found;
}

describe('series.tree', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart({
            width: 800,
            height: 600
        });
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should support centered root with children expanding to both sides', function () {
        chart.setOption({
            series: [{
                type: 'tree',
                animation: false,
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                orient: 'center',
                expandAndCollapse: false,
                data: [{
                    name: 'root',
                    children: [{
                        name: 'left-child',
                        side: 'left',
                        children: [{ name: 'left-leaf' }]
                    }, {
                        name: 'right-child',
                        side: 'right',
                        children: [{ name: 'right-leaf' }]
                    }]
                }]
            }]
        });

        const tree = getECModel(chart).getSeries()[0].getData().tree;
        const root = findNode(tree.root, 'root');
        const leftChild = findNode(tree.root, 'left-child');
        const leftLeaf = findNode(tree.root, 'left-leaf');
        const rightChild = findNode(tree.root, 'right-child');
        const rightLeaf = findNode(tree.root, 'right-leaf');

        const rootLayout = root.getLayout();
        expect(rootLayout.x).toBeCloseTo(400);
        expect(rootLayout.y).toBeCloseTo(300);

        expect(leftChild.getLayout().x).toBeLessThan(rootLayout.x);
        expect(leftLeaf.getLayout().x).toBeLessThan(leftChild.getLayout().x);
        expect(rightChild.getLayout().x).toBeGreaterThan(rootLayout.x);
        expect(rightLeaf.getLayout().x).toBeGreaterThan(rightChild.getLayout().x);
    });

    it('should split root children automatically when side is not specified', function () {
        chart.setOption({
            series: [{
                type: 'tree',
                animation: false,
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                orient: 'center',
                expandAndCollapse: false,
                data: [{
                    name: 'root',
                    children: [
                        { name: 'first' },
                        { name: 'second' },
                        { name: 'third' }
                    ]
                }]
            }]
        });

        const tree = getECModel(chart).getSeries()[0].getData().tree;
        const rootLayout = findNode(tree.root, 'root').getLayout();

        expect(findNode(tree.root, 'first').getLayout().x).toBeLessThan(rootLayout.x);
        expect(findNode(tree.root, 'second').getLayout().x).toBeGreaterThan(rootLayout.x);
        expect(findNode(tree.root, 'third').getLayout().x).toBeGreaterThan(rootLayout.x);
    });

    it('should render center orient with polyline edges', function () {
        chart.setOption({
            series: [{
                type: 'tree',
                animation: false,
                orient: 'center',
                edgeShape: 'polyline',
                expandAndCollapse: false,
                data: [{
                    name: 'root',
                    children: [{
                        name: 'left',
                        side: 'left',
                        children: [{ name: 'left-leaf' }]
                    }, {
                        name: 'right',
                        side: 'right',
                        children: [{ name: 'right-leaf' }]
                    }]
                }]
            }]
        });

        const tree = getECModel(chart).getSeries()[0].getData().tree;
        const rootLayout = findNode(tree.root, 'root').getLayout();

        expect(findNode(tree.root, 'left').getLayout().x).toBeLessThan(rootLayout.x);
        expect(findNode(tree.root, 'right').getLayout().x).toBeGreaterThan(rootLayout.x);
    });
});
