var PROD = process.argv.indexOf('-p') >= 0;
var webpack = require('webpack');

var IS_EN = process.argv.indexOf('--lang-en') >= 0;

var plugins = [
    new webpack.DefinePlugin({
        'typeof __DEV__': JSON.stringify('boolean'),
        __DEV__: PROD ? false : true
    })
];
var outputSuffix = '';

if (IS_EN) {
    plugins.unshift(
        new webpack.NormalModuleReplacementPlugin(/\/lang[.]js/, './langEN.js')
    );
    outputSuffix = '-en';
}

module.exports = {
    plugins: plugins,
    entry: {
        'echarts': __dirname + '/index.js',
        'echarts.simple': __dirname + '/index.simple.js',
        'echarts.common': __dirname + '/index.common.js'
    },
    output: {
        libraryTarget: 'umd',
        library: 'echarts',
        path: __dirname + '/dist',
        filename: PROD
            ? '[name]' + outputSuffix + '.min.js'
            : '[name]' + outputSuffix + '.js'
    }
};