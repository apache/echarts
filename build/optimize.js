var UglifyJS = require('uglify-js');
var fs = require('fs');
var etpl = require('etpl');

etpl.config({
    commandOpen: '/**',
    commandClose: '*/'
});

var config = eval('(' + fs.readFileSync('config.js', 'utf-8') + ')');
var mainCode = fs.readFileSync('../dist/echarts.js', 'utf-8');
var startCode = fs.readFileSync('wrap/start.js', 'utf-8');
var nutCode = fs.readFileSync('wrap/nut.js', 'utf-8');
var endCode = fs.readFileSync('wrap/end.js', 'utf-8');

// mainCode = require('./optimizeString')(mainCode);

endCode = etpl.compile(endCode)({
    parts: config.include
});

var sourceCode = [startCode, nutCode, mainCode, endCode].join('\n');

var ast = UglifyJS.parse(sourceCode);
/* jshint camelcase: false */
// compressor needs figure_out_scope too
ast.figure_out_scope();
ast = ast.transform(UglifyJS.Compressor( {} ));

// need to figure out scope again so mangler works optimally
ast.figure_out_scope();
ast.compute_char_frequency();
ast.mangle_names();

fs.writeFileSync('../dist/echarts.js', sourceCode, 'utf-8');
fs.writeFileSync('../dist/echarts.min.js', ast.print_to_string(), 'utf-8');