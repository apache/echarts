
const assert = require('assert');

function plugin({types, template}, options) {
    return {
        visitor: {
            IfStatement: {
                exit(path) {
                    removeDEV(path);
                }
            }
        }
    };
}

plugin.recheckDEV = function (code) {
    const index = code.indexOf('__DEV__');
    assert(index < 0, `Still has __DEV__, position: ${index}`);
};

module.exports = plugin;

function removeDEV(path) {
    if (path.node.test.name === '__DEV__') {
        path.remove();
    }
}


