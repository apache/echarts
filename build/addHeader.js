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
const preamble = require('./preamble');
const pathTool = require('path');
const {color} = require('zrender/build/helper');

// In the `.headerignore`, each line is a pattern in RegExp.
// all relative path (based on the echarts base directory) is tested.
// The pattern should match the relative path completely.
const excludesPath = pathTool.join(__dirname, '../.headerignore');
const ecBasePath = pathTool.join(__dirname, '../');

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
                console.log(color('fgGreen', 'dim')(path));
            });
        }
        else {
            console.log(color('fgGreen', 'dim')(passFiles.length + ' files. (use argument "--verbose" see details)'));
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
            console.log(color('fgGreen', 'bright')(path));
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
            console.log(color('fgRed', 'dim')(path));
        });
    }
    else {
        console.log('Nothing.');
    }

    console.log('\nDone.');
}

function eachFile(visit) {

    const excludePatterns = [];
    const extReg = /\.([a-zA-Z0-9_-]+)$/;

    prepareExcludePatterns();
    travel('./');

    function travel(relativePath) {
        if (isExclude(relativePath)) {
            return;
        }

        const absolutePath = pathTool.join(ecBasePath, relativePath);
        const stat = fs.statSync(absolutePath);

        if (stat.isFile()) {
            visit(absolutePath, getExt(absolutePath));
        }
        else if (stat.isDirectory()) {
            fs.readdirSync(relativePath).forEach(function (file) {
                travel(pathTool.join(relativePath, file));
            });
        }
    }

    function prepareExcludePatterns() {
        const content = fs.readFileSync(excludesPath, {encoding: 'utf-8'});
        content.replace(/\r/g, '\n').split('\n').forEach(function (line) {
            line = line.trim();
            if (line && line.charAt(0) !== '#') {
                excludePatterns.push(new RegExp(line));
            }
        });
    }

    function isExclude(relativePath) {
        for (let i = 0; i < excludePatterns.length; i++) {
            if (excludePatterns[i].test(relativePath)) {
                return true;
            }
        }
    }

    function getExt(path) {
        if (path) {
            const mathResult = path.match(extReg);
            return mathResult && mathResult[1];
        }
    }
}

run();
