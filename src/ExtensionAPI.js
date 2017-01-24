define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    var echartsAPIList = [
        'getDom', 'getZr', 'getWidth', 'getHeight', 'dispatchAction', 'isDisposed',
        'on', 'off', 'getDataURL', 'getConnectedDataURL', 'getModel', 'getOption'
    ];

    function ExtensionAPI(chartInstance) {
        zrUtil.each(echartsAPIList, function (name) {
            this[name] = zrUtil.bind(chartInstance[name], chartInstance);
        }, this);

        // Namespace used for extensions, including builtin components
        this._namespaces = {
            // Default echarts namespace
            echarts: {}
        };

        this._defaultNS = 'echarts';
    }

    var extensionProto = ExtensionAPI.prototype;

    /**
     * Create a namespace for extension or component
     * @param {string} ns
     */
    extensionProto.createNamespace = function (ns) {
        this._namespaces[ns] = {};
    };

    /**
     * Set default namespace
     * @param {string} ns
     */
    extensionProto.useNamespace = function (ns) {
        this._defaultNS = ns;
    };

    /**
     * Get value from namespace
     * @param {string} key
     * @param {string} [ns] Use default namespace defined by useNamespace
     */
    extensionProto.get = function (key, ns) {
        ns = ns || this._defaultNS;
        return this._namespaces[ns] && this._namespaces[ns][key];
    };

    /**
     * Put value to namespace
     * @param {string} key
     * @param {*} val
     * @param {string} [ns] Use default namespace defined by useNamespace
     */
    extensionProto.put = function (key, val, ns) {
        ns = ns || this._defaultNS;
        if (this._namespaces[ns]) {
            this._namespaces[ns][key] = val;
        }
    };

    /**
     * Dispose namespace
     * @param {string} key
     */
    extensionProto.disposeNamespace = function (ns) {
        delete this._namespaces[ns];
    };

    return ExtensionAPI;
});