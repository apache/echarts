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
            egIndent + 'node build/build.js --prepublish'
                + '\n' + descIndent + '# Only prepublish.',
            egIndent + 'node build/build.js --type ""'
                + '\n' + descIndent + '# Only generate `dist/echarts.js`.',
            egIndent + 'node build/build.js --type common --min'
                + '\n' + descIndent + '# Only generate `dist/echarts.common.min.js`.',
            egIndent + 'node build/build.js --type simple --min'
                + '\n' + descIndent + '# Only generate `dist/echarts-en.simple.min.js`.',
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
            'Can be "simple" or "common" or "all" (default). Or can be simple,common,all to build multiple. For example,',
            descIndent + '`--type ""` or `--type "common"`.'
        ].join('\n'))
        .option(
            '--format <format>',
            'The format of output bundle. Can be "umd", "amd", "iife", "cjs", "esm".'
        )
        .parse(process.argv);

    let isPrePublish = !!commander.prepublish;
    let buildType = commander.type || 'all';

    let opt = {
        min: commander.min,
        format: commander.format || 'umd'
    };

    validateIO(opt.input, opt.output);

    if (isPrePublish) {
        await prePublish();
    }
    else if (buildType === 'extension') {
        const cfgs = [
            config.createBMap(opt),
            config.createDataTool(opt)
        ];
        await build(cfgs);
    }
    else if (buildType === 'ssr') {
        const cfgs = [
            config.createSSRClient(opt)
        ];
        await build(cfgs);
    }
    else if (buildType === 'myTransform') {
        const cfgs = [
            config.createMyTransform(opt)
        ];
        await build(cfgs);
    }
    else {
        const types = buildType.split(',').map(a => a.trim());


        // Since 5.5.0, echarts/package.json added `{"type": "module"}`, and added
        // echarts/dist/package.json with `{"type": "commonjs"}`, both of which makes
        // echarts/dist/echarts.esm.js can not be recognized as esm any more (at least
        // in webpack5 and nodejs) any more. So we provides echarts/dist/echarts.esm.mjs.
        // But for backward compat, we still provide provides echarts/dist/echarts.esm.js.
        const isBuildingDistESM = (opt.format || '').toLowerCase() === 'esm';
        if (isBuildingDistESM) {
            await makeConfigAndBuild(opt, '.js');
            await makeConfigAndBuild(opt, '.mjs');
        }
        else {
            await makeConfigAndBuild(opt);
        }

        async function makeConfigAndBuild(opt, fileExtension) {
            const cfgs = types.map(type =>
                config.createECharts({
                    ...opt,
                    type,
                    fileExtension
                })
            );
            await build(cfgs);
        }
    }
}

function checkBundleCode(cfg) {
    // Make sure process.env.NODE_ENV is eliminated.
    for (let output of cfg.output) {
        let code = fs.readFileSync(output.file, {encoding: 'utf-8'});
        if (!code) {
            throw new Error(`${output.file} is empty`);
        }
        transformDEV.recheckDEV(code);
        console.log(chalk.green.dim('Check code: correct.'));
    }
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
 *      },
 *      ...
 *  ]
 */
async function build(configs) {
    console.log(chalk.yellow(`
    NOTICE: If you are using 'npm run build'. Run 'npm run prepare' before build !!!
`));

    console.log(chalk.yellow(`
    NOTICE: If you are using syslink on zrender. Run 'npm run prepare' in zrender first !!
`));

    for (let singleConfig of configs) {
        console.log(
            chalk.cyan.dim('\Bundling '),
            chalk.cyan(singleConfig.input)
        );

        console.time('rollup build');
        const bundle = await rollup.rollup(singleConfig);

        for (let output of singleConfig.output) {
            console.log(
                chalk.green.dim('Created '),
                chalk.green(output.file),
                chalk.green.dim(' successfully.')
            );

            await bundle.write(output);

        };
        console.timeEnd('rollup build');

        checkBundleCode(singleConfig);
    }
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
