#!/usr/bin/env node

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

const fs = require('fs');
const config = require('./config.js');
const commander = require('commander');
const chalk = require('chalk');
const rollup = require('rollup');
const prePublish = require('./pre-publish');
const transformDEV = require('./transform-dev');
const UglifyJS = require("uglify-js");
const preamble = require('./preamble');
const {buildI18n} = require('./build-i18n')
const terser = require('terser');

async function run() {

    /**
     * Tips for `commander`:
     * (1) If arg xxx not specified, `commander.xxx` is undefined.
     *     Otherwise:
     *      If '-x, --xxx', `commander.xxx` can only be true/false, even if '--xxx yyy' input.
     *      If '-x, --xxx <some>', the 'some' string is required, or otherwise error will be thrown.
     *      If '-x, --xxx [some]', the 'some' string is optional, that is, `commander.xxx` can be boolean or string.
     * (2) `node ./build/build.js --help` will print helper info and exit.
     */

    let descIndent = '                                 ';
    let egIndent = '    ';

    commander
        .usage('[options]')
        .description([
            'Build echarts and generate result files in directory `echarts/dist`.',
            '',
            '  For example:',
            '',
            egIndent + 'node build/build.js --release'
                + '\n' + descIndent + '# Build all to `dist` folder.',
            egIndent + 'node build/build.js --prepublish'
                + '\n' + descIndent + '# Only prepublish.',
            egIndent + 'node build/build.js --type ""'
                + '\n' + descIndent + '# Only generate `dist/echarts.js`.',
            egIndent + 'node build/build.js --type common --min'
                + '\n' + descIndent + '# Only generate `dist/echarts.common.min.js`.',
            egIndent + 'node build/build.js --type simple --min'
                + '\n' + descIndent + '# Only generate `dist/echarts-en.simple.min.js`.',
            egIndent + 'node build/build.js -i "my/index.js" -o "my/bundle.js"'
                + '\n' + descIndent + '# Take `<cwd>/my/index.js` as input and generate `<cwd>/my/bundle.js`,'
        ].join('\n'))
        .option(
            '-w, --watch', [
            'Watch modifications of files and auto-compile to dist file. For example,',
            descIndent + '`echarts/dist/echarts.js`.'
        ].join('\n'))
        .option(
            '--prepublish',
            'Build all for release'
        )
        .option(
            '--min',
            'Whether to compress the output file, and remove error-log-print code.'
        )
        .option(
            '--type <type name>', [
            'Can be "simple" or "common" or "" (default). For example,',
            descIndent + '`--type ""` or `--type "common"`.'
        ].join('\n'))
        .option(
            '--sourcemap',
            'Whether output sourcemap.'
        )
        .option(
            '--format <format>',
            'The format of output bundle. Can be "umd", "amd", "iife", "cjs", "esm".'
        )
        .option(
            '-i, --input <input file path>',
            'If input file path is specified, output file path must be specified too.'
        )
        .option(
            '-o, --output <output file path>',
            'If output file path is specified, input file path must be specified too.'
        )
        .option(
            '--clean',
            'If cleaning build without cache. Maybe useful if some unexpected happens.'
        )
        .parse(process.argv);

    let isWatch = !!commander.watch;
    let isRelease = !!commander.release;
    let isPrePublish = !!commander.prepublish;

    let opt = {
        min: commander.min,
        type: commander.type || '',
        input: commander.input,
        output: commander.output,
        format: commander.format,
        sourcemap: commander.sourcemap,
        addBundleVersion: isWatch,
        // Force to disable cache in release build.
        // TODO npm run build also disable cache?
        clean: commander.clean || isRelease
    };

    validateIO(opt.input, opt.output);

    if (isWatch) {
        watch(config.createECharts(opt), opt.sourcemap);
    }
    else if (isPrePublish) {
        await prePublish();
    }
    else if (opt.type === 'extension') {
        const cfgs = [
            config.createBMap(),
            config.createDataTool()
        ];
        await build(cfgs, opt.min, opt.sourcemap);
    }
    else if (opt.type === 'myTransform') {
        const cfgs = [
            config.createMyTransform()
        ];
        await build(cfgs, opt.min, opt.sourcemap);
    }
    else {
        const cfg = config.createECharts(opt);
        await build([cfg], opt.min, opt.sourcemap);
        checkBundleCode(cfg);
    }
}

function checkBundleCode(cfg) {
    // Make sure __DEV__ is eliminated.
    let code = fs.readFileSync(cfg.output.file, {encoding: 'utf-8'});
    if (!code) {
        throw new Error(`${cfg.output.file} is empty`);
    }
    transformDEV.recheckDEV(code);
    console.log(chalk.green.dim('Check code: correct.'));
}

function validateIO(input, output) {
    if ((input != null && output == null)
        || (input == null && output != null)
    ) {
        throw new Error('`input` and `output` must be both set.');
    }
}

/**
 * @param {Array.<Object>} configs A list of rollup configs:
 *  See: <https://rollupjs.org/#big-list-of-options>
 *  For example:
 *  [
 *      {
 *          ...inputOptions,
 *          output: [outputOptions],
 *          watch: {chokidar, include, exclude}
 *      },
 *      ...
 *  ]
 */
async function build(configs, min, sourcemap) {
    // buildI18n JSON before build when build
    buildI18n();

    // ensureZRenderCode.prepare();

    for (let singleConfig of configs) {

        console.log(
            chalk.cyan.dim('\Bundling '),
            chalk.cyan(singleConfig.input),
            chalk.cyan.dim('=>'),
            chalk.cyan(singleConfig.output.file),
            chalk.cyan.dim(' ...')
        );

        console.time('rollup build');
        const bundle = await rollup.rollup(singleConfig);
        console.timeEnd('rollup build');

        await bundle.write(singleConfig.output);
        const sourceCode = fs.readFileSync(singleConfig.output.file, 'utf-8');
        // Convert __DEV__ to true;
        const transformResult = transformDEV.transform(sourceCode, sourcemap, 'true');
        fs.writeFileSync(singleConfig.output.file, transformResult.code, 'utf-8');
        if (transformResult.map) {
            fs.writeFileSync(singleConfig.output.file + '.map', JSON.stringify(transformResult.map), 'utf-8');
        }

        console.log(
            chalk.green.dim('Created '),
            chalk.green(singleConfig.output.file),
            chalk.green.dim(' successfully.')
        );

        if (min) {
            const fileMinPath = singleConfig.output.file.replace(/.js$/, '.min.js');
            console.log(
                chalk.cyan.dim('Minifying '),
                chalk.cyan(singleConfig.output.file),
                chalk.cyan.dim('=>'),
                chalk.cyan(fileMinPath),
                chalk.cyan.dim(' ...')
            )
            console.time('Minify');
            // Convert __DEV__ to false and let uglify remove the dead code;
            const transformedCode = transformDEV.transform(sourceCode, false, 'false').code;
            let minifyResult;
            if (singleConfig.output.format !== 'esm') {
                minifyResult = UglifyJS.minify(transformedCode, {
                    output: {
                        preamble: preamble.js
                    }
                });
                if (minifyResult.error) {
                    throw new Error(minifyResult.error);
                }
            }
            else {
                // Use terser for esm minify because uglify doesn't support esm code.
                minifyResult = await terser.minify(transformedCode, {
                    format: {
                        preamble: preamble.js
                    }
                })
            }
            fs.writeFileSync(fileMinPath, minifyResult.code, 'utf-8');

            console.timeEnd('Minify');
            console.log(
                chalk.green.dim('Created '),
                chalk.green(fileMinPath),
                chalk.green.dim(' successfully.')
            );
        }

    }

    // ensureZRenderCode.clear();
}

/**
 * @param {Object} singleConfig A single rollup config:
 *  See: <https://rollupjs.org/#big-list-of-options>
 *  For example:
 *  {
 *      ...inputOptions,
 *      output: [outputOptions],
 *      watch: {chokidar, include, exclude}
 *  }
 */
function watch(singleConfig, sourcemap) {

    let watcher = rollup.watch(singleConfig);

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
                chalk.blue('[' + getTimeString() + ']'),
                chalk.blue.dim('build'),
                event.code.replace(/_/g, ' ').toLowerCase()
            );
        }
        if (event.code === 'ERROR' || event.code === 'FATAL') {
            printCodeError(event.error);
        }
        if (event.code === 'BUNDLE_END') {

            const sourceCode = fs.readFileSync(singleConfig.output.file, 'utf-8');
            // Convert __DEV__ to true;
            const transformResult = transformDEV.transform(sourceCode, sourcemap, 'true');
            fs.writeFileSync(singleConfig.output.file, transformResult.code, 'utf-8');

            printWatchResult(event);
        }
    });
}

function printWatchResult(event) {
    console.log(
        chalk.green.dim('Created'),
        chalk.green(event.output.join(', ')),
        chalk.green.dim('in'),
        chalk.green(event.duration),
        chalk.green.dim('ms.')
    );
}

function printCodeError(error) {
    console.log('\n' + error.code);
    if (error.code === 'PARSE_ERROR') {
        console.log(
            'line',
            chalk.cyan(error.loc.line),
            'column',
            chalk.cyan(error.loc.column),
            'in',
            chalk.cyan(error.loc.file)
        );
    }
    if (error.frame) {
        console.log('\n' + chalk.red(error.frame));
    }
    console.log(chalk.red.dim('\n' + error.stack));
}

function getTimeString() {
    return (new Date()).toLocaleString();
}


async function main() {
    try {
        await run();
    }
    catch (err) {
        console.log(chalk.red('BUILD ERROR!'));
        // rollup parse error.
        if (err) {
            if (err.loc) {
                console.warn(chalk.red(`${err.loc.file} (${err.loc.line}:${err.loc.column})`));
                console.warn(chalk.red(err.message));
            }
            if (err.frame) {
                console.warn(chalk.red(err.frame));
            }
            console.log(chalk.red(err ? err.stack : err));

            err.id != null && console.warn(chalk.red(`id: ${err.id}`));
            err.hook != null && console.warn(chalk.red(`hook: ${err.hook}`));
            err.code != null && console.warn(chalk.red(`code: ${err.code}`));
            err.plugin != null && console.warn(chalk.red(`plugin: ${err.plugin}`));
        }
        // console.log(err);
    }
}

main();
