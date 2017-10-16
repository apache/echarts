import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify';

function getPlugins(production) {
    let plugins = [
        resolve({
            extensions: ['.js'],
            jsnext: true,
            main: true,
            customResolveOptions: {
                /**
                 * BTW, `index.js` of a package will not be filtered.
                 * @see <https://github.com/browserify/resolve>
                 * @param {Object} pkg - package data
                 * @param {Object} path - the path being resolved
                 * @param {Object} relativePath - the path relative from the package.json location
                 * @return {string} - a relative path that will be joined from the package.json location
                 */
                pathFilter: function (pkg, path, relativePath) {
                    if (pkg.name !== 'zrender') {
                        return path;
                    }
                    // Redirect zrender `import` to `node_module/zrender/src`.
                    var idx = path.lastIndexOf(relativePath);
                    return path.slice(0, idx) + 'src/' + relativePath;
                }
            }
        }),
        commonjs({
            include: ['index*.js']
        })
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
        name: 'echarts',
        plugins: getPlugins(production),
        input: `./echarts${type}.js`,
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