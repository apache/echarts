#!/usr/bin/env node

const fsExtra = require('fs-extra');
const {resolve} = require('path');
const config = require('./config.js');
const commander = require('commander');
const {build, watch} = require('./helper');

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
        .description([
            'Build echarts and generate result files in directory `echarts/dist`.',
            '',
            '  For example:',
            '',
            '    node build/build.js --release # Build all to `dist` folder.',
            '    node build/build.js --type ""  # Only generate `dist/echarts.js`.',
            '    node build/build.js --type common --min  # Only generate `dist/echarts.common.min.js`.',
            '    node build/build.js --type simple --min --lang en  # Only generate `dist/echarts-en.simple.min.js`.',
            '    node build/build.js --min --lang en -i "/my/index.js" -o "/my/ec.js"  '
                + '# Take `/my/index.js` as input and generate a bundle `/my/ec.js`, '
                + 'which is in EN language and has been minified.',
        ].join('\n'))
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
            '--release',
            'Build all for release'
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
        .option(
            '--sourcemap',
            'Whether output sourcemap.'
        )
        .option(
            '--format <format>',
            'The format of output bundle. Can be "umd", "amd", "iife", "cjs", "es".'
        )
        .option(
            '-i, --input <input file path>',
            'If input file path is specified, output file path must be specified too.'
        )
        .option(
            '-o, --output <output file path>',
            'If output file path is specified, input file path must be specified too.'
        )
        .parse(process.argv);

    let isWatch = !!commander.watch;
    let isRelease = !!commander.release;

    let opt = {
        lang: commander.lang || null,
        min: !!commander.min,
        type: commander.type || '',
        input: commander.input,
        output: commander.output,
        sourcemap: !!commander.sourcemap,
        format: commander.format || 'umd'
    };

    if ((opt.input != null && opt.output == null)
        || (opt.input == null && opt.output != null)
    ) {
        throw new Error('`input` and `output` must be both set.');
    }

    // Clear `echarts/dist`
    if (isRelease) {
        fsExtra.removeSync(getPath('./dist'));
    }

    let configs = [];

    if (isWatch) {
        watch(config.createECharts(opt));
    }
    else {
        if (isRelease) {
            configs = [];

            [
                {min: false},
                {min: true},
                {min: false, lang: 'en'},
                {min: true, lang: 'en'}
            ].forEach(function (opt) {
                ['', 'simple', 'common'].forEach(function (type) {
                    configs.push(config.createECharts(Object.assign({type}, opt)));
                });
            });

            configs.push(
                config.createBMap(false),
                config.createBMap(true),
                config.createDataTool(false),
                config.createDataTool(true)
            );
        }
        else {
            configs = [config.createECharts(opt)];
        }

        build(configs);

        // Compatible with prevoius folder structure: `echarts/lib` exists in `node_modules`
        // npm run prepublish: `rm -r lib; cp -r src lib`
        fsExtra.removeSync(getPath('./lib'));
        fsExtra.copySync(getPath('./src'), getPath('./lib'));
    }
}

/**
 * @param {string} relativePath Based on echarts directory.
 * @return {string} Absolute path.
 */
function getPath(relativePath) {
    return resolve(__dirname, '../', relativePath);
}

run();
