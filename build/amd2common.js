var glob = require('glob');
var fsExtra = require('fs-extra');
var esprima = require('esprima');

function run(cb) {
    glob('**/*.js', {
        cwd: __dirname + '/../src/'
    }, function (err, files) {
        files.forEach(function (filePath) {
            var code = parse(fsExtra.readFileSync(
                __dirname + '/../src/' + filePath, 'utf-8'));
            code = code.replace(/require\(([\'"])zrender\//g, 'require($1zrender/lib/');
            fsExtra.outputFileSync(
                __dirname + '/../lib/' + filePath,
                code, 'utf-8');
        });

        cb && cb();
    });
}

if (require.main === module) {
    run();
}
else {
    module.exports = run;
}

var MAGIC_DEPS = {
    'exports' : true,
    'module' : true,
    'require' : true
};

var SIMPLIFIED_CJS = ['require', 'exports', 'module'];

// Convert AMD-style JavaScript string into node.js compatible module
function parse (raw){
    var output = '';
    var ast = esprima.parse(raw, {
        range: true,
        raw: true
    });

    var defines = ast.body.filter(isDefine);

    if ( defines.length > 1 ){
        throw new Error('Each file can have only a single define call. Found "'+ defines.length +'"');
    } else if (!defines.length){
        return raw;
    }

    var def = defines[0];
    var args = def.expression['arguments'];
    var factory = getFactory( args );
    var useStrict = getUseStrict( factory );

    // do replacements in-place to avoid modifying the code more than needed
    if (useStrict) {
        output += useStrict.expression.raw +';\n';
    }
    output += raw.substring( 0, def.range[0] ); // anything before define
    output += getRequires(args, factory); // add requires
    output += getBody(raw, factory.body, useStrict); // module body

    output += raw.substring( def.range[1], raw.length ); // anything after define

    return output;
}


function getRequires(args, factory){
    var requires = [];
    var deps = getDependenciesNames( args );
    var params = factory.params.map(function(param, i){
        return {
            name : param.name,
            // simplified cjs doesn't have deps
            dep : (deps.length)? deps[i] : SIMPLIFIED_CJS[i]
        };
    });

    params.forEach(function(param){
        if ( MAGIC_DEPS[param.dep] && !MAGIC_DEPS[param.name] ) {
            // if user remaped magic dependency we declare a var
            requires.push( 'var '+ param.name +' = '+ param.dep +';' );
        } else if ( param.dep && !MAGIC_DEPS[param.dep] ) {
            // only do require for params that have a matching dependency also
            // skip "magic" dependencies
            requires.push( 'var '+ param.name +' = require(\''+ param.dep +'\');' );
        }
    });

    return requires.join('\n');
}


function getDependenciesNames(args){
    var deps = [];
    var arr = args.filter(function(arg){
        return arg.type === 'ArrayExpression';
    })[0];

    if (arr) {
        deps = arr.elements.map(function(el){
            return el.value;
        });
    }

    return deps;
}


function isDefine(node){
    return node.type === 'ExpressionStatement' &&
           node.expression.type === 'CallExpression' &&
           node.expression.callee.type === 'Identifier' &&
           node.expression.callee.name === 'define';
}


function getFactory(args){
    return args.filter(function(arg){
        return arg.type === 'FunctionExpression';
    })[0];
}


function getBody(raw, factoryBody, useStrict){
    var returnStatement = factoryBody.body.filter(function(node){
        return node.type === 'ReturnStatement';
    })[0];

    var body = '';
    var bodyStart = useStrict ? useStrict.expression.range[1] + 1 : factoryBody.range[0] + 1;

    if (returnStatement) {
        body += raw.substring( bodyStart, returnStatement.range[0] );
        // "return ".length === 7 so we add "6" to returnStatement start
        body += 'module.exports ='+ raw.substring( returnStatement.range[0] + 6, factoryBody.range[1] - 1 );
    } else {
        // if using exports or module.exports or just a private module we
        // simply return the factoryBody content
        body = raw.substring( bodyStart, factoryBody.range[1] - 1 );
    }

    return body;
}


function getUseStrict(factory){
    return factory.body.body.filter(isUseStrict)[0];
}


function isUseStrict(node){
    return node.type === 'ExpressionStatement' &&
            node.expression.type === 'Literal' &&
            node.expression.value === 'use strict';
}
