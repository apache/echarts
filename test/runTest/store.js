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
const globby = require('globby');
const {testNameFromFile} = require('./util');
const {blacklist, SVGBlacklist} = require('./blacklist');

let _tests = [];
let _testsMap = {};
let _runHash = '';

const RESULT_FILE_NAME = '__result__.json';
const RESULTS_ROOT_DIR = path.join(__dirname, 'tmp', 'result');

module.exports.RESULT_FILE_NAME = RESULT_FILE_NAME;
module.exports.RESULTS_ROOT_DIR = RESULTS_ROOT_DIR;

const TEST_HASH_SPLITTER = '__';

function convertBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes == 0) {
        return 'N/A';
    }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(Math.min(1, i)) + ' ' + sizes[i]
}
class Test {
    constructor(fileUrl) {
        this.fileUrl = fileUrl;
        this.name = testNameFromFile(fileUrl);

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


/**
 * hash of each run is mainly for storing the results.
 * It depends on two versions and rendering mode.
 */
function getRunHash(params) {
    return [
        params.expectedVersion,
        params.actualVersion,
        params.renderer,
        params.useCoarsePointer
    ].join(TEST_HASH_SPLITTER);
}

/**
 * Parse versions and rendering mode from run hash.
 */
function parseRunHash(str) {
    const parts = str.split(TEST_HASH_SPLITTER);
    return {
        expectedVersion: parts[0],
        actualVersion: parts[1],
        renderer: parts[2],
        useCoarsePointer: parts[3]
    };
}

function getResultBaseDir() {
    return path.join(RESULTS_ROOT_DIR, _runHash);
}

module.exports.getResultBaseDir = getResultBaseDir;
module.exports.getRunHash = getRunHash;

/**
 * Check run version is same with store version.
 */
module.exports.checkStoreVersion = function (runParams) {
    const storeParams = parseRunHash(_runHash);
    console.log('Store ', _runHash);
    return storeParams.expectedVersion === runParams.expectedVersion
        && storeParams.actualVersion === runParams.actualVersion
        && storeParams.renderer === runParams.renderer
        && storeParams.useCoarsePointer === runParams.useCoarsePointer;
}

function getResultFilePath() {
    return path.join(getResultBaseDir(), RESULT_FILE_NAME);
}

module.exports.getResultFilePath = getResultFilePath;

module.exports.getTestsList = function () {
    return _tests;
};

module.exports.getTestByFileUrl = function (url) {
    return _testsMap[url];
};

module.exports.updateTestsList = async function (
    runHash,
    setPendingTestToUnsettled
) {
    _runHash = runHash;
    _tests = [];
    _testsMap = {};
    _testsExists = {};

    const isSVGRenderer = parseRunHash(runHash).renderer === 'svg';

    fse.ensureDirSync(getResultBaseDir());

    try {
        let cachedStr = fs.readFileSync(getResultFilePath(), 'utf-8');
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
    const files = await globby('*.html', { cwd: path.resolve(__dirname, '../') });
    files.forEach(fileUrl => {
        if (blacklist.includes(fileUrl)) {
            return;
        }
        if (isSVGRenderer && SVGBlacklist.includes(fileUrl)) {
            return;
        }

        _testsExists[fileUrl] = true;

        if (_testsMap[fileUrl]) {
            return;
        }

        const test = new Test(fileUrl);

        _testsMap[fileUrl] = test;
    });

    // Exclude tests that there is no HTML files.
    Object.keys(_testsExists).forEach(key => {
        _tests.push(_testsMap[key]);
    });

    let actionsMetaData = {};
    const metaPath = path.join(__dirname, 'actions/__meta__.json');
    try {
        actionsMetaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
    catch(e) {
        console.log(e);
    }

    _tests.forEach(testOpt => {
        testOpt.actions = actionsMetaData[testOpt.name] || 0;
    });

    // Save once.
    module.exports.saveTestsList();

    return _tests;
};

module.exports.saveTestsList = function () {
    fse.ensureDirSync(getResultBaseDir());
    fs.writeFileSync(getResultFilePath(), JSON.stringify(_tests, null, 2), 'utf-8');
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


async function getFolderSize(dir) {
    const files = await globby(dir);
    let size = 0;
    for (let file of files) {
        size += fs.statSync(file).size;
    }
    return size;
}
/**
 * Get results of all runs
 * @return [ { id, expectedVersion, actualVersion, renderer, lastRunTime, total, finished, passed, diskSize  } ]
 */
module.exports.getAllTestsRuns = async function () {
    const dirs = await globby('*', { cwd: RESULTS_ROOT_DIR, onlyDirectories: true });
    const results = [];

    function f(number) {
        return number < 10 ? '0' + number : number;
    }
    function formatDate(lastRunTime) {
        const date = new Date(lastRunTime);
        return `${date.getFullYear()}-${f(date.getMonth() + 1)}-${f(date.getDate())} ${f(date.getHours())}:${f(date.getMinutes())}:${f(date.getSeconds())}`;
    }
    for (let dir of dirs) {
        const params = parseRunHash(dir);
        let resultJson = [];
        try {
            resultJson = JSON.parse(fs.readFileSync(path.join(
                RESULTS_ROOT_DIR,
                dir,
                RESULT_FILE_NAME
            ), 'utf-8'));
        }
        catch (e) {
            console.error('Invalid result ' + dir)
            continue;
        }

        const total = resultJson.length;
        let lastRunTime = 0;
        let finishedCount = 0;
        let passedCount = 0;

        resultJson.forEach(test => {
            lastRunTime = Math.max(test.lastRun, lastRunTime);
            if (test.status === 'finished') {
                finishedCount++;

                let passed = true;
                test.results.forEach(result => {
                    // Threshold?
                    if (result.diffRatio > 0.0001) {
                        passed = false;
                    }
                });
                if (passed) {
                    passedCount++;
                }
            }
        });

        if (finishedCount === 0) {
            // Cleanup empty runs
            await module.exports.delTestsRun(dir);
            continue;
        }

        params.lastRunTime = lastRunTime > 0 ? formatDate(lastRunTime) : 'N/A';
        params.total = total;
        params.passed = passedCount;
        params.finished = finishedCount;
        params.id = dir;
        params.diskSize = convertBytes(await getFolderSize(path.join(RESULTS_ROOT_DIR, dir)));

        results.push(params);
    };
    return results;
}

module.exports.delTestsRun = async function (hash) {
    fse.removeSync(path.join(RESULTS_ROOT_DIR, hash));
}