
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

import {
    format
} from '@/src/util/time';


describe('util/time', function () {

    describe('format', function () {

        const time = new Date('2003-04-09 01:04:02.300 UTC');
        const anotherTime = new Date('2023-12-19 11:44:33.003 UTC');

        // test {yyyy}, {yy} ...
        it('should format year', function () {
            expect(format(time, '{yyyy}', true)).toEqual('2003');
            expect(format(time, '{yy}', true)).toEqual('03');

            expect(format(anotherTime, '{yyyy}', true)).toEqual('2023');
            expect(format(anotherTime, '{yy}', true)).toEqual('23');
        });

        // test {Q}...
        it('should format quarter', function () {
            expect(format(time, '{Q}', true)).toEqual('2');
            expect(format(anotherTime, '{Q}', true)).toEqual('4');
        });


        // test {MMMM}, {MMM} {MM}, {M} ...
        it('should format month', function () {
            expect(format(time, '{MMMM}', true)).toEqual('April');
            expect(format(time, '{MMM}', true)).toEqual('Apr');
            expect(format(time, '{MM}', true)).toEqual('04');
            expect(format(time, '{M}', true)).toEqual('4');

            expect(format(anotherTime, '{MMMM}', true)).toEqual('December');
            expect(format(anotherTime, '{MMM}', true)).toEqual('Dec');
            expect(format(anotherTime, '{MM}', true)).toEqual('12');
            expect(format(anotherTime, '{M}', true)).toEqual('12');
        });

        // test {dd}, {d} ...
        it('should format day', function () {
            expect(format(time, '{dd}', true)).toEqual('09');
            expect(format(time, '{d}', true)).toEqual('9');

            expect(format(anotherTime, '{dd}', true)).toEqual('19');
            expect(format(anotherTime, '{d}', true)).toEqual('19');
        });

        // test {eeee}, {ee}, {e} ...
        it('should format day of week', function () {
            expect(format(time, '{eeee}', true)).toEqual('Wednesday');
            expect(format(time, '{ee}', true)).toEqual('Wed');
            expect(format(time, '{e}', true)).toEqual('3');

            expect(format(anotherTime, '{eeee}', true)).toEqual('Tuesday');
            expect(format(anotherTime, '{ee}', true)).toEqual('Tue');
            expect(format(anotherTime, '{e}', true)).toEqual('2');
        });

        // test {HH}, {H} ...
        it('should format hour', function () {
            expect(format(time, '{HH}', true)).toEqual('01');
            expect(format(time, '{H}', true)).toEqual('1');

            expect(format(anotherTime, '{HH}', true)).toEqual('11');
            expect(format(anotherTime, '{H}', true)).toEqual('11');
        });

        // test {hh}, {h} ...
        it('should format hour', function () {
            expect(format(time, '{hh}', true)).toEqual('01');
            expect(format(time, '{h}', true)).toEqual('1');

            expect(format(anotherTime, '{hh}', true)).toEqual('11');
            expect(format(anotherTime, '{h}', true)).toEqual('11');
        });

        // test {mm}, {m} ...
        it('should format minute', function () {
            expect(format(time, '{mm}', true)).toEqual('04');
            expect(format(time, '{m}', true)).toEqual('4');

            expect(format(anotherTime, '{mm}', true)).toEqual('44');
            expect(format(anotherTime, '{m}', true)).toEqual('44');
        });

        // test {ss}, {s} ...
        it('should format second', function () {
            expect(format(time, '{ss}', true)).toEqual('02');
            expect(format(time, '{s}', true)).toEqual('2');

            expect(format(anotherTime, '{ss}', true)).toEqual('33');
            expect(format(anotherTime, '{s}', true)).toEqual('33');
        });


        // test {SSS} ...
        it('should format millisecond', function () {
            expect(format(time, '{SSS}', true)).toEqual('300');
            expect(format(anotherTime, '{SSS}', true)).toEqual('003');
        });

        // test {S} ...
        it('should format millisecond', function () {
            expect(format(time, '{S}', true)).toEqual('300');
            expect(format(anotherTime, '{S}', true)).toEqual('3');
        });
    });
});