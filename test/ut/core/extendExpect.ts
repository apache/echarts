
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

function isValueFinite(val: unknown): boolean {
    return val != null && val !== '' && isFinite(val as number);
}


// Setup expectes
expect.extend({
    toBeFinite(received) {
        const passed = isValueFinite(received);
        return {
            message: passed
                ? () => `expected ${received} not to be finite`
                : () => `expected ${received} to be finite`,
            pass: passed
        };
    },

    // Greater than or equal
    toBeGeaterThanOrEqualTo(received, bound) {
        const passed = received >= bound;
        return {
            message: passed
                ? () => `expected ${received} to be less than or equal to ${bound}`
                : () => `expected ${received} to be greater than or equal to ${bound}`,
            pass: passed
        };
    },

    // Greater than
    toBeGreaterThan(received, bound) {
        const passed = received > bound;
        return {
            message: passed
                ? () => `expected ${received} to be less than ${bound}`
                : () => `expected ${received} to be greater than ${bound}`,
            pass: passed
        };
    },

    toBeEmptyArray(received) {
        const passed = received.length === 0;
        return {
            message: passed
                ? () => `expected ${received} not to be an empty array`
                : () => `expected ${received} to be an empty array`,
            pass: passed
        };
    }
});
