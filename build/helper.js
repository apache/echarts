const rollup = require('rollup');

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
 * @return {Promise}
 */
exports.build = function (configs) {
    return new Promise(function (promiseResolve, promiseReject) {
        let index = 0;

        buildSingle();

        function buildSingle() {
            let singleConfig = configs[index++];

            if (!singleConfig) {
                promiseResolve();
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
                    promiseReject();
                });
        }
    });
};

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
exports.watch = function (singleConfig) {
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
};

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

const COLOR_RESET = '\x1b[0m';
const COLOR_MAP = {
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    fgBlack: '\x1b[30m',
    fgRed: '\x1b[31m',
    fgGreen: '\x1b[32m',
    fgYellow: '\x1b[33m',
    fgBlue: '\x1b[34m',
    fgMagenta: '\x1b[35m',
    fgCyan: '\x1b[36m',
    fgWhite: '\x1b[37m',

    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m'
};

/**
 * Print colored text with `console.log`.
 *
 * Usage:
 * let color = require('colorConsole');
 * color('fgCyan')('some text'); // cyan text.
 * color('fgCyan', 'bright')('some text'); // bright cyan text.
 * color('fgCyan', 'bgRed')('some text') // cyan text and red background.
 */
let color = exports.color = function () {
    let prefix = [];
    for (let i = 0; i < arguments.length; i++) {
        let color = COLOR_MAP[arguments[i]];
        color && prefix.push(color);
    }
    prefix = prefix.join('');

    return function (text) {
        return prefix + text + COLOR_RESET;
    };
};
