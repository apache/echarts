const fs = require('fs');

const outFilePath = './i18n';
const umdWrapperHead = `
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
var lang =`;

const umdWrapperHeadWithEcharts = `
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
var lang =`;

const umdWrapperTail = `
});`;

async function buildI18nWrap() {
    const targetDir = './src/i18n';
    const files = fs.readdirSync(targetDir);
    files.forEach(t => {
        if(!t.startsWith('lang') || !t.endsWith('json')) return;
        const fileName = t.substring(0, t.length - 5);
        const type = t.substr(-7, 2);
        const echartsRegister = `
        echarts.registerLocale('${type}', lang);
        `;
        const pureExports = `
            exports.lang = lang;
        `;
        const code = fs.readFileSync(targetDir + '/' + t, 'utf-8');
        fs.writeFileSync(outFilePath + '/' + fileName + '.js', umdWrapperHeadWithEcharts + code + echartsRegister + umdWrapperTail, 'utf-8');
        fs.writeFileSync(outFilePath + '/' + fileName + '-obj.js', umdWrapperHead + code + pureExports + umdWrapperTail, 'utf-8');
        fs.writeFileSync(targetDir + '/' + fileName + '.ts', 'export default ' + code, 'utf-8');
    })
    console.log('i18n build completed');
}

buildI18nWrap();

module.exports = {
    buildI18n: buildI18nWrap
};
