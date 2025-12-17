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

// TODO: Cases that needs lots of network loading still may fail. Like bmap-xxx

const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fse = require('fs-extra');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const compareScreenshot = require('./compareScreenshot');
const {testNameFromFile, fileNameFromTest, getVersionDir, buildRuntimeCode, getEChartsTestFileName, waitTime} = require('./util');
const {origin} = require('./config');
const cwebpBin = require('cwebp-bin');
const { execFile } = require('child_process');
const {runTasks} = require('./task');
const chalk = require('chalk');

// Handling input arguments.
program
    .option('-t, --tests <tests>', 'Tests names list')
    .option('--no-headless', 'Not headless')
    .option('-s, --speed <speed>', 'Playback speed')
    .option('--expected <expected>', 'Expected version')
    .option('--expected-source <expectedSource>', 'Expected source')
    .option('--actual <actual>', 'Actual version')
    .option('--actual-source <actualSource>', 'Actual source')
    .option('--renderer <renderer>', 'svg/canvas renderer')
    .option('--use-coarse-pointer <useCoarsePointer>', '"auto" (by default) or "true" or "false"')
    .option('--threads <threads>', 'How many threads to run concurrently')
    .option('--theme <theme>', 'Theme to use)')
    .option('--no-save', 'Don\'t save result')
    .option('--dir <dir>', 'Out dir');

program.parse(process.argv);

program.speed = +program.speed || 1;
program.actual = program.actual || 'local';
program.threads = +program.threads || 1;
program.renderer = (program.renderer || 'canvas').toLowerCase();
program.useCoarsePointer = (program.useCoarsePointer || 'auto').toLowerCase();
program.theme = program.theme || 'none';
console.log('CLI theme parameter:', program.theme);
program.dir = program.dir || (__dirname + '/tmp');

if (!program.tests) {
    throw new Error('Tests are required');
}
if (!program.expected) {
    throw new Error('Expected version is required');
}

console.log('Playback Ratio: ', program.speed);

function getScreenshotDir() {
    return `${program.dir}/__screenshot__`;
}

function sortScreenshots(list) {
    return list.sort((a, b) => {
        return a.screenshotName.localeCompare(b.screenshotName);
    });
}

function getClientRelativePath(absPath) {
    return path.join('../', path.relative(__dirname, absPath));
}

function replaceEChartsVersion(interceptedRequest, source, version) {
    // TODO Extensions and maps
    if (interceptedRequest.url().endsWith('dist/echarts.js')) {
        console.log('Use echarts version: ' + source + ' ' + version);
        interceptedRequest.continue({
            url: `${origin}/test/runTest/${getVersionDir(source, version)}/${getEChartsTestFileName()}`
        });
    }
    else {
        interceptedRequest.continue();
    }
}

async function convertToWebP(filePath, lossless) {
    const webpPath = filePath.replace(/\.png$/, '.webp');
    return new Promise((resolve, reject) => {
        execFile(cwebpBin, [
            filePath,
            '-o', webpPath,
            ...(lossless ? ['-lossless'] : ['-q', 75])
        ], (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(webpPath);
            }
        });
    });
}

async function takeScreenshot(page, fullPage, fileUrl, desc, isExpected, minor) {
    let screenshotName = testNameFromFile(fileUrl);
    if (desc) {
        screenshotName += '-' + slugify(desc, { replacement: '-', lower: true });
    }
    if (minor) {
        screenshotName += '-' + minor;
    }
    const screenshotPrefix = isExpected ? 'expected' : 'actual';
    fse.ensureDirSync(getScreenshotDir());
    const screenshotPath = path.join(getScreenshotDir(), `${screenshotName}-${screenshotPrefix}.png`);
    await page.screenshot({
        path: screenshotPath,
        // https://github.com/puppeteer/puppeteer/issues/7043
        // https://github.com/puppeteer/puppeteer/issues/6921#issuecomment-829586680
        captureBeyondViewport: false,
        fullPage
    });

    let webpScreenshotPath;
    try {
        webpScreenshotPath = await convertToWebP(screenshotPath);
    } catch (e) {
        console.error('Failed to convert screenshot to webp', e);
    }

    console.log('Screenshot: ', webpScreenshotPath || screenshotPath);

    return {
        screenshotName,
        screenshotPath: webpScreenshotPath || screenshotPath,
        rawScreenshotPath: screenshotPath
    };
}

async function waitForNetworkIdle(page) {
    let count = 0;
    const started = () => (count = count + 1);
    const ended = () => (count = count - 1);
    page.on('request', started);
    page.on('requestfailed', ended);
    page.on('requestfinished', ended);
    return async (timeout = 5000) => {
        while (count > 0) {
            await waitTime(100);
            if ((timeout = timeout - 100) < 0) {
                console.error('Timeout');
            }
        }
        page.off('request', started);
        page.off('requestfailed', ended);
        page.off('requestfinished', ended);
    };
}

/**
 * @param {puppeteer.Browser} browser
 */
async function runTestPage(browser, testOpt, source, version, runtimeCode, isExpected) {
    const fileUrl = testOpt.fileUrl;
    const screenshots = [];
    const logs = [];
    const errors = []; // string[]

    const page = await browser.newPage();
    page.setRequestInterception(true);
    page.on('request', request => replaceEChartsVersion(request, source, version));

    async function pageScreenshot() {
        if (!program.save) {
            return;
        }
        // Final shot.
        await page.mouse.move(0, 0);
        const desc = 'Full Shot';
        const {
            screenshotName,
            screenshotPath,
            rawScreenshotPath
        } = await takeScreenshot(page, true, fileUrl, desc, isExpected);
        screenshots.push({
            screenshotName,
            desc,
            screenshotPath,
            rawScreenshotPath
        });
    }

    let vstInited = false;

    await page.exposeFunction('__VRT_INIT__', () => {
        vstInited = true;
    });
    await page.exposeFunction('__VRT_MOUSE_MOVE__', async (x, y) =>  {
        await page.mouse.move(x, y);
    });
    await page.exposeFunction('__VRT_MOUSE_DOWN__', async (errMsgPart) =>  {
        try {
            await page.mouse.down();
        }
        catch (err) {
            // e.g., if double mousedown without a mouseup, error "'left' is already pressed." will be thrown.
            // Report to users to re-record the test case.
            if (errMsgPart) {
                if ((err.message + '').indexOf('already pressed') >= 0) {
                    errMsgPart += ' May be caused by duplicated mousedowns without a mouseup.'
                        + ' Please re-record the test case.';
                }
                err.message = err.message + ' ' + errMsgPart;
            }
            throw err;
        }
    });
    await page.exposeFunction('__VRT_MOUSE_UP__', async (errMsgPart) =>  {
        try {
            await page.mouse.up();
        }
        catch (err) {
            if (errMsgPart) {
                err.message = err.message + ' ' + errMsgPart;
            }
            throw err;
        }
    });
    await page.exposeFunction('__VRT_LOAD_ERROR__', async (errStr) =>  {
        errors.push(errStr);
    });
    // await page.exposeFunction('__VRT_WAIT_FOR_NETWORK_IDLE__', async () =>  {
    //     await waitForNetworkIdle();
    // });

    // TODO should await exposeFunction here
    const waitForScreenshot = new Promise((resolve) => {
        page.exposeFunction('__VRT_FULL_SCREENSHOT__', async () =>  {
            await pageScreenshot();
            resolve();
        });
    });

    const waitForActionFinishManually = new Promise((resolve) => {
        page.exposeFunction('__VRT_FINISH_ACTIONS__', async () =>  {
            resolve();
        });
    });

    page.exposeFunction('__VRT_LOG_ERRORS__', (errStr) =>  {
        errors.push(errStr);
    });

    let actionScreenshotCount = {};

    await page.exposeFunction('__VRT_ACTION_SCREENSHOT__', async (action) =>  {
        if (!program.save) {
            return;
        }
        const desc = action.desc || action.name;
        actionScreenshotCount[action.name] = actionScreenshotCount[action.name] || 0;
        const {
            screenshotName,
            screenshotPath,
            rawScreenshotPath
        } = await takeScreenshot(page, false, testOpt.fileUrl, desc, isExpected, actionScreenshotCount[action.name]++);
        screenshots.push({
            screenshotName,
            desc,
            screenshotPath,
            rawScreenshotPath
        });
    });

    await page.evaluateOnNewDocument(runtimeCode);

    page.on('console', msg => {
        // console.log('Page Log: ', msg.text());
        logs.push(msg.text());
    });
    page.on('pageerror', error => {
        console.error('Page Error: ', error.toString());
        errors.push(error.toString());
    });
    page.on('dialog', async dialog => {
        await dialog.dismiss();
    });

    try {
        await page.setViewport({
            width: 800,
            height: 600,
        });

        let url = `${origin}/test/${fileUrl}?__RENDERER__=${program.renderer}&__COARSE__POINTER__=${program.useCoarsePointer}`;

        if (program.theme && program.theme !== 'none' && version === 'local') {
            url += `&__THEME__=${program.theme}`;
        }

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 10000,
            // timeout: 0
        });

        if (!vstInited) {    // Not using simpleRequire in the test
            console.log(`Automatically started in ${testNameFromFile(fileUrl)}`);
            await page.evaluate(() => {
                __VRT_START__();
            });
        }
        // Wait do screenshot after inited
        await waitForScreenshot;

        let actions = [];
        try {
            let actContent = await fse.readFile(path.join(__dirname, 'actions', testOpt.name + '.json'));
            actions = JSON.parse(actContent);
        }
        catch (e) {
            // console.log(e);
        }
        if (actions.length > 0) {
            try {
                page.evaluate((actions) => {
                    __VRT_RUN_ACTIONS__(actions);
                }, actions);
            }
            catch (e) {
                errors.push(e.toString());
            }
            // We need to use the actions finish signal if there is reload happens in the page.
            // Because the original __VRT_RUN_ACTIONS__ not exists anymore.
            await waitForActionFinishManually;
        }
    }
    catch(e) {
        console.error(e);
    }

    await page.close();

    return {
        logs,
        errors,
        screenshots: screenshots
    };
}

function writePNG(diffPNG, diffPath) {
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(diffPath);
        diffPNG.pack().pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

/**
 * @param {puppeteer.Browser} browser
 */
async function runTest(browser, testOpt, runtimeCode, expectedSource, expectedVersion, actualSource, actualVersion) {
    if (program.save) {
        testOpt.status === 'running';

        const expectedResult = await runTestPage(browser, testOpt, expectedSource, expectedVersion, runtimeCode, true);
        const actualResult = await runTestPage(browser, testOpt, actualSource, actualVersion, runtimeCode, false);

        // sortScreenshots(expectedResult.screenshots);
        // sortScreenshots(actualResult.screenshots);

        const screenshots = [];
        let idx = 0;
        for (let shot of expectedResult.screenshots) {
            const expected = shot;
            const actual = actualResult.screenshots[idx++];
            const result = {
                actual: getClientRelativePath(actual.screenshotPath),
                expected: getClientRelativePath(expected.screenshotPath),
                name: actual.screenshotName,
                desc: actual.desc
            };
            try {
                const {diffRatio, diffPNG} = await compareScreenshot(
                    expected.rawScreenshotPath,
                    actual.rawScreenshotPath
                );

                const diffPath = `${getScreenshotDir()}/${shot.screenshotName}-diff.png`;
                await writePNG(diffPNG, diffPath);

                let diffWebpPath;
                try {
                    diffWebpPath = await convertToWebP(diffPath);
                } catch (e) {
                    console.error('Failed to convert diff png to webp', e);
                }

                result.diff = getClientRelativePath(diffWebpPath || diffPath);
                result.diffRatio = diffRatio;

                // Remove png files
                try {
                    await Promise.all([
                        fse.unlink(actual.rawScreenshotPath),
                        fse.unlink(expected.rawScreenshotPath),
                        diffWebpPath && fse.unlink(diffPath)
                    ]);
                }
                catch (e) {}
            }
            catch(e) {
                result.diff = '';
                result.diffRatio = 1;
                console.log(e);
            }

            screenshots.push(result);
        }

        testOpt.results = screenshots;
        testOpt.status = 'finished';
        testOpt.actualLogs = actualResult.logs;
        testOpt.expectedLogs = expectedResult.logs;
        testOpt.actualErrors = actualResult.errors;
        testOpt.expectedErrors = expectedResult.errors;
        testOpt.actualVersion = actualVersion;
        testOpt.expectedVersion = expectedVersion;
        testOpt.useSVG = program.renderer === 'svg';
        testOpt.useCoarsePointer = program.useCoarsePointer;
        testOpt.theme = program.theme;
        testOpt.lastRun = Date.now();
    }
    else {
        // Only run once
        await runTestPage(browser, testOpt, expectedSource, 'local', runtimeCode, true);
    }
}

async function runTests(pendingTests) {
    const browser = await puppeteer.launch({
        headless: program.headless,
        args: [`--window-size=830,750`] // new option
    });
    // TODO Not hardcoded.
    // let runtimeCode = fs.readFileSync(path.join(__dirname, 'tmp/testRuntime.js'), 'utf-8');
    let runtimeCode = await buildRuntimeCode();
    runtimeCode = `window.__VRT_PLAYBACK_SPEED__ = ${program.speed || 1};\n${runtimeCode}`;

    process.on('exit', () => {
        browser.close();
    });

    async function eachTask(testOpt) {
        console.log(`Running test: ${testOpt.name}, renderer: ${program.renderer}, useCoarsePointer: ${program.useCoarsePointer}`);
        try {
            await runTest(browser, testOpt, runtimeCode, program.expectedSource, program.expected, program.actualSource, program.actual);
        }
        catch (e) {
            // Restore status
            testOpt.status = 'unsettled';
            console.error(e);
        }

        if (program.save) {
            process.send(testOpt);
        }
    }

    // console.log('Running threads: ', program.threads);
    // await runTasks(pendingTests, async (testOpt) => {
    //     await eachTask(testOpt);
    // }, program.threads);


    try {
        for (let testOpt of pendingTests) {
            await eachTask(testOpt);
        }
    }
    catch(e) {
        console.error(e);
    }


    await browser.close();
}

runTests(program.tests.split(',').map(testName => {
    return {
        fileUrl: fileNameFromTest(testName),
        name: testName,
        results: [],
        actualLogs: [],
        expectedLogs: [],
        actualErrors: [],
        expectedErrors: [],
        status: 'pending'
    };
}));

