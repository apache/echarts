#!/usr/bin/env node

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

const {spawn} = require('child_process');
const path = require('path');
const chalk = require('chalk');
const fsExtra = require('fs-extra');


function release() {
    fsExtra.removeSync(path.resolve(__dirname, '../dist'));

    let idx = 0;

    const logs = [];

    function updateLog() {
        if (process.stdout.isTTY) {
            process.stdout.cursorTo(0, 0);
            process.stdout.clearScreenDown();
            for (let i = 0; i < logs.length; i++) {
                process.stdout.write(logs[i] || '');
            }
        }
    }

    const argsList = ['', 'simple', 'common', 'extension'].map((type) => {
        return [
            '--type',
            type,
            '--clean',
            '--sourcemap',
            '--min'
        ];
    });

    argsList.push([
        '--type', '', '--clean', '--sourcemap', '--min', '--format', 'esm'
    ])

    argsList.forEach(function (args) {

        const p = spawn(path.join(__dirname, 'build.js'), args);

        let scope = `[${args[1] || 'all'}]`;
        if (args[6]) {
            scope += `[${args[6]}]`;
        }

        function createOnDataHandler(idx)  {
            return function (data) {
                logs[idx] = `${chalk.gray(scope)}: ${data}`;
                updateLog();
            }
        }

        p.stdout.on('data', createOnDataHandler(idx));

        idx++;
    });
}

release();