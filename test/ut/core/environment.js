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

const JSDOMEnvironment = require('jest-environment-jsdom');

// `process.env` in tests is a copy made by jest, so setting `TZ` on it does not
// change the time zone used by `Date`. `setTimezone` sets it on the real process.
class TestEnvironment extends JSDOMEnvironment {

    constructor(config, context) {
        super(config, context);
        const originalTZ = process.env.TZ;
        this.global.setTimezone = function (timezone) {
            if (timezone == null) {
                timezone = originalTZ;
            }
            if (timezone == null) {
                delete process.env.TZ;
            }
            else {
                process.env.TZ = timezone;
            }
        };
    }

    async teardown() {
        // Do not let the time zone leak into other test files run by the same worker.
        this.global.setTimezone();
        await super.teardown();
    }
}

module.exports = TestEnvironment;
