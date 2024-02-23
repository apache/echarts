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

const chalk = require('chalk');

process.on('uncaughtException', (err) => {
    if (err.message.includes('Cannot find module')) {
        console.error(chalk.red(err.message.split('\n')[0]));
        console.log();
        console.error(`Please run \`${chalk.yellow('npm install')}\` in \`${chalk.green('test/runTest')}\` folder first!`);
        console.log();
    }
    process.exit(1);
});

const handler = require('serve-handler');
const http = require('http');
const path = require('path');
const {fork} = require('child_process');
const semver = require('semver');
const {port, origin} = require('./config');
const {
    getTestsList,
    updateTestsList,
    saveTestsList,
    mergeTestsResults,
    updateActionsMeta,
    getResultBaseDir,
    getRunHash,
    getAllTestsRuns,
    delTestsRun,
    RESULTS_ROOT_DIR,
    checkStoreVersion
} = require('./store');
const {prepareEChartsLib, getActionsFullPath, fetchVersions} = require('./util');
const fse = require('fs-extra');
const fs = require('fs');
const open = require('open');
const genReport = require('./genReport');

const CLI_FIXED_THREADS_COUNT = 1;

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

function isRunning() {
    return runningThreads.length > 0;
}

function stopRunningTests() {
    if (isRunning()) {
        runningThreads.forEach(thread => thread.kill());
        runningThreads = [];
    }

    if (pendingTests) {
        pendingTests.forEach(testOpt => {
            if (testOpt.status === 'pending') {
                testOpt.status = 'unsettled';
            }
        });
        saveTestsList();
        pendingTests = null;
    }
}

class Thread {
    constructor() {
        this.tests = [];

        this.onExit;
        this.onUpdate;
    }

    fork(extraArgs) {
        let p = fork(path.join(__dirname, 'cli.js'), [
            '--tests', this.tests.map(testOpt => testOpt.name).join(','),
            ...extraArgs
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

function startTests(testsNameList, socket, {
    noHeadless,
    threadsCount,
    replaySpeed,
    actualVersion,
    expectedVersion,
    renderer,
    useCoarsePointer,
    noSave
}) {
    console.log('Received: ', testsNameList.join(','));

    return new Promise(resolve => {
        pendingTests = getTestsList().filter(testOpt => {
            return testsNameList.includes(testOpt.name);
        });

        if (!noSave) {
            pendingTests.forEach(testOpt => {
                // Reset all tests results
                testOpt.status = 'pending';
                testOpt.results = [];
            });
            // Save status immediately
            saveTestsList();

            socket.emit('update', {
                tests: getTestsList(),
                running: true
            });
        }

        threadsCount = Math.min(
            Math.ceil((threadsCount || 1) / CLI_FIXED_THREADS_COUNT),
            pendingTests.length
        );
        let runningCount = threadsCount;
        function onExit() {
            runningCount--;
            if (runningCount === 0) {
                runningThreads = [];
                resolve();
            }
        }
        function onUpdate() {
            // Merge tests.
            if (isRunning() && !noSave) {
                socket.emit('update', {
                    tests: getTestsList(),
                    running: true
                });
            }
        }

        // Assigning tests to threads
        runningThreads = new Array(threadsCount).fill(0).map(() => new Thread() );
        for (let i = 0; i < pendingTests.length; i++) {
            runningThreads[i % threadsCount].tests.push(pendingTests[i]);
        }
        for (let i = 0; i < runningThreads.length; i++) {
            runningThreads[i].onExit = onExit;
            runningThreads[i].onUpdate = onUpdate;
            runningThreads[i].fork([
                '--speed', replaySpeed || 5,
                '--actual', actualVersion,
                '--expected', expectedVersion,
                '--renderer', renderer || '',
                '--use-coarse-pointer', useCoarsePointer,
                '--threads', Math.min(threadsCount, CLI_FIXED_THREADS_COUNT),
                '--dir', getResultBaseDir(),
                ...(noHeadless ? ['--no-headless'] : []),
                ...(noSave ? ['--no-save'] : [])
            ]);
        }
    });
}

function checkPuppeteer() {
    try {
        const packageConfig = require('puppeteer/package.json');
        console.log(`puppeteer version: ${packageConfig.version}`);
        return semver.satisfies(packageConfig.version, '>=9.0.0');
    }
    catch (e) {
        return false;
    }
}


async function start() {
    if (!checkPuppeteer()) {
        // TODO Check version.
        console.error(`Can't find puppeteer >= 9.0.0, run 'npm install' to update in the 'test/runTest' folder`);
        return;
    }


    let _currentTestHash;
    let _currentRunConfig;

    // let runtimeCode = await buildRuntimeCode();
    // fse.outputFileSync(path.join(__dirname, 'tmp/testRuntime.js'), runtimeCode, 'utf-8');

    // Start a static server for puppeteer open the html test cases.
    let {io} = serve();

    const stableVersions = await fetchVersions(false);
    const nightlyVersions = (await fetchVersions(true)).slice(0, 100);
    stableVersions.unshift('local');
    nightlyVersions.unshift('local');

    io.of('/client').on('connect', async socket => {

        let isAborted = false;
        function abortTests() {
            if (!isRunning()) {
                return;
            }
            isAborted = true;
            stopRunningTests();
            io.of('/client').emit('abort');
        }

        socket.on('syncRunConfig', async ({
            runConfig,
            forceSet
        }) => {
            // First time open.
            if ((!_currentRunConfig || forceSet) && runConfig) {
                _currentRunConfig = runConfig;
            }

            if (!_currentRunConfig) {
                return;
            }

            const expectedVersionsList = _currentRunConfig.isExpectedNightly ? nightlyVersions : stableVersions;
            const actualVersionsList = _currentRunConfig.isActualNightly ? nightlyVersions : stableVersions;
            if (!expectedVersionsList.includes(_currentRunConfig.expectedVersion)) {
                // Pick first version not local
                _currentRunConfig.expectedVersion = expectedVersionsList[1];
            }
            if (!actualVersionsList.includes(_currentRunConfig.actualVersion)) {
                _currentRunConfig.actualVersion = 'local';
            }

            socket.emit('syncRunConfig_return', {
                runConfig: _currentRunConfig,
                expectedVersionsList,
                actualVersionsList
            });

            if (_currentTestHash !== getRunHash(_currentRunConfig)) {
                abortTests();
            }
            await updateTestsList(
                _currentTestHash = getRunHash(_currentRunConfig),
                !isRunning() // Set to unsettled if not running
            );

            socket.emit('update', {
                tests: getTestsList(),
                running: isRunning()
            });
        });

        socket.on('getAllTestsRuns', async () => {
            socket.emit('getAllTestsRuns_return', {
                runs: await getAllTestsRuns()
            });
        });

        socket.on('genTestsRunReport', async (params) => {
            const absPath = await genReport(
                path.join(RESULTS_ROOT_DIR, getRunHash(params))
            );
            const relativeUrl = path.join('../', path.relative(__dirname, absPath));
            socket.emit('genTestsRunReport_return', {
                reportUrl: relativeUrl
            });
        });

        socket.on('delTestsRun', async (params) => {
            delTestsRun(params.id);
            console.log('Deleted', params.id);
        });

        socket.on('run', async data => {
            stopRunningTests();
            isAborted = false;

            let startTime = Date.now();

            await prepareEChartsLib(data.expectedVersion); // Expected version.
            await prepareEChartsLib(data.actualVersion); // Version to test

            // If aborted in the time downloading lib.
            if (isAborted) {
                return;
            }

            // TODO Should broadcast to all sockets.
            try {
                if (!checkStoreVersion(data)) {
                    throw new Error('Unmatched store version and run version.');
                }

                await startTests(
                    data.tests,
                    io.of('/client'),
                    {
                        noHeadless: data.noHeadless,
                        threadsCount: data.threads,
                        replaySpeed: data.replaySpeed,
                        actualVersion: data.actualVersion,
                        expectedVersion: data.expectedVersion,
                        renderer: data.renderer,
                        useCoarsePointer: data.useCoarsePointer,
                        noSave: false
                    }
                );
            }
            catch (e) {
                console.error(e);
            }

            if (!isAborted) {
                const deltaTime = Date.now() - startTime;
                console.log('Finished in ', Math.round(deltaTime / 1000) + ' second');
                io.of('/client').emit('finish', {
                    time: deltaTime,
                    count: data.tests.length,
                    threads: data.threads
                });
            }
            else {
                console.log('Aborted!');
            }
        });

        socket.on('stop', abortTests);
    });

    io.of('/recorder').on('connect', async socket => {
        socket.on('saveActions', data => {
            if (data.testName) {
                fse.outputFile(
                    getActionsFullPath(data.testName),
                    JSON.stringify(data.actions),
                    'utf-8'
                );
                updateActionsMeta(data.testName, data.actions);
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
            stopRunningTests();

            try {
                await startTests([data.testName], socket, {
                    noHeadless: true,
                    threadsCount: 1,
                    replaySpeed: 2,
                    actualVersion: data.actualVersion,
                    expectedVersion: data.expectedVersion,
                    renderer: data.renderer || '',
                    useCoarsePointer: data.useCoarsePointer,
                    noSave: true
                });
            }
            catch (e) { console.error(e); }
            console.log('Finished');
            socket.emit('finish');
        });

        socket.emit('getTests', {
            // TODO updateTestsList.
            tests: getTestsList().map(test => {
                return {
                    name: test.name,
                    actions: test.actions
                };
            })
        });
    });

    console.log(`Dashboard: ${origin}/test/runTest/client/index.html`);
    console.log(`Interaction Recorder: ${origin}/test/runTest/recorder/index.html`);
    open(`${origin}/test/runTest/client/index.html`);

}

start();
