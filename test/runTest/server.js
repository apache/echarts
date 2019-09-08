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

let runningThreads = [];
let pendingTests;

function stopRunningTests() {
    if (runningThreads) {
        runningThreads.forEach(thread => thread.kill());
        runningThreads = [];
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

class Thread {
    constructor() {
        this.tests = [];

        this.onExit;
        this.onUpdate;
    }

    fork(noHeadless) {
        let p = fork(path.join(__dirname, 'cli.js'), [
            '--tests',
            this.tests.map(testOpt => testOpt.name).join(','),
            '--speed',
            5,
            ...(noHeadless ? ['--no-headless'] : [])
        ]);
        this.p = p;

        // Finished one test
        p.on('message', testOpt => {
            mergeTestsResults([testOpt]);
            saveTestsList();
            this.onUpdate();
        });
        // Finished all
        p.on('exit', () => {
            this.p = null;
            setTimeout(this.onExit);
        });
    }

    kill() {
        if (this.p) {
            this.p.kill();
        }
    }
}

function startTests(testsNameList, socket, {noHeadless, threadsCount}) {
    console.log(testsNameList.join(','));

    threadsCount = threadsCount || 1;
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

        let runningCount = 0;
        function onExit() {
            runningCount--;
            if (runningCount === 0) {
                resolve();
            }
        }
        function onUpdate() {
            // Merge tests.
            socket.emit('update', {tests: getTestsList(), running: true});
        }

        threadsCount = Math.min(threadsCount, pendingTests.length);
        // Assigning tests to threads
        runningThreads = new Array(threadsCount).fill(0).map(a => new Thread() );
        for (let i = 0; i < pendingTests.length; i++) {
            runningThreads[i % threadsCount].tests.push(pendingTests[i]);
        }
        for (let i = 0; i < threadsCount; i++) {
            runningThreads[i].onExit = onExit;
            runningThreads[i].onUpdate = onUpdate;
            runningThreads[i].fork(noHeadless, onExit);
            runningCount++;
        }
        // If something bad happens and no proccess are started successfully
        if (runningCount === 0) {
            resolve();
        }
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
            let startTime = Date.now();
            // TODO Should broadcast to all sockets.
            try {
                await startTests(
                    data.tests,
                    socket,
                    { noHeadless: data.noHeadless, threadsCount: data.threads }
                );
            }
            catch (e) { console.error(e); }
            console.log('Finished');
            socket.emit('finish', {
                time: Date.now() - startTime,
                count: data.tests.length,
                threads: data.threads
            });
        });
        socket.on('stop', () => {
            stopRunningTests();
        });
    });

    io.of('/recorder').on('connect', async socket => {
        await updateTestsList();
        socket.on('saveActions', data => {
            if (data.testName) {
                fse.outputFile(
                    getActionsFullPath(data.testName),
                    JSON.stringify(data.actions),
                    'utf-8'
                );
            }
            // TODO Broadcast the change?
        });
        socket.on('changeTest', data => {
            try {
                const actionData = fs.readFileSync(getActionsFullPath(data.testName), 'utf-8');
                socket.emit('updateActions', {
                    testName: data.testName,
                    actions: JSON.parse(actionData)
                });
            }
            catch(e) {
                // Can't find file.
            }
        });
        socket.on('runSingle', async data => {
            try {
                await startTests([data.testName], socket, true);
            }
            catch (e) { console.error(e); }
            console.log('Finished');
            socket.emit('finish');
        });

        socket.emit('getTests', {tests: getTestsList().map(test => test.name)});
    });

    console.log(`Dashboard: ${origin}/test/runTest/client/index.html`);
    // open(`${origin}/test/runTest/client/index.html`);

}

start();