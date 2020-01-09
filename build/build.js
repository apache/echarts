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

const fsExtra = require('fs-extra');
const fs = require('fs');
const {resolve} = require('path');
const config = require('./config.js');
const commander = require('commander');
const {build, watch, color} = require('zrender/build/helper');
const ecLangPlugin = require('./rollup-plugin-ec-lang');
const prePublish = require('./pre-publish');
const recheckDEV = require('zrender/build/babel-plugin-transform-remove-dev').recheckDEV;

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
            egIndent + 'node build/build.js --removedev'
                + '\n' + descIndent + '# Remove __DEV__ code. If --min, __DEV__ always be removed.',
            egIndent + 'node build/build.js --type ""'
                + '\n' + descIndent + '# Only generate `dist/echarts.js`.',
            egIndent + 'node build/build.js --type common --min'
                + '\n' + descIndent + '# Only generate `dist/echarts.common.min.js`.',
            egIndent + 'node build/build.js --type simple --min --lang en'
                + '\n' + descIndent + '# Only generate `dist/echarts-en.simple.min.js`.',
            egIndent + 'node build/build.js --lang "my/lang.js" -i "my/index.js" -o "my/bundle.js"'
                + '\n' + descIndent + '# Take `<cwd>/my/index.js` as input and generate `<cwd>/my/bundle.js`,'
                + '\n' + descIndent + 'where `<cwd>/my/lang.js` is used as language file.',
        ].join('\n'))
        .option(
            '-w, --watch', [
            'Watch modifications of files and auto-compile to dist file. For example,',
            descIndent + '`echarts/dist/echarts.js`.'
        ].join('\n'))
        .option(
            '--lang <language file path or shortcut>', [
            'Use the specified file instead of `echarts/src/lang.js`. For example:',
            descIndent + '`--lang en` will use `echarts/src/langEN.js`.',
            descIndent + '`--lang my/langDE.js` will use `<cwd>/my/langDE.js`. -o must be specified in this case.',
            descIndent + '`--lang /my/indexSW.js` will use `/my/indexSW.js`. -o must be specified in this case.'
        ].join('\n'))
        .option(
            '--release',
            'Build all for release'
        )
        .option(
            '--prepublish',
            'Build all for release'
        )
        .option(
            '--removedev',
            'Remove __DEV__ code. If --min, __DEV__ always be removed.'
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
    let isPrePublish = !!commander.prepublish;

    let opt = {
        lang: commander.lang,
        min: commander.min,
        type: commander.type || '',
        input: commander.input,
        output: commander.output,
        format: commander.format,
        sourcemap: commander.sourcemap,
        removeDev: commander.removedev,
        addBundleVersion: isWatch
    };

    validateIO(opt.input, opt.output);
    validateLang(opt.lang, opt.output);

    normalizeParams(opt);

    // Clear `echarts/dist`
    if (isRelease) {
        fsExtra.removeSync(getPath('./dist'));
    }

    if (isWatch) {
        watch(config.createECharts(opt));
    }
    else if (isPrePublish) {
        prePublish();
    }
    else if (isRelease) {
        let configs = [];
        let configForCheck;

        [
            {min: false},
            {min: true},
            {min: false, lang: 'en'},
            {min: true, lang: 'en'}
        ].forEach(function (opt) {

            ['', 'simple', 'common'].forEach(function (type) {
                let singleOpt = Object.assign({type}, opt);
                normalizeParams(singleOpt);
                let singleConfig = config.createECharts(singleOpt);
                configs.push(singleConfig);

                if (singleOpt.min && singleOpt.type === '') {
                    configForCheck = singleConfig;
                }
            });
        });

        configs.push(
            config.createBMap(false),
            config.createBMap(true),
            config.createDataTool(false),
            config.createDataTool(true)
        );

        build(configs)
            .then(function () {
                checkCode(configForCheck);
                prePublish();
            }).catch(handleBuildError);
    }
    else {
        let cfg = config.createECharts(opt);
        build([cfg])
            .then(function () {
                if (opt.removeDev) {
                    checkCode(cfg);
                }
            })
            .catch(handleBuildError);
    }
}

function normalizeParams(opt) {
    if (opt.sourcemap == null) {
        opt.sourcemap = !(opt.min || opt.type);
    }
    if (opt.removeDev == null) {
        opt.removeDev = !!opt.min;
    }
}

function handleBuildError(err) {
    console.log(err);
}

function checkCode(singleConfig) {
    // Make sure __DEV__ is eliminated.
    let code = fs.readFileSync(singleConfig.output.file, {encoding: 'utf-8'});
    if (!code) {
        throw new Error(`${singleConfig.output.file} is empty`);
    }
    recheckDEV(code);
    console.log(color('fgGreen', 'dim')('Check code: correct.'));
}

function validateIO(input, output) {
    if ((input != null && output == null)
        || (input == null && output != null)
    ) {
        throw new Error('`input` and `output` must be both set.');
    }
}

function validateLang(lang, output) {
    if (!lang) {
        return;
    }

    let langInfo = ecLangPlugin.getLangFileInfo(lang);

    if (langInfo.isOuter && !output) {
        throw new Error('`-o` or `--output` must be specified if using a file path in `--lang`.');
    }
    if (!langInfo.absolutePath || !fs.statSync(langInfo.absolutePath).isFile()) {
        throw new Error(`File ${langInfo.absolutePath} does not exist yet. Contribution is welcome!`);
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
