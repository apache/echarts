#!/usr/bin/env node

let fsExtra = require('fs-extra');
let {resolve} = require('path');
let rollup = require('rollup');
let config = require('./config.js');
let commander = require('commander');
let color = require('./colorConsole');

function run() {

    /**
     * Tips for `commander`:
     * (1) If arg xxx not specified, `commander.xxx` is undefined.
     *     Otherwise:
     *      If '-x, --xxx', `commander.xxx` can only be true/false, even if '--xxx yyy' input.
     *      If '-x, --xxx <some>', the 'some' string is required, or otherwise error will be thrown.
     *      If '-x, --xxx [some]', the 'some' string is optional, that is, `commander.xxx` can be boolean or string.
     * (2) `node ./build/build.js --help` will print helper info and exit.
     */

    commander
        .usage('[options]')
        .description('Build echarts and generate result files in `echarts/dist` folder')
        .option(
            '-w, --watch',
            'Watch modifications of files and auto-compile to dist file (e.g., `echarts/dist/echarts.js`).'
        )
        .option(
            '--lang <language shortcut>',
            'Only generate a dist file with specified language in the `echarts/dist` folder. '
                + 'A langXX.js file is required in the `echarts` folder. '
                + 'e.g., `--lang en`, where a file `langEN.js` is required.'
        )
        .option(
            '--min',
            'Whether to compress the output file.'
        )
        .option(
            '--type <type name>',
            'Can be "simple" or "common" or "" (default). '
                + 'e.g., `--type ""` or `--type "common"`.'
        )
        .parse(process.argv);

    let opt = {};
    let isWatch = !!commander.watch;
    opt.lang = commander.lang || null;
    opt.min = !!commander.min;
    opt.type = commander.type || '';
    let buildAll = commander.watch == null
        && commander.lang == null
        && commander.min == null
        && commander.type == null;

    // Clear `echarts/dist`
    if (buildAll) {
        fsExtra.removeSync(getPath('./dist'));
    }

    let configs = [];

    if (isWatch) {
        watch(config.createEChartsBuild(opt));
    }
    else {
        if (!buildAll) {
            configs = [config.createEChartsBuild(opt)];
        }
        else {
            configs = [];

            [
                {min: false},
                {min: true},
                {min: false, lang: 'en'},
                {min: true, lang: 'en'}
            ].forEach(function (opt) {
                ['', 'simple', 'common'].forEach(function (type) {
                    configs.push(config.createEChartsBuild(Object.assign({type}, opt)));
                });
            });

            configs.push(
                config.createBMapBuild(false),
                config.createBMapBuild(true),
                config.createDataToolBuild(false),
                config.createDataToolBuild(true)
            );
        }

        build(configs);

        // npm run prepublish: `rm -r lib; cp -r src lib`
        fsExtra.removeSync(getPath('./lib'));
        fsExtra.copySync(getPath('./src'), getPath('./lib'));
    }
}


function build(configs) {
    let index = 0;

    buildSingle();

    function buildSingle() {
        let singleConfig = configs[index++];

        if (!singleConfig) {
            return;
        }

        console.log(
            color('fgCyan', 'dim')('\nBundles '),
            color('fgCyan')(singleConfig.input),
            color('fgCyan', 'dim')('=>'),
            color('fgCyan')(singleConfig.output.file),
            color('fgCyan', 'dim')(' ...')
        );

        rollup
            .rollup(singleConfig)
            .then(function (bundle) {
                return bundle.write(singleConfig.output);
            })
            .then(function () {
                console.log(
                    color('fgGreen', 'dim')('Created '),
                    color('fgGreen')(singleConfig.output.file),
                    color('fgGreen', 'dim')(' successfully.')
                );
                buildSingle();
            })
            .catch(function (err) {
                console.log(color('fgRed')(err));
            });
    }
}

function watch(singleConfig) {
    var watcher = rollup.watch(singleConfig);
    // rollup.watch(singleConfig);

    watcher.on('event', function (event) {
        // event.code can be one of:
        //   START        — the watcher is (re)starting
        //   BUNDLE_START — building an individual bundle
        //   BUNDLE_END   — finished building a bundle
        //   END          — finished building all bundles
        //   ERROR        — encountered an error while bundling
        //   FATAL        — encountered an unrecoverable error
        if (event.code !== 'START' && event.code !== 'END') {
            console.log(
                color('fgBlue')('[' + getTimeString() + ']'),
                color('dim')('build'),
                event.code.replace(/_/g, ' ').toLowerCase()
            );
        }
        if (event.code === 'ERROR' || event.code === 'FATAL') {
            printCodeError(event.error);
        }
        if (event.code === 'BUNDLE_END') {
            printWatchResult(event);
        }
    });
}

function printWatchResult(event) {
    console.log(
        color('fgGreen', 'dim')('Created'),
        color('fgGreen')(event.output.join(', ')),
        color('fgGreen', 'dim')('in'),
        color('fgGreen')(event.duration),
        color('fgGreen', 'dim')('ms.')
    );
}

function printCodeError(error) {
    console.log('\n' + color()(error.code));
    if (error.code === 'PARSE_ERROR') {
        console.log(
            color()('line'),
            color('fgCyan')(error.loc.line),
            color()('column'),
            color('fgCyan')(error.loc.column),
            color()('in'),
            color('fgCyan')(error.loc.file)
        );
    }
    if (error.frame) {
        console.log('\n' + color('fgRed')(error.frame));
    }
    console.log(color('dim')('\n' + error.stack));
}

function getTimeString() {
    return (new Date()).toLocaleString();
}

// Based on echarts/
function getPath(relativePath) {
    return resolve(__dirname, '../', relativePath);
}

run();
