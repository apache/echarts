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

import { formatTpl, formatTplSimple, encodeHTML } from '@/src/util/format';

describe('template values', function () {
    const values = ['Price $&', 'Price $$', 'Price $\'', 'Price $`', '<b>$&</b>'];

    it('preserves replacement characters in series values', function () {
        for (const value of values) {
            for (const encode of [false, true]) {
                const text = encode ? encodeHTML(value) : value;
                expect(formatTpl('before {a} after', {
                    $vars: ['seriesName'], seriesName: value
                }, encode)).toBe('before ' + text + ' after');
            }
        }
    });

    it('preserves replacement characters in simple values', function () {
        for (const value of values) {
            for (const encode of [false, true]) {
                const text = encode ? encodeHTML(value) : value;
                expect(formatTplSimple('before {name} after', {name: value}, encode))
                    .toBe('before ' + text + ' after');
            }
        }
    });

    it('keeps indexed series and numeric values', function () {
        expect(formatTpl('{a0}: {c0}; {a1}: {c1}', [
            {$vars: ['seriesName', 'name', 'value'], seriesName: '$$', value: 12},
            {$vars: ['seriesName', 'name', 'value'], seriesName: '$&', value: 34}
        ])).toBe('$$: 12; $&: 34');
        expect(formatTplSimple('{value}', {value: 12})).toBe('12');
    });
});
