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

function getCacheFilePath() {
    return path.join(__dirname, 'tmp/__cache__.json');;
}

module.exports.getTestsList = function () {
    return _tests;
};

module.exports.getTestByFileUrl = function (url) {
    return _testsMap[url];
};

module.exports.updateTestsList = async function (setPendingTestToUnsettled) {
    let tmpFolder = path.join(__dirname, 'tmp');
    fse.ensureDirSync(tmpFolder);
    _tests = [];
    _testsMap = {};
    try {
        let cachedStr = fs.readFileSync(getCacheFilePath(), 'utf-8');
        _tests = JSON.parse(cachedStr);
        _tests.forEach(test => {
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
        _tests = [];
    }
    // Find if there is new html file
    let files = await util.promisify(glob)('**.html', { cwd: path.resolve(__dirname, '../') });
    files.forEach(fileUrl => {
        if (blacklist.includes(fileUrl)) {
            return;
        }
        if (_testsMap[fileUrl]) {
            return;
        }

        let test = new Test(fileUrl);
        test.ignoreSVG = SVGBlacklist.includes(fileUrl);

        _tests.push(test);
        _testsMap[fileUrl] = test;
    });

    let actionsMetaData = {};
    let metaPath = path.join(__dirname, 'actions/__meta__.json');
    try {
        actionsMetaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
    catch(e) {}

    _tests.forEach(testOpt => {
        testOpt.actions = actionsMetaData[testOpt.name] || 0;
    });
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
    let metaData;
    let metaPath = path.join(__dirname, 'actions/__meta__.json');
    try {
        metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
    catch(e) {
        metaData = {};
    }
    metaData[testName] = actions.length;
    fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2), 'utf-8');
};