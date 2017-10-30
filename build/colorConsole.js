/**
 * Print colored text with `console.log`.
 *
 * Usage:
 * var color = require('colorConsole');
 * color('fgCyan')('some text'); // cyan text.
 * color('fgCyan', 'bright')('some text'); // bright cyan text.
 * color('fgCyan', 'bgRed')('some text') // cyan text and red background.
 */

/* global module */

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

module.exports = function () {
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
