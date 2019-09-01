const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fse = require('fs-extra');
const fs = require('fs');
const path = require('path');
const compareScreenshot = require('./compareScreenshot');
const {getTestName, getVersionDir} = require('./util');
const {origin} = require('./config');

function getScreenshotDir() {
    return 'tmp/__screenshot__';
}

function sortScreenshots(list) {
    return list.sort((a, b) => {
        return a.testName.localeCompare(b.testName);
    });
}

function getClientRelativePath(absPath) {
    return path.join('../', path.relative(__dirname, absPath));
}

function replaceEChartsVersion(interceptedRequest, version) {
    // TODO Extensions and maps
    if (interceptedRequest.url().endsWith('dist/echarts.js')) {
        interceptedRequest.continue({
            url: `${origin}/test/runTest/${getVersionDir(version)}/echarts.js`
        });
    }
    else {
        interceptedRequest.continue();
    }
}

function waitPageForFinish(page) {
    return new Promise(resolve => {
        page.exposeFunction('puppeteerFinishTest', () => {
            resolve();
        });
    });
}

function createWaitTimeout(maxTime) {
    let timeoutHandle;
    let resolve;
    function keepWait(newMaxTime) {
        newMaxTime = newMaxTime == null ? maxTime : newMaxTime;
        clearTimeout(timeoutHandle);
        createTimeout(newMaxTime);
    }

    function createTimeout(maxTime) {
        timeoutHandle = setTimeout(() => {
            resolve();
        }, maxTime);
    }

    function waitTimeout() {
        return new Promise(_resolve => {
            resolve = _resolve;
            createTimeout(maxTime);
        });
    }

    return {keepWait, waitTimeout}
}

async function takeScreenshot(page, elementQuery, fileUrl, desc, version) {
    let target = elementQuery ? await page.$(elementQuery) : page;
    if (!target) {
        console.error(`Can't find element '${elementQuery}'`);
        return;
    }
    let fullPage = !elementQuery;
    let testName = getTestName(fileUrl);
    if (desc) {
        testName += '-' + slugify(desc, { replacement: '-', lower: true })
    }
    let screenshotPrefix = version ? 'expected' : 'actual';
    fse.ensureDirSync(path.join(__dirname, getScreenshotDir()));
    let screenshotPath = path.join(__dirname, `${getScreenshotDir()}/${testName}-${screenshotPrefix}.png`);
    await target.screenshot({
        path: screenshotPath,
        fullPage
    });

    return {testName, screenshotPath};
}

async function runTestPage(browser, fileUrl, version, runtimeCode) {
    const {keepWait, waitTimeout} = createWaitTimeout(1500);
    const screenshots = [];
    const logs = [];
    const errors = [];
    let screenshotPromises = [];

    const page = await browser.newPage();
    page.setRequestInterception(true);
    page.on('request', replaceEChartsVersion);
    await page.evaluateOnNewDocument(runtimeCode);

    let descAutoCounter = 0;

    page.exposeFunction('puppeteerScreenshot', (desc, elementQuery) => {
        keepWait();
        desc = desc || (descAutoCounter++).toString();
        let promise = takeScreenshot(page, elementQuery, fileUrl, desc, version).then((result) => {
            if (!result) {
                return;
            }
            const {testName, screenshotPath} = result;
            screenshots.push({testName, desc, screenshotPath});
        });
        screenshotPromises.push(promise);

        return promise;
    });
    page.on('console', msg => {
        logs.push(msg.text());
    });
    page.on('pageerror', error => {
        errors.push(error);
    });

    let pageFinishPromise = waitPageForFinish(page);

    try {
        await page.goto(`${origin}/test/${fileUrl}`, {
            waitUntil: 'networkidle2',
            // waitUntil: 'domcontentloaded',
            timeout: 10000
        });
    }
    catch(e) {
        // TODO Timeout Error
        console.error(e);
    }

    // TODO Animation

    // Do auto screenshot after 100ms for animation.
    // let autoSnapshotTimeout = setTimeout(async () => {
    //     let desc = `Animation Interval`;
    //     let promise = takeScreenshot(page, '', fileUrl, desc, version)
    //         .then(({testName, screenshotPath}) => {
    //             screenshots.push({testName, desc, screenshotPath});
    //         });
    //     screenshotPromises.push(promise);
    // }, 100);


    // Wait for puppeteerFinishTest() is called
    // Or compare the whole page if nothing happened after 10 seconds.
    await Promise.race([
        pageFinishPromise,
        waitTimeout().then(() => {
            // console.warn('Test timeout after 3 seconds.');
            // Final shot.
            let desc = 'Final Shot';
            return takeScreenshot(page, '', fileUrl, desc, version)
                .then(({testName, screenshotPath}) => {
                    screenshots.push({testName, desc, screenshotPath});
                });
        })
    ]);

    // clearTimeout(autoSnapshotTimeout);

    // Wait for screenshot finished.
    await Promise.all(screenshotPromises);

    await page.close();

    return {
        logs,
        errors,
        screenshots: screenshots
    };
}

async function runTest(browser, testOpt, runtimeCode) {
    testOpt.status === 'running';
    const fileUrl = testOpt.fileUrl;
    const expectedResult = await runTestPage(browser, fileUrl, '4.2.1', runtimeCode);
    const actualResult = await runTestPage(browser, fileUrl, '', runtimeCode);

    sortScreenshots(expectedResult.screenshots);
    sortScreenshots(actualResult.screenshots);

    const screenshots = [];
    let idx = 0;
    for (let shot of expectedResult.screenshots) {
        let expected = shot;
        let actual = actualResult.screenshots[idx++];
        let {diffRatio, diffPNG} = await compareScreenshot(
            expected.screenshotPath,
            actual.screenshotPath
        );

        let diffPath = `${path.resolve(__dirname, getScreenshotDir())}/${shot.testName}-diff.png`;
        diffPNG.pack().pipe(fs.createWriteStream(diffPath));

        screenshots.push({
            actual: getClientRelativePath(actual.screenshotPath),
            expected: getClientRelativePath(expected.screenshotPath),
            diff: getClientRelativePath(diffPath),
            name: actual.testName,
            desc: actual.desc,
            diffRatio
        });
    }

    testOpt.results = screenshots;
    testOpt.status = 'finished';
    testOpt.actualLogs = actualResult.logs;
    testOpt.expectedLogs = expectedResult.logs;
    testOpt.actualErrors = actualResult.errors;
    testOpt.expectedErrors = expectedResult.errors;

}

async function runTests(pendingTests) {
    const browser = await puppeteer.launch({ headless: true });
    // TODO Not hardcoded.
    let runtimeCode = fs.readFileSync(path.join(__dirname, 'tmp/testRuntime.js'), 'utf-8');

    try {
        for (let testOpt of pendingTests) {
            console.log('Running Test', testOpt.name);
            try {
                await runTest(browser, testOpt, runtimeCode);
            }
            catch (e) {
                // Restore status
                testOpt.status = 'pending';
                console.log(e);
            }

            process.send(testOpt);
        }
    }
    catch(e) {
        console.log(e);
    }
}

// Handling input arguments.
const testsFileUrlList = process.argv[2] || '';
runTests(testsFileUrlList.split(',').map(fileUrl => {
    return {
        fileUrl,
        name: getTestName(fileUrl),
        results: [],
        status: 'pending'
    };
}));