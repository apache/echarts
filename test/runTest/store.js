const path = require('path');
const fse = require('fs-extra');
const fs = require('fs');
const glob = require('glob');
const {getTestName} = require('./util');
const util = require('util');
const blacklist = require('./blacklist');

let _tests = [];
let _testsMap = {};

function getCacheFilePath() {
    return path.join(__dirname, 'tmp/__cache__.json');;
}

module.exports.getTestsList = function () {
    return _tests;
};

module.exports.getTestByFileUrl = function (url) {
    return _testsMap[url];
};

module.exports.updateTestsList = async function () {
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
            if (test.status === 'pending') {
                test.status = 'unsettled';
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

        let test = {
            fileUrl,
            name: getTestName(fileUrl),
            // Default status should be unkown
            // status: 'pending',
            results: []
        };

        _tests.push(test);
        _testsMap[fileUrl] = test;
    });
    let statAsync = util.promisify(fs.stat);
    // Find if file has actions.
    await Promise.all(_tests.map(testOpt => {
        return statAsync(path.join(__dirname, 'actions', testOpt.name + '.json'))
            .then(() => {
                testOpt.hasActions = true;
            })
            .catch(() => {
                testOpt.hasActions = false;
            });
    }));

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