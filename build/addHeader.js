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

const isVerbose = process.argv[2] === '--verbose';

// const lists = [
//     '../src/**/*.js',
//     '../build/*.js',
//     '../benchmark/src/*.js',
//     '../benchmark/src/gulpfile.js',
//     '../extension-src/**/*.js',
//     '../extension/**/*.js',
//     '../map/js/**/*.js',
//     '../test/build/**/*.js',
//     '../test/node/**/*.js',
//     '../test/ut/core/*.js',
//     '../test/ut/spe/*.js',
//     '../test/ut/ut.js',
//     '../test/*.js',
//     '../theme/*.js',
//     '../theme/tool/**/*.js',
//     '../echarts.all.js',
//     '../echarts.blank.js',
//     '../echarts.common.js',
//     '../echarts.simple.js',
//     '../index.js',
//     '../index.common.js',
//     '../index.simple.js'
// ];

function run() {
    const updatedFiles = [];
    const passFiles = [];
    const pendingFiles = [];

    eachFile(function (absolutePath, fileExt) {
        const fileStr = fs.readFileSync(absolutePath, 'utf-8');

        const existLicense = preamble.extractLicense(fileStr, fileExt);

        if (existLicense) {
            passFiles.push(absolutePath);
            return;
        }

        // Conside binary files, only add for files with known ext.
        if (!preamble.hasPreamble(fileExt)) {
            pendingFiles.push(absolutePath);
            return;
        }

        fs.writeFileSync(absolutePath, preamble.addPreamble(fileStr, fileExt), 'utf-8');
        updatedFiles.push(absolutePath);
    });

    console.log('\n');
    console.log('----------------------------');
    console.log(' Files that exists license: ');
    console.log('----------------------------');
    if (passFiles.length) {
        if (isVerbose) {
            passFiles.forEach(function (path) {
                console.log(chalk.green(path));
            });
        }
        else {
            console.log(chalk.green(passFiles.length + ' files. (use argument "--verbose" see details)'));
        }
    }
    else {
        console.log('Nothing.');
    }

    console.log('\n');
    console.log('--------------------');
    console.log(' License added for: ');
    console.log('--------------------');
    if (updatedFiles.length) {
        updatedFiles.forEach(function (path) {
            console.log(chalk.green(path));
        });
    }
    else {
        console.log('Nothing.');
    }

    console.log('\n');
    console.log('----------------');
    console.log(' Pending files: ');
    console.log('----------------');
    if (pendingFiles.length) {
        pendingFiles.forEach(function (path) {
            console.log(chalk.red(path));
        });
    }
    else {
        console.log('Nothing.');
    }

    console.log('\nDone.');
}



run();
