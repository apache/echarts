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
const chalk = require('chalk');
const path = require('path');

module.exports = function progress(options = {}) {
    const scope = options.scope || {};
    scope.finished = scope.finished || 0;
    scope.total = scope.total || 0;

    return {
        name: 'progress',

        buildStart() {
            scope.finished = 0;
            scope.total = 0;
        },

        load() {
            // TODO More accurate total number
            scope.total++;
        },

        transform(code, id) {
            scope.finished++;
            const filePath = path.relative(process.cwd(), id).split(path.sep).join('/');

            const output = `[${scope.finished}/${scope.total}]: ${chalk.grey(filePath)}`;
            if (process.stdout.isTTY) {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(output);
            }
            else {
                console.log(output);
            }
        },

        buildEnd() {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
        }
    };
};
