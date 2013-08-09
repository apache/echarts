/**
 * ESL (Enterprise Standard Loader)
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * @file Browser端标准加载器，符合AMD规范
 * @author errorrik(errorrik@gmail.com)
 *         Firede(firede@firede.us)
 */

var define;
var require;

(function ( global ) {
    // "mod"开头的变量或函数为内部模块管理函数
    // 为提高压缩率，不使用function或object包装
    
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
    var MODULE_STATE_READY = 4;
    var MODULE_STATE_DEFINED = 5;

    /**
     * 全局require函数
     * 
     * @inner
     * @type {Function}
     */
    var actualGlobalRequire = createLocalRequire( '' );

    /**
     * 超时提醒定时器
     * 
     * @inner
     * @type {number}
     */
    var waitTimeout;

    /**
     * 加载模块
     * 
     * @param {string|Array} requireId 模块id或模块id数组，
     * @param {Function=} callback 加载完成的回调函数
     * @return {*}
     */
    function require( requireId, callback ) {
        assertNotContainRelativeId( requireId );
        
        // 超时提醒
        var timeout = requireConf.waitSeconds;
        if ( isArray( requireId ) && timeout ) {
            if ( waitTimeout ) {
                clearTimeout( waitTimeout );
            }
            waitTimeout = setTimeout( waitTimeoutNotice, timeout * 1000 );
        }

        return actualGlobalRequire( requireId, callback );
    }

    /**
     * 将模块标识转换成相对的url
     * 
     * @param {string} id 模块标识
     * @return {string}
     */
    require.toUrl = toUrl;

    /**
     * 超时提醒函数
     * 
     * @inner
     */
    function waitTimeoutNotice() {
        var hangModules = [];
        var missModules = [];
        var missModulesMap = {};
        var hasError;

        for ( var id in modModules ) {
            if ( !modIsDefined( id ) ) {
                hangModules.push( id );
                hasError = 1;
            }

            each(
                modModules[ id ].realDeps || [],
                function ( depId ) {
                    if ( !modModules[ depId ] && !missModulesMap[ depId ] ) {
                        hasError = 1;
                        missModules.push( depId );
                        missModulesMap[ depId ] = 1;
                    }
                }
            );
        }

        if ( hasError ) {
            throw new Error( '[MODULE_TIMEOUT]Hang( ' 
                + ( hangModules.join( ', ' ) || 'none' )
                + ' ) Miss( '
                + ( missModules.join( ', ' ) || 'none' )
                + ' )'
            );
        }
    }

    /**
     * 尝试完成模块定义的定时器
     * 
     * @inner
     * @type {number}
     */
    var tryDefineTimeout;

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

            if ( isString( arg ) ) {
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

            // 在不远的未来尝试完成define
            // define可能是在页面中某个地方调用，不一定是在独立的文件被require装载
            if ( tryDefineTimeout ) {
                clearTimeout( tryDefineTimeout );
            }
            tryDefineTimeout = setTimeout( modPreAnalyse, 10 );
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
     * 模块配置获取函数
     * 
     * @inner
     * @return {Object} 模块配置对象
     */
    function moduleConfigGetter() {
        var conf = requireConf.config[ this.id ];
        if ( conf && typeof conf === 'object' ) {
            return conf;
        }

        return {};
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
            config   : moduleConfigGetter,
            state    : MODULE_STATE_PRE_DEFINED,
            hardDeps : {}
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
        var pluginModuleIdsMap = {};
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
                if ( isFunction( factory ) ) {
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
                            var plugId = normalize( idInfo.module, module.id );
                            if ( !pluginModuleIdsMap[ plugId ] ) {
                                pluginModuleIds.push( plugId );
                                pluginModuleIdsMap[ plugId ] = 1;
                            }
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
                if ( module.state !== MODULE_STATE_PRE_ANALYZED ) {
                    return;
                }

                var id = module.id;

                // 对参数中声明的依赖进行normalize
                var depends = module.deps;
                var hardDepends = module.hardDeps;
                var hardDependsCount = isFunction( module.factory )
                    ? module.factory.length
                    : 0;

                each(
                    depends,
                    function ( dependId, index ) {
                        dependId = normalize( dependId, id );
                        depends[ index ] = dependId;

                        if ( index < hardDependsCount ) {
                            hardDepends[ dependId ] = 1;
                        }
                    }
                );

                // 依赖模块id normalize化，并去除必要的依赖。去除的依赖模块有：
                // 1. 内部模块：require/exports/module
                // 2. 重复模块：dependencies参数和内部require可能重复
                // 3. 空模块：dependencies中使用者可能写空
                var realDepends = module.realDeps;
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

                        // 将实际依赖压入加载序列中，后续统一进行require
                        requireModules.push( dependId );
                    }
                }

                module.realDepsIndex = existsDepend;
                module.state = MODULE_STATE_ANALYZED;

                modWaitDependenciesLoaded( module );
                modInvokeFactoryDependOn( id );
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

        module.invokeFactory = invokeFactory;
        invokeFactory();

        // 用于避免死依赖链的死循环尝试
        var checkingLevel = 0;

        /**
         * 判断依赖加载完成
         * 
         * @inner
         * @return {boolean}
         */
        function checkInvokeReadyState() {
            checkingLevel++;

            var isReady = 1;
            var tryDeps = [];

            each(
                module.realDeps,
                function ( depId ) {
                    if ( !modIsAnalyzed( depId ) ) {
                        isReady = 0;
                    }
                    else if ( !modIsDefined( depId ) ) {
                        switch ( modHasCircularDependency( id, depId ) ) {
                            case CIRCULAR_DEP_UNREADY:
                            case CIRCULAR_DEP_NO:
                                isReady = 0;
                                break;
                            case CIRCULAR_DEP_YES:
                                if ( module.hardDeps[ depId ] ) {
                                    tryDeps.push( depId );
                                }
                                break;
                        }
                    }
                    
                    return !!isReady;
                }
            );

            
            // 只有当其他非循环依赖都装载了，才去尝试触发硬依赖模块的初始化
            isReady && each(
                tryDeps,
                function ( depId ) {
                    modTryInvokeFactory( depId );
                }
            );

            isReady = isReady && tryDeps.length === 0;
            isReady && (module.state = MODULE_STATE_READY);

            checkingLevel--;
            return isReady;
        }

        /**
         * 初始化模块
         * 
         * @inner
         */
        function invokeFactory() {
            if ( module.state == MODULE_STATE_DEFINED 
                || checkingLevel > 1
                || !checkInvokeReadyState()
            ) {
                return;
            }

            // 调用factory函数初始化module
            try {
                var factory = module.factory;
                var exports = isFunction( factory )
                    ? factory.apply( 
                        global, 
                        modGetModulesExports( 
                            module.deps, 
                            {
                                require : createLocalRequire( id ),
                                exports : module.exports,
                                module  : module
                            } 
                        ) 
                    )
                    : factory;

                if ( typeof exports != 'undefined' ) {
                    module.exports = exports;
                }

                module.state = MODULE_STATE_DEFINED;
                module.invokeFactory = null;
            } 
            catch ( ex ) {
                if ( /^\[MODULE_MISS\]"([^"]+)/.test( ex.message ) ) {
                    // 出错说明在factory的运行中，该require的模块是需要的
                    // 所以把它加入硬依赖中
                    module.hardDeps[ RegExp.$1 ] = 1;
                    return;
                }

                throw ex;
            }
            
            
            modInvokeFactoryDependOn( id );
            modFireDefined( id );
        }
    }

    /**
     * 根据模块id数组，获取其的exports数组
     * 用于模块初始化的factory参数或require的callback参数生成
     * 
     * @inner
     * @param {Array} modules 模块id数组
     * @param {Object} buildinModules 内建模块对象
     * @return {Array}
     */
    function modGetModulesExports( modules, buildinModules ) {
        var args = [];
        each( 
            modules,
            function ( moduleId, index ) {
                args[ index ] = 
                    buildinModules[ moduleId ]
                    || modGetModuleExports( moduleId );
            } 
        );

        return args;
    }

    var CIRCULAR_DEP_UNREADY = 0;
    var CIRCULAR_DEP_NO = 1;
    var CIRCULAR_DEP_YES = 2;

    /**
     * 判断source是否处于target的依赖链中
     *
     * @inner
     * @return {number}
     */
    function modHasCircularDependency( source, target, meet ) {
        if ( !modIsAnalyzed( target ) ) {
            return CIRCULAR_DEP_UNREADY;
        }

        meet = meet || {};
        meet[ target ] = 1;
        
        if ( target == source ) {
            return CIRCULAR_DEP_YES;
        }

        var module = modGetModule( target );
        var depends = module && module.realDeps;
        
        
        if ( depends ) {
            var len = depends.length;

            while ( len-- ) {
                var dependId = depends[ len ];
                if ( meet[ dependId ] ) { 
                    continue;
                }

                var state = modHasCircularDependency( source, dependId, meet );
                switch ( state ) {
                    case CIRCULAR_DEP_UNREADY:
                    case CIRCULAR_DEP_YES:
                        return state;
                }
            }
        }

        return CIRCULAR_DEP_NO;
    }

    /**
     * 让依赖自己的模块尝试初始化
     * 
     * @inner
     * @param {string} id 模块id
     */
    function modInvokeFactoryDependOn( id ) {
        for ( var key in modModules ) {
            var realDeps = modModules[ key ].realDepsIndex || {};
            realDeps[ id ] && modTryInvokeFactory( key );
        }
    }

    /**
     * 尝试执行模块factory函数，进行模块初始化
     * 
     * @inner
     * @param {string} id 模块id
     */
    function modTryInvokeFactory( id ) {
        var module = modModules[ id ];

        if ( module && module.invokeFactory ) {
            module.invokeFactory();
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
     * 判断模块是否已分析完成
     * 
     * @inner
     * @param {string} id 模块标识
     * @return {boolean}
     */
    function modIsAnalyzed( id ) {
        return modExists( id ) 
            && modModules[ id ].state >= MODULE_STATE_ANALYZED;
    }

    /**
     * 获取模块的exports
     * 
     * @inner
     * @param {string} id 模块标识
     * @return {*}
     */
    function modGetModuleExports( id ) {
        if ( modIsDefined( id ) ) {
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

        modInvokeFactoryDependOn( resourceId );
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
        if ( isString( ids ) ) {
            if ( !modIsDefined( ids ) ) {
                throw new Error( '[MODULE_MISS]"' + ids + '" is not exists!' );
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

                callback.apply( 
                    global, 
                    modGetModulesExports( ids, BUILDIN_MODULE )
                );
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
        if ( loadingModules[ moduleId ] ) {
            return;
        }
        
        if ( modExists( moduleId ) ) {
            modAnalyse( [ modGetModule( moduleId ) ] );
            return;
        }
        
        loadingModules[ moduleId ] = 1;

        // 创建script标签
        // 
        // 这里不挂接onerror的错误处理
        // 因为高级浏览器在devtool的console面板会报错
        // 再throw一个Error多此一举了
        var script = document.createElement( 'script' );
        script.setAttribute( 'data-require-id', moduleId );
        script.src = toUrl( moduleId ) ;
        script.async = true;
        if ( script.readyState ) {
            script.onreadystatechange = loadedListener;
        }
        else {
            script.onload = loadedListener;
        }
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
                script = null;

                completePreDefine( moduleId );
                delete loadingModules[ moduleId ];
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
                    moduleConfigGetter.call( { id: pluginAndResource } )
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
        baseUrl     : './',
        paths       : {},
        config      : {},
        map         : {},
        packages    : [],
        waitSeconds : 0,
        urlArgs     : {}
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
        var type = typeof originValue;
        if ( type == 'string' || type == 'number' ) {
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
                var confItem = conf[ key ];
                if ( key == 'urlArgs' && isString( confItem ) ) {
                    defaultUrlArgs = confItem;
                }
                else {
                    mixConfig( key, confItem );
                }
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
        createUrlArgsIndex();
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
                if ( isString( packageConf ) ) {
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
     * 默认的urlArgs
     * 
     * @inner
     * @type {string}
     */
    var defaultUrlArgs;

    /**
     * urlArgs内部索引
     * 
     * @inner
     * @type {Array}
     */
    var urlArgsIndex;

    /**
     * 创建urlArgs内部索引
     * 
     * @inner
     */
    function createUrlArgsIndex() {
        urlArgsIndex = kv2List( requireConf.urlArgs );
        urlArgsIndex.sort( createDescSorter() );
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
     * 将`模块标识+'.extension'`形式的字符串转换成相对的url
     * 
     * @inner
     * @param {string} source 源字符串
     * @return {string}
     */
    function toUrl( source ) {
        // 分离 模块标识 和 .extension
        var extReg = /(\.[a-z0-9]+)$/i;
        var queryReg = /(\?[^#]*)$/i;
        var extname = '.js';
        var id = source;
        var query = '';

        if ( queryReg.test( source ) ) {
            query = RegExp.$1;
            source = source.replace( queryReg, '' );
        }

        if ( extReg.test( source ) ) {
            extname = RegExp.$1;
            id = source.replace( extReg, '' );
        }

        // 模块标识合法性检测
        if ( !MODULE_ID_REG.test( id ) ) {
            return source;
        }
        
        var url = id;

        // paths处理和匹配
        var isPathMap;
        each( pathsIndex, function ( item ) {
            var key = item.k;
            if ( createPrefixRegexp( key ).test( id ) ) {
                url = url.replace( key, item.v );
                isPathMap = 1;
                return false;
            }
        } );

        // packages处理和匹配
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

        // 相对路径时，附加baseUrl
        if ( !/^([a-z]{2,10}:\/)?\//i.test( url ) ) {
            url = requireConf.baseUrl + url;
        }

        // 附加 .extension 和 query
        url += extname + query;


        var isUrlArgsAppended;

        /**
         * 为url附加urlArgs
         * 
         * @inner
         * @param {string} args urlArgs串
         */
        function appendUrlArgs( args ) {
            if ( !isUrlArgsAppended ) {
                url += ( url.indexOf( '?' ) > 0 ? '&' : '?' ) + args;
                isUrlArgsAppended = 1;
            }
        }
        
        // urlArgs处理和匹配
        each( urlArgsIndex, function ( item ) {
            if ( createPrefixRegexp( item.k ).test( id ) ) {
                appendUrlArgs( item.v );
                return false;
            }
        } );
        defaultUrlArgs && appendUrlArgs( defaultUrlArgs );

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
            if ( isString( requireId ) ) {
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
            resourceId = module && module.normalize
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
     * 确定require的模块id不包含相对id。用于global require，提前预防难以跟踪的错误出现
     * 
     * @inner
     * @param {string|Array} requireId require的模块id
     */
    function assertNotContainRelativeId( requireId ) {
        var invalidIds = [];

        /**
         * 监测模块id是否relative id
         * 
         * @inner
         * @param {string} id 模块id
         */
        function monitor( id ) {
            if ( /^\.{1,2}/.test( id ) ) {
                invalidIds.push( id );
            }
        }

        if ( isString( requireId ) ) {
            monitor( requireId );
        }
        else {
            each( 
                requireId, 
                function ( id ) {
                    monitor( id );
                }
            );
        }

        // 包含相对id时，直接抛出错误
        if ( invalidIds.length > 0 ) {
            throw new Error(
                '[REQUIRE_FATAL]Relative ID is not allowed in global require: ' 
                + invalidIds.join( ', ' )
            );
        }
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
     * 判断对象是否函数类型
     * 
     * @inner
     * @param {*} obj 要判断的对象
     * @return {boolean}
     */
    function isFunction( obj ) {
        return typeof obj == 'function';
    }

    /**
     * 判断是否字符串
     * 
     * @inner
     * @param {*} obj 要判断的对象
     * @return {boolean}
     */
    function isString( obj ) {
        return typeof obj == 'string';
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
