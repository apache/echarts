/**
 * ESL (Enterprise Standard Loader)
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @file Browser端标准加载器，符合AMD规范
 * @author errorrik(errorrik@gmail.com)
 */

var define;
var require;

(function ( global ) {
    // "mod"开头的变量或函数为内部模块管理函数
    // 为提高压缩率，不使用function或object包装
    var require = createLocalRequire( '' );

    /**
     * 定义模块
     *
     * @param {string=} id 模块标识
     * @param {Array=} dependencies 依赖模块列表
     * @param {Function=} factory 创建模块的工厂方法
     */
    function define() {
        var argsLen = arguments.length;
        if ( !argsLen ) {
            return;
        }

        var id;
        var dependencies;
        var factory = arguments[ --argsLen ];

        while ( argsLen-- ) {
            var arg = arguments[ argsLen ];

            if ( typeof arg === 'string' ) {
                id = arg;
            }
            else if ( isArray( arg ) ) {
                dependencies = arg;
            }
        }

        // 出现window不是疏忽
        // esl设计是做为browser端的loader
        // 闭包的global更多意义在于：
        //     define和require方法可以被挂到用户自定义对象中
        var opera = window.opera;

        // IE下通过current script的data-require-id获取当前id
        if (
            !id
            && document.attachEvent
            && (!(opera && opera.toString() === '[object Opera]'))
        ) {
            var currentScript = getCurrentScript();
            id = currentScript && currentScript.getAttribute('data-require-id');
        }

        // 处理依赖声明
        // 默认为['require', 'exports', 'module']
        dependencies = dependencies || ['require', 'exports', 'module'];
        if ( id ) {
            modPreDefine( id, dependencies, factory );
        }
        else {
            // 纪录到共享变量中，在load或readystatechange中处理
            wait4PreDefines.push( {
                deps    : dependencies,
                factory : factory
            } );
        }
    }

    define.amd = {};

    /**
     * 模块容器
     *
     * @inner
     * @type {Object}
     */
    var modModules = {};

    var MODULE_STATE_PRE_DEFINED = 1;
    var MODULE_STATE_PRE_ANALYZED = 2;
    var MODULE_STATE_ANALYZED = 3;
    var MODULE_STATE_LOADED = 4;
    var MODULE_STATE_DEFINED = 5;

    /**
     * 获取相应状态的模块列表
     *
     * @inner
     * @param {number} state 状态码
     * @return {Array}
     */
    function modGetByState( state ) {
        var modules = [];
        for ( var key in modModules ) {
            var module = modModules[ key ];
            if ( module.state == state ) {
                modules.push( module );
            }
        }

        return modules;
    }

    /**
     * 预定义模块
     *
     * @inner
     * @param {string} id 模块标识
     * @param {Array.<string>} dependencies 显式声明的依赖模块列表
     * @param {*} factory 模块定义函数或模块对象
     */
    function modPreDefine( id, dependencies, factory ) {
        if ( modExists( id ) ) {
            return;
        }

        var module = {
            id       : id,
            deps     : dependencies,
            factory  : factory,
            exports  : {},
            hardDeps : [],
            softDeps : [],
            state    : MODULE_STATE_PRE_DEFINED
        };

        // 将模块预存入defining集合中
        modModules[ id ] = module;
    }

    /**
     * 预分析模块
     *
     * 首先，完成对factory中声明依赖的分析提取
     * 然后，尝试加载"资源加载所需模块"
     *
     * 需要先加载模块的原因是：如果模块不存在，无法进行resourceId normalize化
     * modAnalyse完成后续的依赖分析处理，并进行依赖模块的加载
     *
     * @inner
     * @param {Object} modules 模块对象
     */
    function modPreAnalyse() {
        var pluginModuleIds = [];
        var modules = modGetByState( MODULE_STATE_PRE_DEFINED );

        each(
            modules,
            function ( module ) {
                // 处理实际需要加载的依赖
                var realDepends = module.deps.slice( 0 );
                module.realDeps = realDepends;

                // 分析function body中的require
                // 如果包含显式依赖声明，为性能考虑，可以不分析factoryBody
                // AMD规范的说明是`SHOULD NOT`，所以这里还是分析了
                var factory = module.factory;
                var requireRule = /require\(\s*(['"'])([^'"]+)\1\s*\)/g;
                var commentRule = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;
                if ( typeof factory == 'function' ) {
                    factory.toString()
                        .replace( commentRule, '' )
                        .replace( requireRule, function ( $0, $1, $2 ) {
                            realDepends.push( $2 );
                        });
                }

                // 分析resource加载的plugin module id
                each(
                    realDepends,
                    function ( dependId ) {
                        var idInfo = parseId( dependId );
                        if ( idInfo.resource ) {
                            pluginModuleIds.push(
                                normalize( idInfo.module, module.id )
                            );
                        }
                    }
                );

                module.state = MODULE_STATE_PRE_ANALYZED;
            }
        );

        nativeRequire( pluginModuleIds, function () {
            modAnalyse( modules );
        } );
    }

    /**
     * 分析模块
     * 对所有依赖id进行normalize化，完成分析，并尝试加载其依赖的模块
     *
     * @inner
     * @param {Array} modules 模块对象列表
     */
    function modAnalyse( modules ) {
        var requireModules = [];

        each(
            modules,
            function ( module ) {
                var id = module.id;
                var realDepends = module.realDeps;
                var hardDepends = module.hardDeps;
                var softDepends = module.softDeps;

                // 对参数中声明的依赖进行normalize
                // 并且处理参数中声明依赖的循环依赖
                var hardDependsMap = {};
                var depends = module.deps;
                each(
                    depends,
                    function ( dependId, index ) {
                        dependId = normalize( dependId, id );
                        depends[ index ] = dependId;
                        if ( !hardDependsMap[ dependId ]
                             && !isInDependencyChain( id, dependId, 'hardDeps' )
                        ) {
                            hardDepends.push( dependId );
                            hardDependsMap[ dependId ] = 1;
                        }
                    }
                );

                // 依赖模块id normalize化，并去除必要的依赖。去除的依赖模块有：
                // 1. 内部模块：require/exports/module
                // 2. 重复模块：dependencies参数和内部require可能重复
                // 3. 空模块：dependencies中使用者可能写空
                var len = realDepends.length;
                var existsDepend = {};

                while ( len-- ) {
                    // 此处和上部分循环存在重复normalize，因为deps和realDeps是重复的
                    // 为保持逻辑分界清晰，就不做优化了先
                    var dependId = normalize( realDepends[ len ], id );
                    if ( !dependId
                         || dependId in existsDepend
                         || dependId in BUILDIN_MODULE
                    ) {
                        realDepends.splice( len, 1 );
                    }
                    else {
                        existsDepend[ dependId ] = 1;
                        realDepends[ len ] = dependId;
                        if ( !hardDependsMap[ dependId ] ) {
                            softDepends.unshift( dependId );
                        }

                        // 将实际依赖压入加载序列中，后续统一进行require
                        requireModules.push( dependId );
                    }
                }

                module.state = MODULE_STATE_ANALYZED;
                modWaitDependenciesLoaded( module );
            }
        );

        nativeRequire( requireModules );
    }

    /**
     * 等待模块依赖加载完成
     * 加载完成后尝试调用factory完成模块定义
     *
     * @inner
     * @param {Object} module 模块对象
     */
    function modWaitDependenciesLoaded( module ) {
        var id = module.id;

        // 内建模块
        var buildinModule = {
            require : createLocalRequire( id ),
            exports : module.exports,
            module  : module
        };

        modAddDefinedListener( invokeFactory );
        invokeFactory();

        /**
         * 判断依赖加载完成
         *
         * @inner
         * @return {boolean}
         */
        function isInvokeReady() {
            var isReady = 1;

            each(
                module.hardDeps,
                function ( depId ) {
                    isReady = depId in BUILDIN_MODULE
                        || modIsDefined( depId );
                    return !!isReady;
                }
            );

            isReady && each(
                module.softDeps,
                function ( depId ) {
                    isReady = depId in BUILDIN_MODULE
                        || modIsDefined( depId )
                        || isInDependencyChain( id, depId );
                    return !!isReady;
                }
            );

            isReady && ( module.state = MODULE_STATE_LOADED );
            return isReady;
        }

        /**
         * 初始化模块
         *
         * @inner
         */
        function invokeFactory() {
            if ( modIsDefined( id ) || !isInvokeReady() ) {
                return;
            }

            // 构造factory参数
            var args = [];
            each(
                module.deps,
                function ( moduleId, index ) {
                    args[ index ] =
                        buildinModule[ moduleId ]
                        || modGetModuleExports( moduleId );
                }
            );

            // 调用factory函数初始化module
            try {
                var factory = module.factory;
                var exports = typeof factory == 'function'
                    ? factory.apply( global, args )
                    : factory;

                if ( typeof exports != 'undefined' ) {
                    module.exports = exports;
                }
            }
            catch ( ex ) {
                if ( ex.message.indexOf( '[MODULE_MISS]' ) === 0 ) {
                    return;
                }

                throw ex;
            }

            module.state = MODULE_STATE_DEFINED;
            modRemoveDefinedListener( invokeFactory );

            modFireDefined( id );
        }
    }

    /**
     * 模块定义完成的事件监听器
     *
     * @inner
     * @type {Array}
     */
    var modDefinedListener = [];

    /**
     * 模块定义完成事件监听器的移除索引
     *
     * @inner
     * @type {Array}
     */
    var modRemoveListenerIndex = [];

    /**
     * 模块定义完成事件fire层级
     *
     * @inner
     * @type {number}
     */
    var modFireLevel = 0;

    /**
     * 派发模块定义完成事件
     *
     * @inner
     * @param {string} id 模块标识
     */
    function modFireDefined( id ) {
        modFireLevel++;
        each(
            modDefinedListener,
            function ( listener ) {
                listener && listener( id );
            }
        );
        modFireLevel--;

        modSweepDefinedListener();
    }

    /**
     * 清理模块定义完成事件监听器
     * modRemoveDefinedListener时只做标记
     * 在modFireDefined执行清除动作
     *
     * @inner
     * @param {Function} listener 模块定义监听器
     */
    function modSweepDefinedListener() {
        if ( modFireLevel < 1 ) {
            modRemoveListenerIndex.sort(
                function ( a, b ) { return b - a; }
            );

            each(
                modRemoveListenerIndex,
                function ( index ) {
                    modDefinedListener.splice( index, 1 );
                }
            );

            modRemoveListenerIndex = [];
        }
    }

    /**
     * 移除模块定义监听器
     *
     * @inner
     * @param {Function} listener 模块定义监听器
     */
    function modRemoveDefinedListener( listener ) {
        each(
            modDefinedListener,
            function ( item, index ) {
                if ( listener == item ) {
                    modRemoveListenerIndex.push( index );
                }
            }
        );
    }

    /**
     * 添加模块定义监听器
     *
     * @inner
     * @param {Function} listener 模块定义监听器
     */
    function modAddDefinedListener( listener ) {
        modDefinedListener.push( listener );
    }

    /**
     * 判断模块是否存在
     *
     * @inner
     * @param {string} id 模块标识
     * @return {boolean}
     */
    function modExists( id ) {
        return id in modModules;
    }

    /**
     * 判断模块是否已定义完成
     *
     * @inner
     * @param {string} id 模块标识
     * @return {boolean}
     */
    function modIsDefined( id ) {
        return modExists( id )
            && modModules[ id ].state == MODULE_STATE_DEFINED;
    }

    /**
     * 获取模块的exports
     *
     * @inner
     * @param {string} id 模块标识
     * @return {*}
     */
    function modGetModuleExports( id ) {
        if ( modExists( id ) ) {
            return modModules[ id ].exports;
        }

        return null;
    }

    /**
     * 获取模块
     *
     * @inner
     * @param {string} id 模块标识
     * @return {Object}
     */
    function modGetModule( id ) {
        return modModules[ id ];
    }

    /**
     * 添加资源
     *
     * @inner
     * @param {string} resourceId 资源标识
     * @param {*} value 资源对象
     */
    function modAddResource( resourceId, value ) {
        modModules[ resourceId ] = {
            exports: value || true,
            state: MODULE_STATE_DEFINED
        };

        modFireDefined( resourceId );
    }

    /**
     * 内建module名称集合
     *
     * @inner
     * @type {Object}
     */
    var BUILDIN_MODULE = {
        require : require,
        exports : 1,
        module  : 1
    };

    /**
     * 未预定义的模块集合
     * 主要存储匿名方式define的模块
     *
     * @inner
     * @type {Array}
     */
    var wait4PreDefines = [];

    /**
     * 完成模块预定义
     *
     * @inner
     */
    function completePreDefine( currentId ) {
        var preDefines = wait4PreDefines.slice( 0 );

        wait4PreDefines.length = 0;
        wait4PreDefines = [];

        // 预定义模块：
        // 此时处理的模块都是匿名define的模块
        each(
            preDefines,
            function ( module ) {
                var id = module.id || currentId;
                modPreDefine( id, module.deps, module.factory );
            }
        );

        modPreAnalyse();
    }

    /**
     * 判断source是否处于target的依赖链中
     *
     * @inner
     * @return {boolean}
     */
    function isInDependencyChain( source, target, depLevel, meet ) {
        depLevel = depLevel || 'realDeps';
        var module = modGetModule( target );
        var depends = module && module[ depLevel ];

        meet = meet || {};
        if ( meet[ target ] ) {
            return 0;
        }
        meet[ target ] = 1;

        if ( depends ) {
            var len = depends.length;

            while ( len-- ) {
                var dependId = depends[ len ];

                if ( source == dependId
                     || isInDependencyChain( source, dependId, depLevel, meet )
                ) {
                    return 1;
                }
            }
        }

        return 0;
    }

    /**
     * 获取模块
     *
     * @param {string|Array} ids 模块名称或模块名称列表
     * @param {Function=} callback 获取模块完成时的回调函数
     * @return {Object}
     */
    function nativeRequire( ids, callback, baseId ) {
        callback = callback || new Function();
        baseId = baseId || '';

        // 根据 https://github.com/amdjs/amdjs-api/wiki/require
        // It MUST throw an error if the module has not
        // already been loaded and evaluated.
        if ( typeof ids == 'string' ) {
            if ( !modIsDefined( ids ) ) {
                throw new Error( '[MODULE_MISS]' + ids + ' is not exists!' );
            }

            return modGetModuleExports( ids );
        }

        if ( !isArray( ids ) ) {
            return;
        }

        if ( ids.length === 0 ) {
            callback();
            return;
        }

        var isCallbackCalled = 0;
        modAddDefinedListener( tryFinishRequire );
        each(
            ids,
            function ( id ) {
                if ( id in BUILDIN_MODULE ) {
                    return;
                }

                ( id.indexOf( '!' ) > 0
                    ? loadResource
                    : loadModule
                )( id, baseId );
            }
        );

        tryFinishRequire();

        /**
         * 尝试完成require，调用callback
         * 在模块与其依赖模块都加载完时调用
         *
         * @inner
         */
        function tryFinishRequire() {
            if ( isCallbackCalled ) {
                return;
            }

            var visitedModule = {};

            /**
             * 判断是否所有模块都已经加载完成，包括其依赖的模块
             *
             * @inner
             * @param {Array} modules 直接模块标识列表
             * @return {boolean}
             */
            function isAllInited( modules ) {
                var allInited = 1;
                each(
                    modules,
                    function ( id ) {
                        if ( visitedModule[ id ] ) {
                            return;
                        }
                        visitedModule[ id ] = 1;

                        if ( BUILDIN_MODULE[ id ] ) {
                            return;
                        }

                        if (
                            !modIsDefined( id )
                            || !isAllInited( modGetModule( id ).realDeps )
                        ) {
                            allInited = 0;
                            return false;
                        }
                    }
                );

                return allInited;
            }

            // 检测并调用callback
            if ( isAllInited( ids ) ) {
                isCallbackCalled = 1;
                modRemoveDefinedListener( tryFinishRequire );

                var args = [];
                each(
                    ids,
                    function ( id ) {
                        args.push(
                            BUILDIN_MODULE[ id ]
                            || modGetModuleExports( id )
                        );
                    }
                );

                callback.apply( global, args );
            }
        }
    }

    /**
     * 正在加载的模块列表
     *
     * @inner
     * @type {Object}
     */
    var loadingModules = {};

    /**
     * 加载模块
     *
     * @inner
     * @param {string} moduleId 模块标识
     */
    function loadModule( moduleId ) {
        if (
            modExists( moduleId )
            || loadingModules[ moduleId ]
        ) {
            return;
        }

        loadingModules[ moduleId ] = 1;

        // 创建script标签
        var script = document.createElement( 'script' );
        script.setAttribute( 'data-require-id', moduleId );
        script.src = toUrl( moduleId ) + '.js';
        script.async = true;
        if ( script.readyState ) {
            script.onreadystatechange = loadedListener;
        }
        else {
            script.onload = loadedListener;
        }
        // TODO: onerror
        appendScript( script );

        /**
         * script标签加载完成的事件处理函数
         *
         * @inner
         */
        function loadedListener() {
            var readyState = script.readyState;
            if (
                typeof readyState == 'undefined'
                || /^(loaded|complete)$/.test( readyState )
            ) {
                script.onload = script.onreadystatechange = null;

                completePreDefine( moduleId );
                delete loadingModules[ moduleId ];
                script = null;
            }
        }
    }

    /**
     * 加载资源
     *
     * @inner
     * @param {string} pluginAndResource 插件与资源标识
     * @param {string} baseId 当前环境的模块标识
     */
    function loadResource( pluginAndResource, baseId ) {
        var idInfo = parseId( pluginAndResource );
        var pluginId = idInfo.module;
        var resourceId = idInfo.resource;

        /**
         * plugin加载完成的回调函数
         *
         * @inner
         * @param {*} value resource的值
         */
        function pluginOnload( value ) {
            modAddResource( pluginAndResource, value );
        }

        /**
         * 该方法允许plugin使用加载的资源声明模块
         *
         * @param {string} name 模块id
         * @param {string} body 模块声明字符串
         */
        pluginOnload.fromText = function ( id, text ) {
            new Function( text )();
            completePreDefine( id );
        };

        /**
         * 加载资源
         *
         * @inner
         * @param {Object} plugin 用于加载资源的插件模块
         */
        function load( plugin ) {
            if ( !modIsDefined( pluginAndResource ) ) {
                plugin.load(
                    resourceId,
                    createLocalRequire( baseId ),
                    pluginOnload,
                    {}
                );
            }
        }

        if ( !modIsDefined( pluginId ) ) {
            nativeRequire( [ pluginId ], load );
        }
        else {
            load( modGetModuleExports( pluginId ) );
        }
    }

    /**
     * require配置
     *
     * @inner
     * @type {Object}
     */
    var requireConf = {
        baseUrl  : './',
        paths    : {},
        config   : {},
        map      : {},
        packages : []
    };

    /**
     * 混合当前配置项与用户传入的配置项
     *
     * @inner
     * @param {string} name 配置项名称
     * @param {Any} value 用户传入配置项的值
     */
    function mixConfig( name, value ) {
        var originValue = requireConf[ name ];
        if ( typeof originValue == 'string' ) {
            requireConf[ name ] = value;
        }
        else if ( isArray( originValue ) ) {
            each( value, function ( item ) {
                originValue.push( item );
            } );
        }
        else {
            for ( var key in value ) {
                originValue[ key ] = value[ key ];
            }
        }
    }

    /**
     * 配置require
     *
     * @param {Object} conf 配置对象
     */
    require.config = function ( conf ) {
        // 简单的多处配置还是需要支持
        // 所以实现更改为二级mix
        for ( var key in requireConf ) {
            if ( conf.hasOwnProperty( key ) ) {
                mixConfig( key, conf[ key ] );
            }
        }

        createConfIndex();
    };

    // 初始化时需要创建配置索引
    createConfIndex();

    /**
     * 创建配置信息内部索引
     *
     * @inner
     */
    function createConfIndex() {
        requireConf.baseUrl = requireConf.baseUrl.replace( /\/$/, '' ) + '/';
        createPathsIndex();
        createMappingIdIndex();
        createPackagesIndex();
    }

    /**
     * packages内部索引
     *
     * @inner
     * @type {Array}
     */
    var packagesIndex;

    /**
     * 创建packages内部索引
     *
     * @inner
     */
    function createPackagesIndex() {
        packagesIndex = [];
        each(
            requireConf.packages,
            function ( packageConf ) {
                var pkg = packageConf;
                if ( typeof packageConf == 'string' ) {
                    pkg = {
                        name: packageConf.split('/')[ 0 ],
                        location: packageConf,
                        main: 'main'
                    };
                }

                pkg.location = pkg.location || pkg.name;
                pkg.main = (pkg.main || 'main').replace(/\.js$/i, '');
                packagesIndex.push( pkg );
            }
        );

        packagesIndex.sort( createDescSorter( 'name' ) );
    }

    /**
     * paths内部索引
     *
     * @inner
     * @type {Array}
     */
    var pathsIndex;

    /**
     * 创建paths内部索引
     *
     * @inner
     */
    function createPathsIndex() {
        pathsIndex = kv2List( requireConf.paths );
        pathsIndex.sort( createDescSorter() );
    }

    /**
     * mapping内部索引
     *
     * @inner
     * @type {Array}
     */
    var mappingIdIndex;

    /**
     * 创建mapping内部索引
     *
     * @inner
     */
    function createMappingIdIndex() {
        mappingIdIndex = [];

        mappingIdIndex = kv2List( requireConf.map );
        mappingIdIndex.sort( createDescSorter() );

        each(
            mappingIdIndex,
            function ( item ) {
                var key = item.k;
                item.v = kv2List( item.v );
                item.v.sort( createDescSorter() );
                item.reg = key == '*'
                    ? /^/
                    : createPrefixRegexp( key );
            }
        );
    }

    /**
     * 将模块标识转换成相对baseUrl的url
     *
     * @inner
     * @param {string} id 模块标识
     * @return {string}
     */
    function toUrl( id ) {
        if ( !MODULE_ID_REG.test( id ) ) {
            return id;
        }

        var url = id;
        var isPathMap = 0;

        each( pathsIndex, function ( item ) {
            var key = item.k;
            if ( createPrefixRegexp( key ).test( url ) ) {
                url = url.replace( key, item.v );
                isPathMap = 1;
                return false;
            }
        } );

        if ( !isPathMap ) {
            each(
                packagesIndex,
                function ( packageConf ) {
                    var name = packageConf.name;
                    if ( createPrefixRegexp( name ).test( id ) ) {
                        url = url.replace( name, packageConf.location );
                        return false;
                    }
                }
            );
        }

        if ( !/^([a-z]{2,10}:\/)?\//i.test( url ) ) {
            url = requireConf.baseUrl + url;
        }

        return url;
    }

    /**
     * 创建local require函数
     *
     * @inner
     * @param {number} baseId 当前module id
     * @return {Function}
     */
    function createLocalRequire( baseId ) {
        var requiredCache = {};
        function req( requireId, callback ) {
            if ( typeof requireId == 'string' ) {
                var requiredModule;
                if ( !( requiredModule = requiredCache[ requireId ] ) ) {
                    requiredModule = nativeRequire(
                        normalize( requireId, baseId ),
                        callback,
                        baseId
                    );
                    requiredCache[ requireId ] = requiredModule;
                }

                return requiredModule;
            }
            else if ( isArray( requireId ) ) {
                // 分析是否有resource使用的plugin没加载
                var unloadedPluginModules = [];
                each(
                    requireId,
                    function ( id ) {
                        var idInfo = parseId( id );
                        var pluginId = normalize( idInfo.module, baseId );
                        if ( idInfo.resource && !modIsDefined( pluginId ) ) {
                            unloadedPluginModules.push( pluginId );
                        }
                    }
                );

                // 加载模块
                nativeRequire(
                    unloadedPluginModules,
                    function () {
                        var ids = [];
                        each(
                            requireId,
                            function ( id ) {
                                ids.push( normalize( id, baseId ) );
                            }
                        );
                        nativeRequire( ids, callback, baseId );
                    },
                    baseId
                );
            }
        }

        /**
         * 将[module ID] + '.extension'格式的字符串转换成url
         *
         * @inner
         * @param {string} source 符合描述格式的源字符串
         * @return {string}
         */
        req.toUrl = function ( id ) {
            return toUrl( normalize( id, baseId ) );
        };

        return req;
    }



    /**
     * id normalize化
     *
     * @inner
     * @param {string} id 需要normalize的模块标识
     * @param {string} baseId 当前环境的模块标识
     * @return {string}
     */
    function normalize( id, baseId ) {
        if ( !id ) {
            return '';
        }

        var idInfo = parseId( id );
        if ( !idInfo ) {
            return id;
        }

        var resourceId = idInfo.resource;
        var moduleId = relative2absolute( idInfo.module, baseId );

        each(
            packagesIndex,
            function ( packageConf ) {
                var name = packageConf.name;
                var main = name + '/' + packageConf.main;
                if ( name == moduleId
                ) {
                    moduleId = moduleId.replace( name, main );
                    return false;
                }
            }
        );

        moduleId = mappingId( moduleId, baseId );

        if ( resourceId ) {
            var module = modGetModuleExports( moduleId );
            resourceId = module.normalize
                ? module.normalize(
                    resourceId,
                    function ( resId ) {
                        return normalize( resId, baseId );
                    }
                  )
                : normalize( resourceId, baseId );

            return moduleId + '!' + resourceId;
        }

        return moduleId;
    }

    /**
     * 相对id转换成绝对id
     *
     * @inner
     * @param {string} id 要转换的id
     * @param {string} baseId 当前所在环境id
     * @return {string}
     */
    function relative2absolute( id, baseId ) {
        if ( /^\.{1,2}/.test( id ) ) {
            var basePath = baseId.split( '/' );
            var namePath = id.split( '/' );
            var baseLen = basePath.length - 1;
            var nameLen = namePath.length;
            var cutBaseTerms = 0;
            var cutNameTerms = 0;

            pathLoop: for ( var i = 0; i < nameLen; i++ ) {
                var term = namePath[ i ];
                switch ( term ) {
                    case '..':
                        if ( cutBaseTerms < baseLen ) {
                            cutBaseTerms++;
                            cutNameTerms++;
                        }
                        else {
                            break pathLoop;
                        }
                        break;
                    case '.':
                        cutNameTerms++;
                        break;
                    default:
                        break pathLoop;
                }
            }

            basePath.length = baseLen - cutBaseTerms;
            namePath = namePath.slice( cutNameTerms );

            basePath.push.apply( basePath, namePath );
            return basePath.join( '/' );
        }

        return id;
    }

    /**
     * 模块id正则
     *
     * @const
     * @inner
     * @type {RegExp}
     */
    var MODULE_ID_REG = /^[-_a-z0-9\.]+(\/[-_a-z0-9\.]+)*$/i;

    /**
     * 解析id，返回带有module和resource属性的Object
     *
     * @inner
     * @param {string} id 标识
     * @return {Object}
     */
    function parseId( id ) {
        var segs = id.split( '!' );

        if ( MODULE_ID_REG.test( segs[ 0 ] ) ) {
            return {
                module   : segs[ 0 ],
                resource : segs[ 1 ] || ''
            };
        }

        return null;
    }

    /**
     * 基于map配置项的id映射
     *
     * @inner
     * @param {string} id 模块id
     * @param {string} baseId 当前环境的模块id
     * @return {string}
     */
    function mappingId( id, baseId ) {
        each(
            mappingIdIndex,
            function ( item ) {
                if ( item.reg.test( baseId ) ) {

                    each( item.v, function ( mapData ) {
                        var key = mapData.k;
                        var rule = createPrefixRegexp( key );

                        if ( rule.test( id ) ) {
                            id = id.replace( key, mapData.v );
                            return false;
                        }
                    } );

                    return false;
                }
            }
        );

        return id;
    }

    /**
     * 将对象数据转换成数组，数组每项是带有k和v的Object
     *
     * @inner
     * @param {Object} source 对象数据
     * @return {Array.<Object>}
     */
    function kv2List( source ) {
        var list = [];
        for ( var key in source ) {
            if ( source.hasOwnProperty( key ) ) {
                list.push( {
                    k: key,
                    v: source[ key ]
                } );
            }
        }

        return list;
    }

    // 感谢requirejs，通过currentlyAddingScript兼容老旧ie
    //
    // For some cache cases in IE 6-8, the script executes before the end
    // of the appendChild execution, so to tie an anonymous define
    // call to the module name (which is stored on the node), hold on
    // to a reference to this node, but clear after the DOM insertion.
    var currentlyAddingScript;
    var interactiveScript;

    /**
     * 获取当前script标签
     * 用于ie下define未指定module id时获取id
     *
     * @inner
     * @return {HTMLDocument}
     */
    function getCurrentScript() {
        if ( currentlyAddingScript ) {
            return currentlyAddingScript;
        }
        else if (
            interactiveScript
            && interactiveScript.readyState == 'interactive'
        ) {
            return interactiveScript;
        }
        else {
            var scripts = document.getElementsByTagName( 'script' );
            var scriptLen = scripts.length;
            while ( scriptLen-- ) {
                var script = scripts[ scriptLen ];
                if ( script.readyState == 'interactive' ) {
                    interactiveScript = script;
                    return script;
                }
            }
        }
    }

    /**
     * 向页面中插入script标签
     *
     * @inner
     * @param {HTMLScriptElement} script script标签
     */
    function appendScript( script ) {
        currentlyAddingScript = script;

        var doc = document;
        (doc.getElementsByTagName('head')[0] || doc.body).appendChild( script );

        currentlyAddingScript = null;
    }

    /**
     * 创建id前缀匹配的正则对象
     *
     * @inner
     * @param {string} prefix id前缀
     * @return {RegExp}
     */
    function createPrefixRegexp( prefix ) {
        return new RegExp( '^' + prefix + '(/|$)' );
    }

    /**
     * 判断对象是否数组类型
     *
     * @inner
     * @param {*} obj 要判断的对象
     * @return {boolean}
     */
    function isArray( obj ) {
        return obj instanceof Array;
    }

    /**
     * 循环遍历数组集合
     *
     * @inner
     * @param {Array} source 数组源
     * @param {function(Array,Number):boolean} iterator 遍历函数
     */
    function each( source, iterator ) {
        if ( isArray( source ) ) {
            for ( var i = 0, len = source.length; i < len; i++ ) {
                if ( iterator( source[ i ], i ) === false ) {
                    break;
                }
            }
        }
    }

    /**
     * 创建数组字符数逆序排序函数
     *
     * @inner
     * @param {string} property 数组项对象名
     * @return {Function}
     */
    function createDescSorter( property ) {
        property = property || 'k';

        return function ( a, b ) {
            var aValue = a[ property ];
            var bValue = b[ property ];

            if ( bValue == '*' ) {
                return -1;
            }

            if ( aValue == '*' ) {
                return 1;
            }

            return bValue.length - aValue.length;
        };
    }

    // 暴露全局对象
    global.define = define;
    global.require = require;
})( this );