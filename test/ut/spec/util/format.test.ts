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

import { makeValueReadable } from '@/src/util/format';

describe('util/format timeZone', function () {

    afterEach(function () {
        jest.restoreAllMocks();
    });

    it('makes temporal values readable in an IANA time zone', function () {
        const value = Date.parse('2024-07-15T12:34:56.789Z');

        expect(makeValueReadable(value, 'time', 'America/New_York'))
            .toBe('2024-07-15 08:34:56');
    });

    it('keeps legacy boolean time-zone selection', function () {
        const value = Date.parse('2024-07-15T12:34:56.789Z');
        const warn = jest.spyOn(console, 'warn').mockImplementation(function () {});

        expect(makeValueReadable(value, 'time', true))
            .toBe('2024-07-15 12:34:56');
        expect(makeValueReadable(value, 'time', false))
            .toBe(formatLocalTime(value));
        expect(warn).toHaveBeenCalledWith(expect.stringContaining(
            '[makeValueReadable]isUTC boolean parameter is deprecated'
        ));
    });
});

function formatLocalTime(value: number): string {
    const date = new Date(value);
    return date.getFullYear()
        + '-' + pad(date.getMonth() + 1, 2)
        + '-' + pad(date.getDate(), 2)
        + ' ' + pad(date.getHours(), 2)
        + ':' + pad(date.getMinutes(), 2)
        + ':' + pad(date.getSeconds(), 2);
}

function pad(value: number, length: number): string {
    return String(value).padStart(length, '0');
}
