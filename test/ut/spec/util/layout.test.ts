
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

// import { Dictionary } from 'zrender/src/core/types';
import { mergeLayoutParam } from '@/src/util/layout';
import { BoxLayoutOptionMixin } from '@/src/util/types';

describe('util/number', function () {

    describe('mergeLayoutParam', function () {

        // The given obj has exactly the given props, has no other props.
        function expectPropsEqual(obj: object, props: object): void {
            expect(propContain(obj, props) && propContain(props, obj)).toEqual(true);
        }

        function propContain(more: object, less: object): boolean {
            for (const key in more) {
                if (more.hasOwnProperty(key)) {
                    if ((more as any)[key] !== (less as any)[key]
                        && !((more as any)[key] == null && (less as any)[key] == null)
                    ) {
                        return false;
                    }
                }
            }
            return true;
        }

        function shadowClone<T extends object>(obj: T): T {
            const newObj = {} as T;
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    newObj[key] = obj[key];
                }
            }
            return newObj;
        }

        it('all', function () {

            function testMerge(
                targetOption: BoxLayoutOptionMixin,
                newOption: BoxLayoutOptionMixin,
                result: BoxLayoutOptionMixin,
                resultIgnoreSize?: BoxLayoutOptionMixin
            ) {
                const t1 = shadowClone(targetOption);
                const t2 = shadowClone(targetOption);
                const n1 = shadowClone(newOption);
                const n2 = shadowClone(newOption);
                mergeLayoutParam(t1, n1);
                mergeLayoutParam(t2, n2, {ignoreSize: true});
                expectPropsEqual(t1, result);
                expectPropsEqual(t2, resultIgnoreSize || result);
            }

            function singleValueAdd(val: number | string): void {
                testMerge({}, {width: val}, {width: val});
                testMerge({}, {left: val}, {left: val});
                testMerge({}, {right: val}, {right: val});
                testMerge({}, {height: val}, {height: val});
                testMerge({}, {top: val}, {top: val});
                testMerge({}, {bottom: val}, {bottom: val});
            }

            singleValueAdd(10);
            singleValueAdd('30%');
            singleValueAdd('left');
            singleValueAdd('right');
            singleValueAdd('center');

            function singleValueReplace(val: number | string): void {
                testMerge({width: -999}, {width: val}, {width: val});
                testMerge({left: -999}, {left: val}, {left: val});
                testMerge({right: -999}, {right: val}, {right: val});
                testMerge({height: -999}, {height: val}, {height: val});
                testMerge({top: -999}, {top: val}, {top: val});
                testMerge({bottom: -999}, {bottom: val}, {bottom: val});
            }

            singleValueReplace(10);
            singleValueReplace('30%');
            singleValueReplace('left');
            singleValueReplace('right');
            singleValueReplace('center');

            testMerge(
                {}, {width: 10, left: 20, right: 30},
                {width: 10, left: 20, right: 30},
                {width: 10, left: 20}
            );
            testMerge(
                {}, {height: 10, top: 20, bottom: 30},
                {height: 10, top: 20, bottom: 30},
                {height: 10, top: 20}
            );
            testMerge(
                {}, {width: 10, left: 20, right: 30, height: 10, top: 20, bottom: 30},
                {width: 10, left: 20, right: 30, height: 10, top: 20, bottom: 30},
                {width: 10, left: 20, height: 10, top: 20}
            );

            testMerge(
                {width: 111, top: 555}, {width: 10, left: 20, right: 30},
                {width: 10, left: 20, right: 30, top: 555},
                {width: 10, left: 20, top: 555}
            );

            testMerge(
                {width: 111, left: 222, top: 'bottom'}, {right: 30},
                {width: 111, right: 30, top: 'bottom'}
            );
            testMerge(
                {width: 111, right: 222, top: 'bottom'}, {left: 30},
                {width: 111, left: 30, top: 'bottom'}
            );
            testMerge(
                {height: 111, top: 222, left: 'right'}, {bottom: 30},
                {height: 111, bottom: 30, left: 'right'}
            );
            testMerge(
                {height: 111, bottom: 222, left: 'right'}, {top: 30},
                {height: 111, top: 30, left: 'right'}
            );

            testMerge(
                {left: 222, top: 'bottom'}, {width: '33%', right: 30},
                {width: '33%', right: 30, top: 'bottom'}
            );
            testMerge(
                {right: 222, top: 'bottom'}, {width: '33%', left: 30},
                {width: '33%', left: 30, top: 'bottom'}
            );
            testMerge(
                {top: 222, left: 'right'}, {height: '33%', bottom: 30},
                {height: '33%', bottom: 30, left: 'right'}
            );
            testMerge(
                {bottom: 222, left: 'right'}, {height: '33%', top: 30},
                {height: '33%', top: 30, left: 'right'}
            );

            testMerge(
                {left: 222, top: 'center'}, {width: '33%'},
                {width: '33%', left: 222, top: 'center'}
            );
            testMerge(
                {right: 222, top: 'center'}, {width: '33%'},
                {width: '33%', right: 222, top: 'center'}
            );
            testMerge(
                {top: 222, left: 'center'}, {height: '33%'},
                {height: '33%', top: 222, left: 'center'}
            );
            testMerge(
                {bottom: 222, left: 'center'}, {height: '33%'},
                {height: '33%', bottom: 222, left: 'center'}
            );

            testMerge(
                {width: 222, top: 'center'}, {left: '33%', right: 55, bottom: 3},
                {left: '33%', right: 55, top: 'center', bottom: 3},
                {width: 222, left: '33%', bottom: 3}
            );
            testMerge(
                {height: 222, left: 'center'}, {top: '33%', bottom: 55, right: 3},
                {top: '33%', bottom: 55, left: 'center', right: 3},
                {height: 222, top: '33%', right: 3}
            );

            testMerge(
                {left: 222, top: 999}, {right: '33%', bottom: 3},
                {left: 222, top: 999, right: '33%', bottom: 3},
                {right: '33%', bottom: 3}
            );
            testMerge(
                {right: 222, bottom: 999}, {left: '33%', top: 3},
                {right: 222, bottom: 999, left: '33%', top: 3},
                {left: '33%', top: 3}
            );
        });

    });

});