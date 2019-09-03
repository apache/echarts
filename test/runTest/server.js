const handler = require('serve-handler');
const http = require('http');
const path = require('path');
const open = require('open');
const fse = require('fs-extra');
const {fork} = require('child_process');
const {port, origin} = require('./config');
const {getTestsList, prepareTestsList, saveTestsList, mergeTestsResults} = require('./store');
const {prepareEChartsVersion, buildRuntimeCode} = require('./util');

function serve() {
    const server = http.createServer((request, response) => {
        return handler(request, response, {
            cleanUrls: false,
            // Root folder of echarts
            public: __dirname + '/../../'
        });
    });

    server.listen(port, () => {
        console.log(`Server started. ${origin}`);
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

function startTests(testsNameList, socket) {
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
            pendingTests.map(testOpt => testOpt.fileUrl)
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
        return require('puppeteer');
    }
    catch (e) {
        return null;
    }
}

async function start() {
    if (!checkPuppeteer()) {
        // TODO Check version.
        console.error(`Can't find puppeteer, use 'npm install puppeteer' to install`);
        return;
    }

    await prepareEChartsVersion('4.2.1'); // Expected version.
    await prepareEChartsVersion(); // Version to test

    let runtimeCode = await buildRuntimeCode();
    fse.outputFileSync(path.join(__dirname, 'tmp/testRuntime.js'), runtimeCode, 'utf-8');

    // Start a static server for puppeteer open the html test cases.
    let {io} = serve();

    io.on('connect', async socket => {
        await prepareTestsList();

        socket.emit('update', {tests: getTestsList()});
        // TODO Stop previous?
        socket.on('run', async testsNameList => {
            await startTests(testsNameList, socket);
            socket.emit('finish');
        });
        socket.on('stop', () => {
            stopRunningTests();
        });
    });

    console.log(`Dashboard: ${origin}/test/runTest/client/index.html`);
    // open(`${origin}/test/runTest/client/index.html`);

}

start();