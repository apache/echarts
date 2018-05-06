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

/**
 * Usage of `.rat-excludes`:
 * For consistency, we use `.rat-excludes` for both Apache Rat and this tool.
 * In the `.rat-excludes`, each line is a string of RegExp.
 * Notice, the regular expression should match the entire path
 * (a relative path based on `echarts` root).
 */

const fs = require('fs');
const preamble = require('./preamble');
const pathTool = require('path');
const {color} = require('zrender/build/helper');
const excludesPath = pathTool.join(__dirname, '../.rat-excludes');
const ecBasePath = pathTool.join(__dirname, '../');

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

        // fs.writeFileSync(absolutePath, preamble.addPreamble(fileStr, fileExt), 'utf-8');
        updatedFiles.push(absolutePath);
    });

    if (passFiles.length) {
        console.log('\n\n');
        console.log('----------------------------');
        console.log(' Files that exists license: ');
        console.log('----------------------------');
        passFiles.forEach(function (path) {
            console.log(color('fgGreen', 'dim')(path));
        });
    }

    if (updatedFiles.length) {
        console.log('\n\n');
        console.log('--------------------');
        console.log(' License added for: ');
        console.log('--------------------');
        updatedFiles.forEach(function (path) {
            console.log(color('fgGreen', 'bright')(path));
        });
    }

    if (pendingFiles.length) {
        console.log('\n\n');
        console.log('----------------');
        console.log(' Pending files: ');
        console.log('----------------');
        pendingFiles.forEach(function (path) {
            console.log(color('fgRed', 'dim')(path));
        });
    }

    console.log('\n Done.');
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

    // In Apache Rat, an item of the exclude file should be a regular expression
    // that matches the entire relative path, like `pattern.matches(...)` of Java.
    // See <https://github.com/sonatype/plexus-utils/blob/master/src/main/java/org/codehaus/plexus/util/AbstractScanner.java#L374>,
    // That means that if a directory `some/dir` is in the exclude file,
    // `some/dir/aa` will not be excluded, which is not expected conventionally,
    // so we do not tread it like that.
    function prepareExcludePatterns() {
        const content = fs.readFileSync(excludesPath, {encoding: 'utf-8'});
        content.replace(/\r/g, '\n').split('\n').forEach(function (line) {
            line = line.trim();
            if (line && line.charAt(0) !== '#') {
                excludePatterns.push(new RegExp(line));
            }
        });
    }

    // In Apache Rat, the ecludes file is check against the relative path
    // (based on the base directory specified by the "--dir")
    // See <https://github.com/sonatype/plexus-utils/blob/master/src/main/java/org/codehaus/plexus/util/DirectoryScanner.java#L400>
    // Here we assume that the base directory is the `ecBasePath`.
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
