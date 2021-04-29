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

const path = require('path');
const fse = require('fs-extra');
const fs = require('fs');
const glob = require('glob');
const {testNameFromFile} = require('./util');
const util = require('util');
const {blacklist, SVGBlacklist} = require('./blacklist');

let _tests = [];
let _testsMap = {};
let _testHash = '';

class Test {
    constructor(fileUrl) {
        this.fileUrl = fileUrl;
        this.name = testNameFromFile(fileUrl);

        // If this test case ignore svg testing.
        this.ignoreSVG = false;

        this.status = 'unsettled';

        // Run results
        this.results = [];  // Screenshots

        this.actualLogs = [];
        this.expectedLogs = [];
        this.actualErrors = [];
        this.expectedErrors = [];

        // Use echarts versions.
        this.actualVersion = null;
        this.expectedVersion = null;

        // Last timestamp
        this.lastRun = 0;

        // Use SVG
        this.useSVG = false;
    }
}

function getResultBaseDir() {
    return path.join(__dirname, 'tmp', 'result', _testHash);
}

module.exports.getResultBaseDir = getResultBaseDir;

function getCacheFilePath(baseDir) {
    return path.join(getResultBaseDir(), '__result__.json');;
}

module.exports.getTestsList = function () {
    return _tests;
};

module.exports.getTestByFileUrl = function (url) {
    return _testsMap[url];
};

module.exports.updateTestsList = async function (
    testHash,
    setPendingTestToUnsettled
) {
    _testHash = testHash;
    _tests = [];
    _testsMap = {};
    _testsExists = {};

    fse.ensureDirSync(getResultBaseDir());

    try {
        let cachedStr = fs.readFileSync(getCacheFilePath(), 'utf-8');
        const tests = JSON.parse(cachedStr);
        tests.forEach(test => {
            // In somehow tests are stopped and leave the status pending.
            // Set the status to unsettled again.
            if (setPendingTestToUnsettled) {
                if (test.status === 'pending') {
                    test.status = 'unsettled';
                }
            }
            _testsMap[test.fileUrl] = test;
        });
    }
    catch(e) {
    }
    // Find if there is new html file
    const files = await util.promisify(glob)('**.html', { cwd: path.resolve(__dirname, '../') });
    files.forEach(fileUrl => {
        if (blacklist.includes(fileUrl)) {
            return;
        }
        _testsExists[fileUrl] = true;

        if (_testsMap[fileUrl]) {
            return;
        }

        const test = new Test(fileUrl);
        test.ignoreSVG = SVGBlacklist.includes(fileUrl);

        _testsMap[fileUrl] = test;
    });

    // Exclude tests that there is no HTML files.
    Object.keys(_testsExists).forEach(key => {
        _tests.push(_testsMap[key]);
    });

    const actionsMetaData = {};
    const metaPath = path.join(__dirname, 'actions/__meta__.json');
    try {
        actionsMetaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
    catch(e) {}

    _tests.forEach(testOpt => {
        testOpt.actions = actionsMetaData[testOpt.name] || 0;
    });

    // Save once.
    module.exports.saveTestsList();

    return _tests;
};

module.exports.saveTestsList = function () {
    fse.outputFileSync(getCacheFilePath(), JSON.stringify(_tests, null, 2), 'utf-8');
};

module.exports.mergeTestsResults = function (testsResults) {
    testsResults.forEach(testResult => {
        if (_testsMap[testResult.fileUrl]) {
            Object.assign(_testsMap[testResult.fileUrl], testResult);
        }
    });
};

module.exports.updateActionsMeta = function (testName, actions) {
    let metaPath = path.join(__dirname, 'actions/__meta__.json');
    try {
        metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
    catch(e) {
        metaData = {};
    }
    metaData[testName] = actions.length;

    fs.writeFileSync(metaPath, JSON.stringify(
        metaData, Object.keys(metaData).sort((a, b) => a.localeCompare(b)), 2
    ), 'utf-8');
};