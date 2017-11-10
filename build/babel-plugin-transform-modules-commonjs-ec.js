const assert = require('assert');
const nodePath = require('path');
const basename = nodePath.basename;
const extname = nodePath.extname;

const babelTypes = require('@babel/types');
const babelTemplate = require('@babel/template');

const helperModuleTransforms = require('@babel/helper-module-transforms');
const isModule = helperModuleTransforms.isModule;
const isSideEffectImport = helperModuleTransforms.isSideEffectImport;
const ensureStatementsHoisted = helperModuleTransforms.ensureStatementsHoisted;


function plugin({types, template}, options) {
    return {
        visitor: {
            Program: {
                exit(path) {
                    // For now this requires unambiguous rather that just sourceType
                    // because Babel currently parses all files as sourceType:module.
                    if (!isModule(path, true /* requireUnambiguous */)) {
                       return;
                    }

                    // Rename the bindings auto-injected into the scope so there is no
                    // risk of conflict between the bindings.
                    path.scope.rename('exports');
                    path.scope.rename('module');
                    path.scope.rename('require');
                    path.scope.rename('__filename');
                    path.scope.rename('__dirname');

                    const meta = rewriteModuleStatementsAndPrepare(path);

                    let headers = [];
                    let tails = [];
                    const checkExport = createExportChecker();

                    for (const [source, metadata] of meta.source) {
                        headers.push(...buildRequireStatements(types, source, metadata));
                        headers.push(...buildNamespaceInitStatements(meta, metadata, checkExport));
                    }

                    tails.push(...buildLocalExportStatements(meta, checkExport));

                    ensureStatementsHoisted(headers);
                    // FIXME ensure tail?

                    path.unshiftContainer('body', headers);
                    path.pushContainer('body', tails);
                }
            }
        }
    };
}

// FIXME
plugin.replaceInject = function (code) {
    return code.replace(/\/\* ESM2CJS_REPLACE ([^*/]+)\*\//g, '$1');
};

module.exports = plugin;


/**
 * Remove all imports and exports from the file, and return all metadata
 * needed to reconstruct the module's behavior.
 * @return {ModuleMetadata}
 */
function normalizeModuleAndLoadMetadata(programPath) {

    nameAnonymousExports(programPath);

    const {local, source} = getModuleMetadata(programPath);

    removeModuleDeclarations(programPath);

    // Reuse the imported namespace name if there is one.
    for (const [, metadata] of source) {
        if (metadata.importsNamespace.size > 0) {
            // This is kind of gross. If we stop using `loose: true` we should
            // just make this destructuring assignment.
            metadata.name = metadata.importsNamespace.values().next().value;
        }
    }

    return {
        exportName: 'exports',
        exportNameListName: null,
        local,
        source
    };
}

/**
 * Get metadata about the imports and exports present in this module.
 */
function getModuleMetadata(programPath) {
    const localData = getLocalExportMetadata(programPath);

    const sourceData = new Map();
    const getData = sourceNode => {
        const source = sourceNode.value;

        let data = sourceData.get(source);
        if (!data) {
            data = {
                name: programPath.scope.generateUidIdentifier(
                    basename(source, extname(source))
                ).name,

                interop: 'none',

                loc: null,

                // Data about the requested sources and names.
                imports: new Map(),
                // importsNamespace: import * as util from './a/b/util';
                importsNamespace: new Set(),

                // Metadata about data that is passed directly from source to export.
                reexports: new Map(),
                reexportNamespace: new Set(),
                reexportAll: null,
            };
            sourceData.set(source, data);
        }
        return data;
    };

    programPath.get('body').forEach(child => {
        if (child.isImportDeclaration()) {
            const data = getData(child.node.source);
            if (!data.loc) {
                data.loc = child.node.loc;
            }

            child.get('specifiers').forEach(spec => {
                if (spec.isImportDefaultSpecifier()) {
                    const localName = spec.get('local').node.name;

                    data.imports.set(localName, 'default');

                    const reexport = localData.get(localName);
                    if (reexport) {
                        localData.delete(localName);

                        reexport.names.forEach(name => {
                            data.reexports.set(name, 'default');
                        });
                    }
                }
                else if (spec.isImportNamespaceSpecifier()) {
                    const localName = spec.get('local').node.name;

                    assert(
                        data.importsNamespace.size === 0,
                        `Duplicate import namespace: ${localName}`
                    );
                    data.importsNamespace.add(localName);

                    const reexport = localData.get(localName);
                    if (reexport) {
                        localData.delete(localName);

                        reexport.names.forEach(name => {
                            data.reexportNamespace.add(name);
                        });
                    }
                }
                else if (spec.isImportSpecifier()) {
                    const importName = spec.get('imported').node.name;
                    const localName = spec.get('local').node.name;

                    data.imports.set(localName, importName);

                    const reexport = localData.get(localName);
                    if (reexport) {
                        localData.delete(localName);

                        reexport.names.forEach(name => {
                            data.reexports.set(name, importName);
                        });
                    }
                }
            });
        }
        else if (child.isExportAllDeclaration()) {
            const data = getData(child.node.source);
            if (!data.loc) {
                data.loc = child.node.loc;
            }

            data.reexportAll = {
                loc: child.node.loc,
            };
        }
        else if (child.isExportNamedDeclaration() && child.node.source) {
            const data = getData(child.node.source);
            if (!data.loc) {
                data.loc = child.node.loc;
            }

            child.get('specifiers').forEach(spec => {
                if (!spec.isExportSpecifier()) {
                    throw spec.buildCodeFrameError('Unexpected export specifier type');
                }
                const importName = spec.get('local').node.name;
                const exportName = spec.get('exported').node.name;

                data.reexports.set(exportName, importName);

                if (exportName === '__esModule') {
                    throw exportName.buildCodeFrameError('Illegal export "__esModule".');
                }
            });
        }
    });

    for (const metadata of sourceData.values()) {
        if (metadata.importsNamespace.size > 0) {
            metadata.interop = 'namespace';
            continue;
        }
        let needsDefault = false;
        let needsNamed = false;
        for (const importName of metadata.imports.values()) {
            if (importName === 'default') {
                needsDefault = true;
            }
            else {
                needsNamed = true;
            }
        }
        for (const importName of metadata.reexports.values()) {
            if (importName === 'default') {
                needsDefault = true;
            }
            else {
                needsNamed = true;
            }
        }

        if (needsDefault && needsNamed) {
            // TODO(logan): Using the namespace interop here is unfortunate. Revisit.
            metadata.interop = 'namespace';
        }
        else if (needsDefault) {
            metadata.interop = 'default';
        }
    }

    return {
        local: localData,
        source: sourceData,
    };
}

/**
 * Get metadata about local variables that are exported.
 * @return {Map<string, LocalExportMetadata>}
 */
function getLocalExportMetadata(programPath){
    const bindingKindLookup = new Map();

    programPath.get('body').forEach(child => {
        let kind;
        if (child.isImportDeclaration()) {
            kind = 'import';
        }
        else {
            if (child.isExportDefaultDeclaration()) {
                child = child.get('declaration');
            }
            if (child.isExportNamedDeclaration() && child.node.declaration) {
                child = child.get('declaration');
            }

            if (child.isFunctionDeclaration()) {
                kind = 'hoisted';
            }
            else if (child.isClassDeclaration()) {
                kind = 'block';
            }
            else if (child.isVariableDeclaration({ kind: 'var' })) {
                kind = 'var';
            }
            else if (child.isVariableDeclaration()) {
                kind = 'block';
            }
            else {
                return;
            }
        }

        Object.keys(child.getOuterBindingIdentifiers()).forEach(name => {
            bindingKindLookup.set(name, kind);
        });
    });

    const localMetadata = new Map();
    const getLocalMetadata = idPath => {
        const localName = idPath.node.name;
        let metadata = localMetadata.get(localName);
        if (!metadata) {
            const kind = bindingKindLookup.get(localName);

            if (kind === undefined) {
                throw idPath.buildCodeFrameError(`Exporting local "${localName}", which is not declared.`);
            }

            metadata = {
                names: [],
                kind,
            };
            localMetadata.set(localName, metadata);
        }
        return metadata;
    };

    programPath.get('body').forEach(child => {
        if (child.isExportNamedDeclaration() && !child.node.source) {
            if (child.node.declaration) {
                const declaration = child.get('declaration');
                const ids = declaration.getOuterBindingIdentifierPaths();
                Object.keys(ids).forEach(name => {
                if (name === '__esModule') {
                    throw declaration.buildCodeFrameError('Illegal export "__esModule".');
                }

                getLocalMetadata(ids[name]).names.push(name);
                });
            }
            else {
                child.get('specifiers').forEach(spec => {
                    const local = spec.get('local');
                    const exported = spec.get('exported');

                    if (exported.node.name === '__esModule') {
                        throw exported.buildCodeFrameError('Illegal export "__esModule".');
                    }

                    getLocalMetadata(local).names.push(exported.node.name);
                });
            }
        }
        else if (child.isExportDefaultDeclaration()) {
            const declaration = child.get('declaration');
            if (
                declaration.isFunctionDeclaration() ||
                declaration.isClassDeclaration()
            ) {
                getLocalMetadata(declaration.get('id')).names.push('default');
            }
            else {
                // These should have been removed by the nameAnonymousExports() call.
                throw declaration.buildCodeFrameError('Unexpected default expression export.');
            }
        }
    });

    return localMetadata;
}

/**
 * Ensure that all exported values have local binding names.
 */
function nameAnonymousExports(programPath) {
    // Name anonymous exported locals.
    programPath.get('body').forEach(child => {
        if (!child.isExportDefaultDeclaration()) {
            return;
        }

        // export default foo;
        const declaration = child.get('declaration');
        if (declaration.isFunctionDeclaration()) {
            if (!declaration.node.id) {
                declaration.node.id = declaration.scope.generateUidIdentifier('default');
            }
        }
        else if (declaration.isClassDeclaration()) {
            if (!declaration.node.id) {
                declaration.node.id = declaration.scope.generateUidIdentifier('default');
            }
        }
        else {
            const id = declaration.scope.generateUidIdentifier('default');
            const namedDecl = babelTypes.exportNamedDeclaration(null, [
                babelTypes.exportSpecifier(babelTypes.identifier(id.name), babelTypes.identifier('default')),
            ]);
            namedDecl._blockHoist = child.node._blockHoist;

            const varDecl = babelTypes.variableDeclaration('var', [
                babelTypes.variableDeclarator(id, declaration.node),
            ]);
            varDecl._blockHoist = child.node._blockHoist;

            child.replaceWithMultiple([namedDecl, varDecl]);
        }
    });
}

function removeModuleDeclarations(programPath) {
    programPath.get('body').forEach(child => {
        if (child.isImportDeclaration()) {
            child.remove();
        }
        else if (child.isExportNamedDeclaration()) {
            if (child.node.declaration) {
                child.node.declaration._blockHoist = child.node._blockHoist;
                child.replaceWith(child.node.declaration);
            }
            else {
                child.remove();
            }
        }
        else if (child.isExportDefaultDeclaration()) {
            // export default foo;
            const declaration = child.get('declaration');
            if (
                declaration.isFunctionDeclaration() ||
                declaration.isClassDeclaration()
            ) {
                declaration._blockHoist = child.node._blockHoist;
                child.replaceWith(declaration);
            }
            else {
                // These should have been removed by the nameAnonymousExports() call.
                throw declaration.buildCodeFrameError('Unexpected default expression export.');
            }
        }
        else if (child.isExportAllDeclaration()) {
            child.remove();
        }
    });
}








/**
 * Perform all of the generic ES6 module rewriting needed to handle initial
 * module processing. This function will rewrite the majority of the given
 * program to reference the modules described by the returned metadata,
 * and returns a list of statements for use when initializing the module.
 */
function rewriteModuleStatementsAndPrepare(path) {
    path.node.sourceType = 'script';

    const meta = normalizeModuleAndLoadMetadata(path);

    return meta;
}

/**
 * Create the runtime initialization statements for a given requested source.
 * These will initialize all of the runtime import/export logic that
 * can't be handled statically by the statements created by
 * buildExportInitializationStatements().
 */
function buildNamespaceInitStatements(meta, metadata, checkExport) {
    const statements = [];
    const {localImportName, localImportDefaultName} = getLocalImportName(metadata);

    for (const exportName of metadata.reexportNamespace) {
        // Assign export to namespace object.
        checkExport(exportName);
        statements.push(buildExport({exportName, localName: localImportName}));
    }

    // Source code:
    //      import {color2 as color2Alias, color3, color4, color5} from 'xxx';
    //      export {default as b} from 'xxx';
    //      export {color2Alias};
    //      export {color3};
    //      let color5Renamed = color5
    //      export {color5Renamed};
    // Only two entries in metadata.reexports:
    //      'color2Alias' => 'color2'
    //      'color3' => 'color3',
    //      'b' => 'default'
    //
    // And consider:
    //      export {default as defaultAsBB} from './xx/yy';
    //      export {exportSingle} from './xx/yy';
    // No entries in metadata.imports, and 'default' exists in metadata.reexports.
    for (const entry of metadata.reexports.entries()) {
        const exportName = entry[0];
        checkExport(exportName);
        statements.push(
            (localImportDefaultName || entry[1] === 'default')
                ? buildExport({exportName, localName: localImportName})
                : buildExport({exportName, namespace: localImportName, propName: entry[1]})
        );
    }

    if (metadata.reexportAll) {
        const statement = buildNamespaceReexport(
            meta,
            metadata.name,
            checkExport
        );
        statement.loc = metadata.reexportAll.loc;

        // Iterate props creating getter for each prop.
        statements.push(statement);
    }

    return statements;
}

/**
 * Create a re-export initialization loop for a specific imported namespace.
 */
function buildNamespaceReexport(meta, namespace, checkExport) {
    checkExport();
    return babelTemplate.statement(`
        (function() {
          for (var key in NAMESPACE) {
            if (NAMESPACE == null || !NAMESPACE.hasOwnProperty(key) || key === 'default' || key === '__esModule') return;
            VERIFY_NAME_LIST;
            exports[key] = NAMESPACE[key];
          }
        })();
    `)({
        NAMESPACE: namespace,
        VERIFY_NAME_LIST: meta.exportNameListName
            ? babelTemplate.statement(`
                if (Object.prototype.hasOwnProperty.call(EXPORTS_LIST, key)) return;
            `)({EXPORTS_LIST: meta.exportNameListName})
            : null
    });
}

function buildRequireStatements(types, source, metadata) {
    let headers = [];

    const loadExpr = types.callExpression(
        types.identifier('require'),
        // replace `require('./src/xxx')` to `require('./lib/xxx')`
        // for echarts and zrender in old npm or webpack.
        [types.stringLiteral(source.replace('/src/', '/lib/'))]
    );

    // side effect import: import 'xxx';
    if (isSideEffectImport(metadata)) {
        let header = types.expressionStatement(loadExpr);
        header.loc = metadata.loc;
        headers.push(header);
    }
    else {
        const {localImportName, localImportDefaultName} = getLocalImportName(metadata);

        let reqHeader = types.variableDeclaration('var', [
            types.variableDeclarator(
                types.identifier(localImportName),
                loadExpr
            )
        ]);

        reqHeader.loc = metadata.loc;
        headers.push(reqHeader);

        if (!localImportDefaultName) {
            // src:
            //      import {someInZrUtil1 as someInZrUtil1Alias, zz} from 'zrender/core/util';
            // metadata.imports:
            //      Map { 'someInZrUtil1Alias' => 'someInZrUtil1', 'zz' => 'zz' }
            for (const importEntry of metadata.imports) {
                headers.push(
                    babelTemplate.statement(`var IMPORTNAME = NAMESPACE.PROPNAME;`)({
                        NAMESPACE: localImportName,
                        IMPORTNAME: importEntry[0],
                        PROPNAME: importEntry[1]
                    })
                );
            }
        }
    }

    return headers;
}

function getLocalImportName(metadata) {
    const localImportDefaultName = getDefaultName(metadata.imports);

    assert(
        !localImportDefaultName || metadata.imports.size === 1,
        'Forbiden that both import default and others.'
    );

    return {
        localImportName: localImportDefaultName || metadata.name,
        localImportDefaultName
    };
}

function getDefaultName(map) {
    for (const entry of map) {
        if (entry[1] === 'default') {
            return entry[0];
        }
    }
}

function buildLocalExportStatements(meta, checkExport) {
    let tails = [];

    // All local export, for example:
    // Map {
    // 'localVarMame' => {
    //      names: [ 'exportName1', 'exportName2' ],
    //      kind: 'var'
    // },
    for (const localEntry of meta.local) {
        for (const exportName of localEntry[1].names) {
            checkExport(exportName);
            tails.push(buildExport({exportName, localName: localEntry[0]}));
        }
    }

    return tails;
}

function createExportChecker() {
    let someHasBeenExported;
    return function checkExport(exportName) {
        assert(
            !someHasBeenExported || exportName !== 'default',
            `Forbiden that both export default and others.`
        );
        someHasBeenExported = true;
    };
}

function buildExport({exportName, namespace, propName, localName}) {
    const exportDefault = exportName === 'default';

    const head = exportDefault ? 'module.exports' : `exports.${exportName}`;

    let opt = {};
    // FIXME
    // Does `PRIORITY`, `LOCATION_PARAMS` recognised as babel-template placeholder?
    // We have to do this for workaround temporarily.
    if (/^[A-Z_]+$/.test(localName)) {
        opt[localName] = localName;
    }

    return babelTemplate.statement(
        localName
            ? `${head} = ${localName};`
            : `${head} = ${namespace}.${propName};`
    )(opt);
}
