import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify';

function plugins(production) {
    let plugins = [
        resolve({
            extensions: ['.js'],
            jsnext: true,
            main: true
        }),
        commonjs()
    ];
    if (production) {
        plugins.push(uglify({
            compress: {
                // Eliminate __DEV__ code.
                global_defs: {
                    __DEV__: true
                }
            }
        }));
    }
    return plugins;
}


// ??????????
// en lang

// ??????????
// prepublish

function createBuild(type, production) {
    if (type) {
        type = '.' + type;
    }
    var postfix = '';
    if (production) {
        postfix = '.min';
    }
    return {
        input: `./index${type}.js`,
        name: 'echarts',
        plugins: plugins(production),
        legacy: true, // Support IE8-
        output: {
            format: 'umd',
            sourcemap: true,
            file: `dist/echarts${type}${postfix}.js`
        },
        watch: {
            include: ['./src/**', './index*.js']
        }
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