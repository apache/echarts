import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify';

function plugins(production) {
    let plugins = [
        resolve(),
        commonjs()
    ];
    if (production) {
        plugins.push(uglify({
            compress: {
                global_defs: {
                    __DEV__: true
                }
            }
        }));
    }
    return plugins;
}

function createBuild(type, production) {
    if (type) {
        type = '.' + type;
    }
    var postfix = '';
    if (production) {
        postfix = '.min';
    }
    return {
        entry: `./index${type}.js`,
        format: 'umd',
        moduleName: 'echarts',
        plugins: plugins(production),
        dest: `dist/echarts${type}${postfix}.js`
    };
}

export default [
    createBuild('blank', false),
    createBuild('simple', false),
    createBuild('common', false),
    createBuild('', false),

    createBuild('blank', true),
    createBuild('simple', true),
    createBuild('common', true),
    createBuild('', true)
];