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


const nodeFS = require('fs');
const assert = require('assert');
const nodePath = require('path');
const commander = require('commander');
const chalk = require('chalk');

const testDir = nodePath.resolve(__dirname, '..');
let testTplPath;
const tplSegmentDelimiter = '<!-- TPL_SEGMENT_DELIMITER -->';
const tagDomId = /{{TPL_DOM_ID}}/g;
const tagDomPlace = '<!-- TPL_DOM_PLACE -->';
const tagJSPlace = '<!-- TPL_JS_PLACE -->';

const manualText = `
    ${chalk.cyan.dim('Usage:')}

    # Make a file named "bar-action.html" in directory "echarts/test" with 1 initial chart.
    ${chalk.green('npm run mktest bar-action.html')}

    # or (make test with the most commonly used inputs)
    ${chalk.green('npm run mktest2 bar-action.html')}

    # or (make test with all inputs)
    ${chalk.green('npm run mktest3 bar-action.html')}

    # or (make test with canvas debug)
    ${chalk.green('npm run mktest:canvas:debug tmp-bar.html')}

    # or
    ${chalk.green('node ./test/build/mktest bar-action.html')}

    # Make a file named "bar-action.html" in directory "echarts/test" with 5 initial charts.
    ${chalk.green('npm run mktest bar-action.html 5')}
    # or
    ${chalk.green('node ./test/build/mktest bar-action.html 5')}

    # Note: ".html" can be ignored:
    ${chalk.green('npm run mktest bar-action')}
`;

function run() {
    let opt = prepareOpt();

    if (!opt) {
        return;
    }

    if (nodeFS.existsSync(opt.testFilePath)) {
        printError(`The file ${opt.testFilePath} exists! Please chose another name.`);
        printError('Please chose another name.');
        console.log(manualText);
        return;
    }

    const testTplContent = nodeFS.readFileSync(testTplPath, {encoding: 'utf8'});

    const testFileContent = opt.withCanvasDebug
        ? testTplContent
        : makeTestFileContent(opt, testTplContent);

    nodeFS.writeFileSync(opt.testFilePath, testFileContent, {encoding: 'utf8'});

    console.log(`A test file has been added in: \n${chalk.green(opt.testFilePath)}`);
    console.log();
}

function prepareOpt() {
    commander
        .usage('test-file-name [chart-number]')
        .description(manualText)
        .option('--with-inputs-common', 'include common inputs')
        .option('--with-inputs-all', 'include all inputs')
        .option('--with-canvas-debug', 'canvas debug')
        .parse(process.argv);

    let args = commander.args || [];

    const opts = commander.opts();

    if (opts.withInputsCommon) {
        testTplPath = nodePath.resolve(__dirname, 'mktest-tpl2.html');
    }
    else if (opts.withInputsAll) {
        testTplPath = nodePath.resolve(__dirname, 'mktest-tpl3.html');
    }
    else if (opts.withCanvasDebug) {
        testTplPath = nodePath.resolve(__dirname, 'mktest-tpl-canvas-debug.html');
    }
    else {
        testTplPath = nodePath.resolve(__dirname, 'mktest-tpl.html');
    }

    let testFileName = args[0];
    let testCaseNumber = args[1];
    if (isNaN(testCaseNumber)) {
        testCaseNumber = 1;
    }

    if (!testFileName) {
        printError('Must input a file name!');
        console.log(manualText);
        return;
    }

    testFileName = normalizeInputExt(testFileName);
    let testFilePath = nodePath.resolve(testDir, testFileName);

    return {
        testFileName: testFileName,
        testFilePath: testFilePath,
        testCaseNumber: testCaseNumber,
        withCanvasDebug: opts.withCanvasDebug
    };
}

function makeTestFileContent(opt, testTplContent) {
    const testTplSegments = testTplContent.split(tplSegmentDelimiter);

    const tplSegMain = testTplSegments[0];
    const tplSegDom = testTplSegments[1];
    const tplSegJS = testTplSegments[2];

    assert(tplSegMain && tplSegDom && tplSegJS);

    let segDomList = [];
    let segJSList = [];

    for (let i = 0; i < opt.testCaseNumber; i++) {
        let domId = 'main' + i;
        segDomList.push(tplSegDom.replace(tagDomId, domId));
        segJSList.push(tplSegJS.replace(tagDomId, domId));
    }

    let htmlContent = tplSegMain
        .replace(tagDomPlace, segDomList.join('\n'))
        .replace(tagJSPlace, segJSList.join('\n'));

    return htmlContent;
}

function normalizeInputExt(testFileName) {
    if (hasExt(testFileName, '.html')) {
        return testFileName;
    }
    else if (hasExt(testFileName, '.htm')) {
        return testFileName + 'l';
    }
    else {
        return testFileName + '.html';
    }

    function hasExt(fileName, ext) {
        let idx = fileName.lastIndexOf(ext);
        return idx >= 0 && idx === fileName.length - ext.length;
    }
}

function printError(msg) {
    console.error(chalk.red('[ERROR]: ' + msg));
}

run();
