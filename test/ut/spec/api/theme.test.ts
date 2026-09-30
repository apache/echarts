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

const mockRegisterTheme = jest.fn();
jest.mock('echarts/lib/echarts', function () {
    return { registerTheme: mockRegisterTheme };
}, { virtual: true });

const { v5Theme }: { v5Theme: { color: string[] } } = require('../../../../theme/v5');

describe('api/theme', function () {
    it('exports the v5 compatibility theme for explicit registration', function () {
        expect(v5Theme.color).toEqual([
            '#5470c6',
            '#91cc75',
            '#fac858',
            '#ee6666',
            '#73c0de',
            '#3ba272',
            '#fc8452',
            '#9a60b4',
            '#ea7ccc'
        ]);
        expect(mockRegisterTheme).toHaveBeenCalledWith('v5', v5Theme);
    });
});
