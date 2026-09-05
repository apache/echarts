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

import { push, pop, count, clear } from '../../../../../src/component/dataZoom/history';
import GlobalModel from '../../../../../src/model/Global';

// `history.push` completes the origin range by querying the related dataZoom
// model. Return a stub whose `getPercentRange` yields a fixed range so the
// origin snapshot is populated the same way it is at runtime.
function createMockECModel(): GlobalModel {
    return {
        queryComponents() {
            return [{
                getPercentRange() {
                    return [0, 100];
                }
            }];
        }
    } as unknown as GlobalModel;
}

describe('dataZoom/history', function () {

    it('starts with a single origin snapshot', function () {
        const ecModel = createMockECModel();
        expect(count(ecModel)).toBe(1);
    });

    it('pushes and pops snapshots for multiple dataZooms', function () {
        const ecModel = createMockECModel();

        push(ecModel, { dz0: { dataZoomId: 'dz0', start: 10, end: 90 } });
        push(ecModel, { dz1: { dataZoomId: 'dz1', start: 20, end: 80 } });
        expect(count(ecModel)).toBe(3);

        const undoDz1 = pop(ecModel);
        expect(undoDz1.dz1).toBeTruthy();
        expect(count(ecModel)).toBe(2);

        const undoDz0 = pop(ecModel);
        expect(undoDz0.dz0).toBeTruthy();
        expect(count(ecModel)).toBe(1);
    });

    // Regression test for #21660: after every zoom has been undone only the
    // origin snapshot remains, so an extra "back" / zoom-reset must be a no-op
    // instead of dispatching a redundant dataZoom action that restores the
    // origin range again.
    it('returns an empty snapshot once only the origin remains (#21660)', function () {
        const ecModel = createMockECModel();

        push(ecModel, { dz0: { dataZoomId: 'dz0', start: 10, end: 90 } });
        push(ecModel, { dz1: { dataZoomId: 'dz1', start: 20, end: 80 } });

        pop(ecModel); // undo the dz1 zoom
        pop(ecModel); // undo the dz0 zoom
        expect(count(ecModel)).toBe(1);

        expect(pop(ecModel)).toEqual({});
        expect(count(ecModel)).toBe(1);
    });

    it('clears the stored snapshots back to the origin', function () {
        const ecModel = createMockECModel();

        push(ecModel, { dz0: { dataZoomId: 'dz0', start: 10, end: 90 } });
        expect(count(ecModel)).toBe(2);

        clear(ecModel);
        expect(count(ecModel)).toBe(1);
    });

});
