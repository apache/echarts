#!/usr/bin/env node

let fsExtra = require('fs-extra');
let {resolve} = require('path');
let config = require('./config.js');
let commander = require('commander');
let {build, watch} = require('./helper');

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
        .description('Build echarts and generate result files in directory `echarts/dist`.')
        .option(
            '-w, --watch',
            'Watch modifications of files and auto-compile to dist file (e.g., `echarts/dist/echarts.js`).'
        )
        .option(
            '--lang <language shortcut>',
            'Only generate a dist file with specified language in directory `echarts/dist`. '
                + 'A langXX.js file is required in directory `echarts`. '
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

// Based on echarts dir/
function getPath(relativePath) {
    return resolve(__dirname, '../', relativePath);
}

run();
