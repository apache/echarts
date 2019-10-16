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

const handler = require('serve-handler');
const http = require('http');
const path = require('path');
// const open = require('open');
const {fork} = require('child_process');
const semver = require('semver');
const {port, origin} = require('./config');
const {getTestsList, updateTestsList, saveTestsList, mergeTestsResults, updateActionsMeta} = require('./store');
const {prepareEChartsLib, getActionsFullPath, fetchVersions} = require('./util');
const fse = require('fs-extra');
const fs = require('fs');
const open = require('open');

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
let aborted = false;

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

    fork(extraArgs) {
        let p = fork(path.join(__dirname, 'cli.js'), [
            '--tests',
            this.tests.map(testOpt => testOpt.name).join(','),
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
    noSave
}) {
    console.log('Received: ', testsNameList.join(','));

    threadsCount = threadsCount || 1;
    stopRunningTests();

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

            if (!aborted) {
                socket.emit('update', {tests: getTestsList(), running: true});
            }
        }
        let runningCount = 0;
        function onExit() {
            runningCount--;
            if (runningCount === 0) {
                runningThreads = [];
                resolve();
            }
        }
        function onUpdate() {
            // Merge tests.
            if (!aborted && !noSave) {
                socket.emit('update', {tests: getTestsList(), running: true});
            }
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
            runningThreads[i].fork([
                '--speed', replaySpeed || 5,
                '--actual', actualVersion,
                '--expected', expectedVersion,
                '--renderer', renderer,
                ...(noHeadless ? ['--no-headless'] : []),
                ...(noSave ? ['--no-save'] : [])
            ]);
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
        console.error(`Can't find puppeteer >= 1.19.0, use 'npm install puppeteer --no-save' to install or update`);
        return;
    }

    let [versions] = await Promise.all([
        fetchVersions(),
        updateTestsList(true)
    ]);

    // let runtimeCode = await buildRuntimeCode();
    // fse.outputFileSync(path.join(__dirname, 'tmp/testRuntime.js'), runtimeCode, 'utf-8');

    // Start a static server for puppeteer open the html test cases.
    let {io} = serve();

    io.of('/client').on('connect', async socket => {
        await updateTestsList();

        socket.emit('update', {
            tests: getTestsList(),
            running: runningThreads.length > 0
        });

        socket.on('run', async data => {

            let startTime = Date.now();
            aborted = false;

            await prepareEChartsLib(data.expectedVersion); // Expected version.
            await prepareEChartsLib(data.actualVersion); // Version to test

            if (aborted) {  // If it is aborted when downloading echarts lib.
                return;
            }

            // TODO Should broadcast to all sockets.
            try {
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
                        noSave: false
                    }
                );
            }
            catch (e) {
                console.error(e);
            }

            if (!aborted) {
                console.log('Finished');
                io.of('/client').emit('finish', {
                    time: Date.now() - startTime,
                    count: data.tests.length,
                    threads: data.threads
                });
            }
            else {
                console.log('Aborted!');
            }
        });
        socket.on('stop', () => {
            stopRunningTests();
            io.of('/client').emit('abort');
            aborted = true;
        });

        socket.emit('versions', versions);
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
            try {
                await startTests([data.testName], socket, {
                    noHeadless: true,
                    threadsCount: 1,
                    replaySpeed: 2,
                    actualVersion: data.actualVersion,
                    expectedVersion: data.expectedVersion,
                    renderer: data.renderer,
                    noSave: true
                });
            }
            catch (e) { console.error(e); }
            console.log('Finished');
            socket.emit('finish');
        });

        socket.emit('getTests', {
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