
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

import ComponentModel, { ComponentModelConstructor } from '../../../../src/model/Component';
import { ComponentMainType } from '../../../../src/util/types';

const componentModelConstructor = ComponentModel as ComponentModelConstructor;

function extendModel(type: string, dependencies?: string[]) {
    class SubModel extends ComponentModel {
        static type: string = type;
        type: string = type;
        static dependencies = dependencies || [];
    };
    ComponentModel.registerClass(SubModel);
    return SubModel;
}

describe('componentDependency', function () {

    let idx = 0;

    function makeTypes(count: number): string[] {
        const arr = [];
        for (let i = 0; i < count; i++) {
            arr.push('type_' + idx++);
        }
        return arr;
    }

    type TopoResultItem = [ComponentMainType, ComponentMainType[]];

    it('topologicalTravel_base', function () {
        const [m1, a1, a2] = makeTypes(3);
        extendModel(m1, [a1, a2]);
        extendModel(a1);
        extendModel(a2);
        const result: TopoResultItem[] = [];
        const allList = componentModelConstructor.getAllClassMainTypes();
        componentModelConstructor.topologicalTravel(
            [m1, a1, a2],
            allList,
            function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            }
        );
        expect(result).toEqual([[a2, ['dataset']], [a1, ['dataset']], [m1, ['dataset', a1, a2]]]);
    });

    it('topologicalTravel_a1IsAbsent', function () {
        const [m1, a1, a2] = makeTypes(3);
        extendModel(m1, [a1, a2]);
        extendModel(a2);
        const allList = componentModelConstructor.getAllClassMainTypes();
        const result: TopoResultItem[] = [];
        componentModelConstructor.topologicalTravel(
            [m1, a2],
            allList,
            function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            }
        );
        expect(result).toEqual([[a2, ['dataset']], [m1, ['dataset', a1, a2]]]);
    });

    it('topologicalTravel_empty', function () {
        const [m1, a1, a2] = makeTypes(3);
        extendModel(m1, [a1, a2]);
        extendModel(a1);
        extendModel(a2);
        const allList = componentModelConstructor.getAllClassMainTypes();
        const result: TopoResultItem[] = [];
        componentModelConstructor.topologicalTravel(
            [],
            allList,
            function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            }
        );
        expect(result).toEqual([]);
    });

    it('topologicalTravel_isolate', function () {
        const [m1, a1, a2] = makeTypes(3);
        extendModel(a2);
        extendModel(a1);
        extendModel(m1, [a2]);
        const allList = componentModelConstructor.getAllClassMainTypes();
        const result: TopoResultItem[] = [];
        componentModelConstructor.topologicalTravel(
            [a1, a2, m1],
            allList,
            function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            }
        );
        expect(result).toEqual([[a1, ['dataset']], [a2, ['dataset']], [m1, ['dataset', a2]]]);
    });

    it('topologicalTravel_diamond', function () {
        const [m1, a1, a2, a3] = makeTypes(4);
        extendModel(a1, []);
        extendModel(a2, [a1]);
        extendModel(a3, [a1]);
        extendModel(m1, [a2, a3]);
        const allList = componentModelConstructor.getAllClassMainTypes();
        const result: TopoResultItem[] = [];
        componentModelConstructor.topologicalTravel(
            [m1, a1, a2, a3],
            allList,
            function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            }
        );
        expect(result).toEqual(
            [[a1, ['dataset']],
            [a3, ['dataset', a1]],
            [a2, ['dataset', a1]],
            [m1, ['dataset', a2, a3]]
        ]);
    });

    it('topologicalTravel_loop', function () {
        const [m1, m2, a1, a2, a3] = makeTypes(5);
        extendModel(m1, [a1, a2]);
        extendModel(m2, [m1, a2]);
        extendModel(a1, [m2, a2, a3]);
        extendModel(a2);
        extendModel(a3);
        const allList = componentModelConstructor.getAllClassMainTypes();
        expect(function () {
            componentModelConstructor.topologicalTravel(
                [m1, m2, a1],
                allList,
                () => {}
            );
        }).toThrowError(/Circular/);
    });

    it('topologicalTravel_multipleEchartsInstance', function () {
        const [m1, m2, a1, a2] = makeTypes(4);
        extendModel(m1, [a1, a2]);
        extendModel(a1);
        extendModel(a2);
        let allList = componentModelConstructor.getAllClassMainTypes();
        let result: TopoResultItem[] = [];
        componentModelConstructor.topologicalTravel(
            [m1, a1, a2],
            allList,
            function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            }
        );
        expect(result).toEqual([[a2, ['dataset']], [a1, ['dataset']], [m1, ['dataset', a1, a2]]]);

        result = [];
        extendModel(m2, [a1, m1]);
        allList = componentModelConstructor.getAllClassMainTypes();
        componentModelConstructor.topologicalTravel(
            [m2, m1, a1, a2],
            allList,
            function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            }
        );
        expect(result).toEqual(
            [[a2, ['dataset']], [a1, ['dataset']], [m1, ['dataset', a1, a2]], [m2, ['dataset', a1, m1]]]
        );
    });

    it('topologicalTravel_missingSomeNodeButHasDependencies', function () {
        const [m1, a1, a2, a3, a4] = makeTypes(5);
        extendModel(m1, [a1, a2]);
        extendModel(a2, [a3]);
        extendModel(a3);
        extendModel(a4);
        let result: TopoResultItem[] = [];
        let allList = componentModelConstructor.getAllClassMainTypes();
        componentModelConstructor.topologicalTravel(
            [a3, m1],
            allList,
            function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            }
        );
        expect(result).toEqual([[a3, ['dataset']], [a2, ['dataset', a3]], [m1, ['dataset', a1, a2]]]);
        result = [];
        allList = componentModelConstructor.getAllClassMainTypes();
        componentModelConstructor.topologicalTravel(
            [m1, a3],
            allList,
            function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            }
        );
        expect(result).toEqual([[a3, ['dataset']], [a2, ['dataset', a3]], [m1, ['dataset', a1, a2]]]);
    });

    it('topologicalTravel_subType', function () {
        const [m1, a1, a2, a3, a4] = makeTypes(5);
        extendModel(m1, [a1, a2]);
        extendModel(a1 + '.aaa', [a2]);
        extendModel(a1 + '.bbb', [a3, a4]);
        extendModel(a2);
        extendModel(a3);
        extendModel(a4);
        const result: TopoResultItem[] = [];
        const allList = componentModelConstructor.getAllClassMainTypes();
        componentModelConstructor.topologicalTravel(
            [m1, a1, a2, a4],
            allList,
            function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            }
        );
        expect(result).toEqual(
            [[a4, ['dataset']],
            [a2, ['dataset']],
            [a1, ['dataset', a2, a3, a4]],
            [m1, ['dataset', a1, a2]]
        ]);
    });
});