/**
 * Component model
 *
 * @module echarts/model/Component
 */
define(function(require) {

    'use strict';

    var Model = require('./Model');
    var zrUtil = require('zrender/core/util');

    /**
     * Component model classes
     * @type {Object}
     */
    var componentModelClasses = {};

    /**
     * key: conponentType,
     * value: {
     *     predecessor: [conponentTypes...]
     *     successor: [conponentTypes...]
     * }
     * @type {Object}
     */
    var dependencyGraph = {};

    /**
     * @alias module:echarts/model/Component
     * @constructor
     * @param {Object} option
     * @param {module:echarts/model/Model} parentModel
     * @param {module:echarts/model/Model} ecModel
     */
    var ComponentModel = Model.extend({

        type: 'component',

        /**
         * @type {Object}
         * @protected
         */
        defaultOption: null,

        init: function (option, parentModel, ecModel) {
            this.mergeDefaultAndTheme(option, ecModel);
        },

        mergeDefaultAndTheme: function (option, ecModel) {
            zrUtil.merge(option, ecModel.getTheme().get(this.type));
            zrUtil.merge(option, this.defaultOption);
        }
    });

    ComponentModel.extend = function (opts) {

        var SubComponentModel = Model.extend.call(this, opts);

        var componentType = opts.type;
        if (componentType) {
            if (componentModelClasses[componentType]) {
                throw new Error('Component model "' + componentType + '" exists.');
            }
            componentModelClasses[componentType] = SubComponentModel;

            initDepndency(opts);
        }
        return SubComponentModel;
    };

    ComponentModel.create = function (name, option, ecModel) {
        if (componentModelClasses[name]) {
            return new componentModelClasses[name](option, null, ecModel);
        }
    };

    ComponentModel.has = function (name) {
        return !!componentModelClasses[name];
    };

    /**
     * Topological travel on Activity Network (Activity On Vertices).
     *
     * @public
     * @param {Array.<string>} componentTypeList Target Component type list.
     * @param {Function} callback Params: componentType, depends.
     */
    ComponentModel.topologicalTavel = function (componentTypeList, callback) {
        if (!componentTypeList.length) {
            return;
        }
        var stack = [];
        var enterCount = [];

        zrUtil.each(dependencyGraph, function (vertex, componentType) {
            enterCount[componentType] = vertex.predecessor.length;
            if (enterCount[componentType] === 0) {
                stack.push(componentType);
            }
        });

        if (!stack.length) {
            throw new Error('Circle exists in dependency graph.');
        }

        while (stack.length) {
            var currComponentType = stack.pop();
            var currVertex = dependencyGraph[currComponentType];
            callback(currComponentType, currVertex.predecessor.slice());
            zrUtil.each(currVertex.successor, removeEdge);
        }

        function removeEdge(succComponentType) {
            enterCount[succComponentType]--;
            if (enterCount[succComponentType] === 0) {
                stack.push(succComponentType);
            }
        }
    };

    function initDepndency(opts) {
        var currComponentType = opts.type;
        var thisItem = createDependencyMapItem(currComponentType);

        zrUtil.each(opts.depends || [], function (depComponentType) {
            if (zrUtil.indexOf(thisItem.predecessor, depComponentType) < 0) {
                thisItem.predecessor.push(depComponentType);
            }
            var thatItem = createDependencyMapItem(depComponentType);
            if (zrUtil.indexOf(thatItem.successor, depComponentType) < 0) {
                thatItem.successor.push(currComponentType);
            }
        });
    }

    function createDependencyMapItem(componentType) {
        if (!dependencyGraph[componentType]) {
            dependencyGraph[componentType] = {predecessor: [], successor: []};
        }
        return dependencyGraph[componentType];
    }

    return ComponentModel;
});