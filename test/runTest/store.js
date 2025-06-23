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
const {testNameFromFile, getUserMetaFullPath} = require('./util');
const {blacklist, SVGBlacklist} = require('./blacklist');
const {getMarkedAsExpectedFullPath} = require('./util');

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
    // Replace # with PR- in the hash to avoid URL issues
    const expectedVersion = params.expectedSource === 'PR'
        ? params.expectedVersion.replace('#', 'PR-')
        : params.expectedVersion;
    const actualVersion = params.actualSource === 'PR'
        ? params.actualVersion.replace('#', 'PR-')
        : params.actualVersion;

    return [
        params.expectedSource,
        expectedVersion,
        params.actualSource,
        actualVersion,
        params.renderer,
        params.useCoarsePointer,
        params.theme || 'none'
    ].join(TEST_HASH_SPLITTER);
}

/**
 * Parse versions and rendering mode from run hash.
 */
function parseRunHash(str) {
    const parts = str.split(TEST_HASH_SPLITTER);
    // Convert back PR-123 to #123 for PR versions
    const expectedVersion = parts[0] === 'PR'
        ? parts[1].replace('PR-', '#')
        : parts[1];
    const actualVersion = parts[2] === 'PR'
        ? parts[3].replace('PR-', '#')
        : parts[3];

    return {
        expectedSource: parts[0],
        expectedVersion: expectedVersion,
        actualSource: parts[2],
        actualVersion: actualVersion,
        renderer: parts[4],
        useCoarsePointer: parts[5],
        theme: parts[6] || 'none'
    };
}

function getResultBaseDir() {
    return path.join(RESULTS_ROOT_DIR, _runHash);
}

module.exports.clearStaledResults = async function () {
    // If split by __ and there is no 7 parts, it is staled.
    try {
        const dirs = await globby('*', { cwd: RESULTS_ROOT_DIR, onlyDirectories: true });
        for (let dir of dirs) {
            const parts = dir.split(TEST_HASH_SPLITTER);
            if (parts.length !== 7) {
                await module.exports.delTestsRun(dir);
            }
        }
    }
    catch(e) {
        console.error('Failed to clear staled results', e);
    }
}

module.exports.getResultBaseDir = getResultBaseDir;
module.exports.getRunHash = getRunHash;

/**
 * Check run version is same with store version.
 */
module.exports.checkStoreVersion = function (runParams) {
    const storeParams = parseRunHash(_runHash);
    console.log('Store ', _runHash);
    return storeParams.expectedSource === runParams.expectedSource
        && storeParams.expectedVersion === runParams.expectedVersion
        && storeParams.actualSource === runParams.actualSource
        && storeParams.actualVersion === runParams.actualVersion
        && storeParams.renderer === runParams.renderer
        && storeParams.useCoarsePointer === runParams.useCoarsePointer
        && storeParams.theme === (runParams.theme || 'none');
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

        // Load marks for each test
        try {
            const marksPath = require('./util').getMarkedAsExpectedFullPath(testOpt.name);
            if (fs.existsSync(marksPath)) {
                // Always load as an array
                testOpt.markedAsExpected = JSON.parse(fs.readFileSync(marksPath, 'utf-8'));
            }
        } catch (e) {
            console.error(`Error loading marks for ${testOpt.name}:`, e);
            // Ignore errors when loading marks
        }
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

        const runData = {
            expectedSource: params.expectedSource,
            expectedVersion: params.expectedVersion,
            actualSource: params.actualSource,
            actualVersion: params.actualVersion,
            renderer: params.renderer,
            useCoarsePointer: params.useCoarsePointer,
            theme: params.theme || 'none',
            lastRunTime: lastRunTime > 0 ? formatDate(lastRunTime) : 'N/A',
            total: total,
            passed: passedCount,
            finished: finishedCount,
            id: dir,
            diskSize: convertBytes(await getFolderSize(path.join(RESULTS_ROOT_DIR, dir)))
        };

        results.push(runData);
    };
    return results;
}

module.exports.delTestsRun = async function (hash) {
    fse.removeSync(path.join(RESULTS_ROOT_DIR, hash));
}

module.exports.markTestAsExpected = function (testData) {
    const testName = testData.testName;
    const mark = {
        link: testData.link || '',
        comment: testData.comment || '',
        type: testData.type,
        markedBy: testData.markedBy || '',
        lastVersion: testData.lastVersion || '',
        markTime: testData.markTime || new Date().getTime()
    };

    console.log('Saving mark data:', mark);

    // Find the test
    const test = _tests.find(test => test.name === testName);
    if (!test) {
        throw new Error(`Test ${testName} not found`);
    }

    // Get existing marks or initialize an empty array
    let marks = [];
    const markFilePath = require('./util').getMarkedAsExpectedFullPath(testName);

    // Check if the marks file exists and load existing marks
    if (fs.existsSync(markFilePath)) {
        try {
            marks = JSON.parse(fs.readFileSync(markFilePath, 'utf-8'));
            if (!Array.isArray(marks)) {
                // Convert to array if it's a single object
                marks = [marks];
            }
        } catch (e) {
            console.error('Error reading existing marks file:', e);
            // Continue with empty array if there was an error
        }
    }

    // Add the new mark to the beginning of the array
    marks.unshift(mark);

    // Update test with marks array
    test.markedAsExpected = marks;

    // Save marks
    try {
        // Ensure directory exists
        const dirname = path.dirname(markFilePath);
        fse.ensureDirSync(dirname);

        // Write marks array to file
        fs.writeFileSync(markFilePath, JSON.stringify(marks, null, 2));
        console.log('Marks saved to', markFilePath);
        return true;
    }
    catch (e) {
        console.error('Failed to save marks:', e);
        throw e;
    }
}

module.exports.getUserMeta = function () {
    const metaPath = getUserMetaFullPath();
    if (fs.existsSync(metaPath)) {
        try {
            return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        }
        catch (e) {
            console.error('Failed to read user meta:', e);
            return {};
        }
    }
    return {};
}

module.exports.saveUserMeta = function (data) {
    const metaPath = getUserMetaFullPath();
    // Read existing data if exists
    let existingData = {};
    if (fs.existsSync(metaPath)) {
        try {
            existingData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        }
        catch (e) {
            console.error('Failed to read existing meta file:', e);
        }
    }

    // Merge new data with existing
    const updatedData = Object.assign({}, existingData, data);

    try {
        fs.writeFileSync(metaPath, JSON.stringify(updatedData, null, 2), 'utf-8');
        console.log('User meta saved successfully');
        return true;
    }
    catch (e) {
        console.error('Failed to save user meta:', e);
        return false;
    }
}

/**
 * Delete a specific mark for a test by its timestamp
 * @param {string} testName The name of the test
 * @param {number} markTime The timestamp of the mark to delete
 * @return {boolean} Whether the operation was successful
 */
module.exports.deleteMark = function(testName, markTime) {
    try {
        // Get the file path for the marks
        const marksFilePath = getMarkedAsExpectedFullPath(testName);

        // Check if the file exists
        if (!fs.existsSync(marksFilePath)) {
            console.log(`No marks file found for test "${testName}"`);
            return true; // Consider it successful if there was no file to delete
        }

        // Read the current marks
        const marksContent = fs.readFileSync(marksFilePath, 'utf-8');
        let marks;

        try {
            marks = JSON.parse(marksContent);
            // Ensure marks is an array
            if (!Array.isArray(marks)) {
                marks = [marks];
            }
        } catch (e) {
            console.error(`Error parsing marks file for test "${testName}":`, e);
            return false;
        }

        // Filter out the mark with the given timestamp
        const filteredMarks = marks.filter(mark => mark.markTime !== markTime);

        // If no marks were removed, return false
        if (filteredMarks.length === marks.length) {
            console.log(`No mark found with timestamp ${markTime} for test "${testName}"`);
            return false;
        }

        // Update the test object in memory
        const test = _tests.find(test => test.name === testName);
        if (test) {
            if (filteredMarks.length === 0) {
                test.markedAsExpected = null;
                // Remove the file if there are no marks left
                fs.unlinkSync(marksFilePath);
                console.log(`Deleted marks file for test "${testName}"`);
            } else {
                test.markedAsExpected = filteredMarks;
                // Write the filtered marks back to the file
                fs.writeFileSync(marksFilePath, JSON.stringify(filteredMarks, null, 2), 'utf-8');
                console.log(`Deleted mark with timestamp ${markTime} for test "${testName}"`);
            }
        }

        return true;
    } catch (e) {
        console.error(`Error deleting mark for test "${testName}" at time ${markTime}:`, e);
        return false;
    }
}
