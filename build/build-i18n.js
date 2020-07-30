const fs = require('fs');
const preamble = require('./preamble');
const ts = require('typescript');
const path = require('path');

const umdWrapperHead = `
${preamble.js}
/**
 * AUTO-GENERATED FILE. DO NOT MODIFY.
 */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports);
    } else {
        // Browser globals
        factory({});
    }
})(this, function(exports) {
`;

const umdWrapperHeadWithEcharts = `
${preamble.js}
/**
 * AUTO-GENERATED FILE. DO NOT MODIFY.
 */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports, require('echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
})(this, function(exports, echarts) {
`;

const umdWrapperTail = `
});`;

async function buildI18nWrap() {
    const targetDir = path.join(__dirname, '../i18n');
    const sourceDir = path.join(__dirname, '../src/i18n');
    const files = fs.readdirSync(sourceDir);
    files.forEach(t => {
        if(!t.startsWith('lang')) {
            return;
        }
        const fileName = t.replace(/\.ts$/, '');
        const type = fileName.replace(/^lang/, '');
        const echartsRegister = `
    echarts.registerLocale('${type}', localeObj);
        `;
        const pureExports = `
    for (var key in localeObj) {
        if (localeObj.hasOwnProperty(key)) {
            exports[key] = localeObj[key];
        }
    }
        `;
        const code = fs.readFileSync(path.join(sourceDir, t), 'utf-8');
        // const outputText = ts.transpileModule(code, {
        //     module: ts.ModuleKind.CommonJS,
        // }).outputText;
        // Simple regexp replace is enough
        const outputCode = code.replace(/export\s+?default/, 'var localeObj =')
            .replace(/\/\*([\w\W]*?)\*\//, '');

        fs.writeFileSync(path.join(targetDir, fileName + '.js'), umdWrapperHeadWithEcharts + outputCode + echartsRegister + umdWrapperTail, 'utf-8');
        fs.writeFileSync(path.join(targetDir, fileName + '-obj.js'), umdWrapperHead + outputCode + pureExports + umdWrapperTail, 'utf-8');
    })
    console.log('i18n build completed');
}

buildI18nWrap();

module.exports = {
    buildI18n: buildI18nWrap
};
