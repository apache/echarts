const handler = require('serve-handler');
const http = require('http');
const path = require('path');
// const open = require('open');
const {fork} = require('child_process');
const semver = require('semver');
const {port, origin} = require('./config');
const {getTestsList, updateTestsList, saveTestsList, mergeTestsResults} = require('./store');
const {prepareEChartsVersion, getActionsFullPath} = require('./util');
const fse = require('fs-extra');
const fs = require('fs');

function serve() {
    const server = http.createServer((request, response) => {
        return handler(request, response, {
            cleanUrls: false,
            // Root folder of echarts
            public: __dirname + '/../../'
        });
    });

    server.listen(port, () => {
        // console.log(`Server started. ${origin}`);
    });


    const io = require('socket.io')(server);
    return {
        io
    };
};

let testProcess;
let pendingTests;

function stopRunningTests() {
    if (testProcess) {
        testProcess.kill();
        testProcess = null;
    }
    if (pendingTests) {
        pendingTests.forEach(testOpt => {
            if (testOpt.status === 'pending') {
                testOpt.status = 'unsettled';
            }
        });
        pendingTests = null;
    }
}

function startTests(testsNameList, socket, noHeadless) {
    console.log(testsNameList.join(','));

    stopRunningTests();

    return new Promise(resolve => {
        pendingTests = getTestsList().filter(testOpt => {
            return testsNameList.includes(testOpt.name);
        });
        pendingTests.forEach(testOpt => {
            // Reset all tests results
            testOpt.status = 'pending';
            testOpt.results = [];
        });

        socket.emit('update', {tests: getTestsList()});

        testProcess = fork(path.join(__dirname, 'cli.js'), [
            '--tests',
            pendingTests.map(testOpt => testOpt.fileUrl).join(','),
            ...(noHeadless ? ['--no-headless'] : [])
        ]);
        // Finished one test
        testProcess.on('message', testOpt => {
            mergeTestsResults([testOpt]);
            // Merge tests.
            socket.emit('update', {tests: getTestsList(), running: true});
            saveTestsList();
        });
        // Finished all
        testProcess.on('exit', () => {
            resolve();
        });
    });
}

function checkPuppeteer() {
    try {
        const packageConfig = require('puppeteer/package.json');
        return semver.satisfies(packageConfig.version, '>=1.19.0');
    }
    catch (e) {
        return false;
    }
}

async function start() {
    if (!checkPuppeteer()) {
        // TODO Check version.
        console.error(`Can't find puppeteer >= 1.19.0, use 'npm install puppeteer' to install or update`);
        return;
    }

    await prepareEChartsVersion('4.2.1'); // Expected version.
    await prepareEChartsVersion(); // Version to test

    // let runtimeCode = await buildRuntimeCode();
    // fse.outputFileSync(path.join(__dirname, 'tmp/testRuntime.js'), runtimeCode, 'utf-8');

    // Start a static server for puppeteer open the html test cases.
    let {io} = serve();

    io.of('/client').on('connect', async socket => {
        await updateTestsList();

        socket.emit('update', {tests: getTestsList()});

        socket.on('run', async data => {
            // TODO Should broadcast to all sockets.
            try {
                console.log(data);
                await startTests(data.tests, socket, data.noHeadless);
            }
            catch (e) {
                console.error(e);
            }
            socket.emit('finish');
        });
        socket.on('stop', () => {
            stopRunningTests();
        });
    });

    io.of('/recorder').on('connect', async socket => {
        // await updateTestsList();
        socket.on('save', data => {
            if (data.testName) {
                fse.outputFile(
                    getActionsFullPath(data.testName),
                    JSON.stringify(data.actions, null, 2),
                    'utf-8'
                );
            }
            // TODO Broadcast the change?
        });
        socket.on('changeTest', data => {
            try {
                const actionData = fs.readFileSync(getActionsFullPath(data.testName), 'utf-8');
                socket.emit('update', {
                    testName: data.testName,
                    actions: JSON.parse(actionData)
                });
            }
            catch(e) {
                // Can't find file.
            }
        });
    });

    console.log(`Dashboard: ${origin}/test/runTest/client/index.html`);
    // open(`${origin}/test/runTest/client/index.html`);

}

start();