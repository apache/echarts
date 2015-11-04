var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');

var SYNTAX = estraverse.Syntax;

var STR_MIN_LENGTH = 5;

function createDeclaration(declarations) {
    return {
        type: SYNTAX.VariableDeclaration,
        declarations: declarations,
        kind: 'var'
    };
}

function createDeclarator(id, init) {
    return {
        type: SYNTAX.VariableDeclarator,
        id: {
            type: SYNTAX.Identifier,
            name: id
        },
        init: {
            type: SYNTAX.Literal,
            value: init
        }
    };
}

function base54Digits() {
    return 'etnrisouaflchpdvmgybwESxTNCkLAOM_DPHBjFIqRUzWXV$JKQGYZ0516372984';
}

var base54 = (function(){
    var DIGITS = base54Digits();
    return function(num) {
        var ret = '';
        var base = 54;
        do {
            ret += DIGITS.charAt(num % base);
            num = Math.floor(num / base);
            base = 64;
        } while (num > 0);
        return ret;
    };
})();

function optimizeString(source) {

    var ast = esprima.parse(source);

    var stringVariables = {};

    var stringRelaceCount = 0;

    estraverse.traverse(ast, {
        enter: function (node, parent) {
            if (node.type === SYNTAX.Literal
                && typeof node.value === 'string'
            ) {
                // Ignore if string is the key of property
                if (parent.type === SYNTAX.Property) {
                    return;
                }
                var value = node.value;
                if (value.length > STR_MIN_LENGTH) {
                    if (!stringVariables[value]) {
                        var varName = '__echartsString__' + base54(stringRelaceCount++);
                        stringVariables[value] = {
                            name: varName,
                            count: 0
                        };
                    }
                    stringVariables[value].count++;
                }
            }
        }
    });

    estraverse.replace(ast, {
        enter: function (node, parent) {
            if (node.type === SYNTAX.Literal
                && typeof node.value === 'string'
            ) {
                // Ignore if string is the key of property
                if (parent.type === SYNTAX.Property) {
                    return;
                }
                var str = node.value;
                if (stringVariables[str] && stringVariables[str].count > 1) {
                    return {
                        type: SYNTAX.Identifier,
                        name: stringVariables[str].name
                    };
                }
            }
        }
    });

    // Add variables in the top
    for (var str in stringVariables) {
        // Used more than once
        if (stringVariables[str].count > 1) {
            ast.body.unshift(createDeclaration([
                createDeclarator(stringVariables[str].name, str)
            ]));
        }
    }

    return escodegen.generate(
        ast,
        {
            format: {escapeless: true},
            comment: true
        }
    );
}

exports = module.exports = optimizeString;