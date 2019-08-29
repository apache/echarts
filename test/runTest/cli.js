const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fse = require('fs-extra');
const fs = require('fs');
const https = require('https');
const path = require('path');
const open = require('open');
const util = require('util');
const glob = require('glob');
const {serve, origin} = require('./serve');
const compareScreenshot = require('./compareScreenshot');
const blacklist = require('./blacklist');

const seedrandomCode = fs.readFileSync(
    path.join(__dirname, '../../node_modules/seedrandom/seedrandom.js'),
    'utf-8'
);
const runtimeCode = fs.readFileSync(path.join(__dirname, './runtime.js'), 'utf-8');

function getVersionDir(version) {
    version = version || 'developing';
    return `tmp/__version__/${version}`;
}

function getScreenshotDir() {
    return 'tmp/__screenshot__';
}

function getTestName(fileUrl) {
    return path.basename(fileUrl, '.html');
}

function getCacheFilePath() {
    return path.join(__dirname, 'tmp/__cache__.json');
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

function prepareEChartsVersion(version) {
    let versionFolder = path.join(__dirname, getVersionDir(version));
    fse.ensureDirSync(versionFolder);
    if (!version) {
        // Developing version, make sure it's new build
        return fse.copy(
            path.join(__dirname, '../../dist/echarts.js'),
            `${versionFolder}/echarts.js`
        );
    }
    return new Promise(resolve => {
        if (!fs.existsSync(`${versionFolder}/echarts.js`)) {
            const file = fs.createWriteStream(`${versionFolder}/echarts.js`);

            console.log('Downloading echarts4.2.1 from ', `https://cdn.jsdelivr.net/npm/echarts@${version}/dist/echarts.js`);
            https.get(`https://cdn.jsdelivr.net/npm/echarts@${version}/dist/echarts.js`, response => {
                response.pipe(file);

                file.on('finish', () => {
                    resolve();
                })
            });
        }
        else {
            resolve();
        }
    });
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
    let screenshotPath = path.join(__dirname, `${getScreenshotDir()}/${testName}-${screenshotPrefix}.png`);
    await target.screenshot({
        path: screenshotPath,
        fullPage
    });

    return {testName, screenshotPath};
}

async function runTestPage(browser, fileUrl, version) {
    const {keepWait, waitTimeout} = createWaitTimeout(3200);
    const testResults = [];
    let screenshotPromises = [];

    const page = await browser.newPage();
    page.setRequestInterception(true);
    page.on('request', replaceEChartsVersion);
    await page.evaluateOnNewDocument(seedrandomCode);
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
            testResults.push({testName, desc, screenshotPath});
        });
        screenshotPromises.push(promise);

        return promise;
    });
    // page.on('console', msg => {
    //     console.log(msg.text());
    // });
    // page.on('pageerror', error => {
    //     console.error(error);
    // })

    let pageFinishPromise = waitPageForFinish(page);

    try {
        await page.goto(`${origin}/test/${fileUrl}`, {
            waitUntil: 'networkidle2',
            timeout: 10000
        });
    }
    catch(e) {
        // TODO Timeout Error
        console.error(e);
    }

    // Do auto screenshot for every 1 second.
    let count = 1;
    let autoSnapshotInterval = setInterval(async () => {
        let desc = `autogen-${count++}`;
        let promise = takeScreenshot(page, '', fileUrl, desc, version)
            .then(({testName, screenshotPath}) => {
                testResults.push({testName, desc, screenshotPath});
            });
        screenshotPromises.push(promise);
    }, 1000);


    // Wait for puppeteerFinishTest() is called
    // Or compare the whole page if nothing happened after 10 seconds.
    await Promise.race([
        pageFinishPromise,
        waitTimeout().then(() => {
            // console.warn('Test timeout after 3 seconds.');
        })
    ]);

    clearInterval(autoSnapshotInterval);

    // Wait for screenshot finished.
    await Promise.all(screenshotPromises);

    await page.close();

    return testResults;
}

async function runTest(browser, testOpt) {
    testOpt.status === 'running';
    const fileUrl = testOpt.fileUrl;
    const expectedShots = await runTestPage(browser, fileUrl, '4.2.1');
    const actualShots = await runTestPage(browser, fileUrl);

    sortScreenshots(expectedShots);
    sortScreenshots(actualShots);

    const results = [];
    let idx = 0;
    for (let shot of expectedShots) {
        let expected = shot;
        let actual = actualShots[idx++];
        let {diffRatio, diffPNG} = await compareScreenshot(
            expected.screenshotPath,
            actual.screenshotPath
        );

        let diffPath = `${path.resolve(__dirname, getScreenshotDir())}/${shot.testName}-diff.png`;
        diffPNG.pack().pipe(fs.createWriteStream(diffPath));

        results.push({
            actual: getClientRelativePath(actual.screenshotPath),
            expected: getClientRelativePath(expected.screenshotPath),
            diff: getClientRelativePath(diffPath),
            name: actual.testName,
            desc: actual.desc,
            diffRatio
        });
    }

    testOpt.results = results;
    testOpt.status = 'finished';
}

function writeTestsToCache(tests) {
    fs.writeFileSync(getCacheFilePath(), JSON.stringify(tests, null, 2), 'utf-8');
}

async function getTestsList() {
    let tmpFolder = path.join(__dirname, 'tmp');
    fse.ensureDirSync(tmpFolder);
    try {
        let cachedStr = fs.readFileSync(getCacheFilePath(), 'utf-8');
        let tests = JSON.parse(cachedStr);
        return tests;
    }
    catch(e) {
        let files = await util.promisify(glob)('**.html', { cwd: path.resolve(__dirname, '../') });
        let tests = files.filter(fileUrl => {
            return blacklist.includes(fileUrl);
        }).map(fileUrl => {
            return {
                fileUrl,
                name: getTestName(fileUrl),
                status: 'pending',
                results: []
            };
        });
        return tests;
    }
}

async function start() {
    await prepareEChartsVersion('4.2.1'); // Expected version.
    await prepareEChartsVersion(); // Version to test

    fse.ensureDirSync(path.join(__dirname, getScreenshotDir()));
    // Start a static server for puppeteer open the html test cases.
    let {broadcast, io} = serve();

    const browser = await puppeteer.launch({ /* headless: false */ });

    const tests = await getTestsList();

    io.on('connect', socket => {
        socket.emit('update', {tests});
        // TODO Stop previous?
        socket.on('run', async testsNameList => {
            console.log(testsNameList.join(','));

            const pendingTests = tests.filter(testOpt => {
                return testsNameList.includes(testOpt.name);
            });

            for (let testOpt of pendingTests) {
                // Reset all tests results
                testOpt.status = 'pending';
                testOpt.results = [];
            }

            socket.emit('update', {tests});

            try {
                for (let testOpt of pendingTests) {
                    console.log('Running Test', testOpt.name);
                    await runTest(browser, testOpt);
                    socket.emit('update', {tests});
                    writeTestsToCache(tests);
                }
            }
            catch(e) {
                console.log(e);
            }

            socket.emit('finish');
        });
    });

    console.log(`Dashboard: ${origin}/test/runTest/client/index.html`);
    // open(`${origin}/test/runTest/client/index.html`);

    // runTests(browser, tests, tests);
}

start()