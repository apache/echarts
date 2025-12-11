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

const fs = require('fs');
const chalk = require('chalk');
const preamble = require('./preamble');
const eachFile = require('./headerUtil').eachFile;

function run() {
    const missingFiles = [];

    eachFile(function (absolutePath, fileExt) {
        const fileStr = fs.readFileSync(absolutePath, 'utf-8');
        const existLicense = preamble.extractLicense(fileStr, fileExt);

        if (!existLicense && preamble.hasPreamble(fileExt)) {
            missingFiles.push(absolutePath);
        }
    });

    if (missingFiles.length) {
        console.error(chalk.red('Files missing license header:'));
        missingFiles.forEach(function (path) {
            console.error(chalk.red(path));
        });
        console.error(chalk.red('\nPlease run `node build/addHeader.js` before commit.'));
        process.exit(1);
    }
}

run();
