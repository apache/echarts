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

import { each } from 'zrender/src/core/util';
import { createChart } from '../../core/utHelper';
import { EChartsType } from '../../../../src/echarts';

const FULL_TREE = [{
    name: 'root',
    children: [
        {name: 'c1', children: [{name: 'g1'}, {name: 'g2'}]},
        {name: 'c2', children: [{name: 'g3'}]}
    ]
}];

describe('tree_update', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart({width: 400, height: 300});
    });
    afterEach(function () {
        chart.dispose();
    });

    function setTree(data: unknown, animation: boolean, notMerge?: boolean) {
        chart.setOption({
            animation: animation,
            series: [{type: 'tree', data: data}]
        }, notMerge);
    }

    // `bbox.fromPoints` writes nothing when there is no point, so `min`/`max` stayed
    // empty and the derived dataRect was NaN, making the view transform non-invertible.
    it('should render a tree whose data is empty', function () {
        expect(function () {
            setTree([], false);
        }).not.toThrow();
    });

    each([false, true], function (animation) {
        it(`should render a tree emptied after having data (animation: ${animation})`, function () {
            setTree(FULL_TREE, animation);
            expect(function () {
                setTree([], animation, true);
            }).not.toThrow();
        });
    });

    // Removing several nodes in one pass resets their graphic elements to null as it
    // goes, so a node's source may already be gone when its edge is removed.
    each([false, true], function (animation) {
        each([
            {name: 'a whole subtree', data: [{name: 'root', children: [{name: 'c2', children: [{name: 'g3'}]}]}]},
            {name: 'all but the root', data: [{name: 'root'}]}
        ], function (removeCase) {
            it(`should remove ${removeCase.name} (animation: ${animation})`, function () {
                setTree(FULL_TREE, animation);
                expect(function () {
                    setTree(removeCase.data, animation, true);
                }).not.toThrow();
            });
        });
    });

    it('should render a tree that gets data after being empty', function () {
        setTree([], false);
        expect(function () {
            setTree(FULL_TREE, false, true);
        }).not.toThrow();
    });

});
