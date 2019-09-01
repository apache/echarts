const handler = require('serve-handler');
const http = require('http');
const rollup = require('rollup');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const path = require('path');
const open = require('open');
const fse = require('fs-extra');
const {fork} = require('child_process');
const {port, origin} = require('./config');
const {getTestsList, prepareTestsList, saveTestsList, mergeTestsResults} = require('./store');
const {prepareEChartsVersion} = require('./util');

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

async function buildRuntimeCode() {
    const bundle = await rollup.rollup({
        input: path.join(__dirname, 'runtime/main.js'),
        plugins: [
            resolve(),
            commonjs()
        ]
    });
    const output = await bundle.generate({
        format: 'iife',
        name: 'autorun'
    });

    return output.code;
}


function startTests(testsNameList, socket) {
    console.log(testsNameList.join(','));

    return new Promise(resolve => {
        const pendingTests = getTestsList().filter(testOpt => {
            return testsNameList.includes(testOpt.name);
        });

        for (let testOpt of pendingTests) {
            // Reset all tests results
            testOpt.status = 'pending';
            testOpt.results = [];
        }

        socket.emit('update', {tests: getTestsList()});

        let childProcess = fork(path.join(__dirname, 'cli.js'), [
            pendingTests.map(testOpt => testOpt.fileUrl)
        ]);
        // Finished one test
        childProcess.on('message', testOpt => {
            mergeTestsResults([testOpt]);
            // Merge tests.
            socket.emit('update', {tests: getTestsList(), running: true});
            saveTestsList();
        });
        // Finished all
        childProcess.on('exit', () => {
            resolve();
        });
    });
}

async function start() {
    await prepareEChartsVersion('4.2.1'); // Expected version.
    await prepareEChartsVersion(); // Version to test

    let runtimeCode = await buildRuntimeCode();
    // seedrandom use crypto as external module. Set it to null to avoid not defined error.
    // TODO
    runtimeCode = 'window.crypto = null\n' + runtimeCode;
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
    });

    console.log(`Dashboard: ${origin}/test/runTest/client/index.html`);
    // open(`${origin}/test/runTest/client/index.html`);

}

start();