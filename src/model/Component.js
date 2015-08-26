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
    ComponentModel.topologicalTavel = function (componentTypeList, callback, scope) {
        if (!componentTypeList.length) {
            return;
        }
        var dependencyGraph = makeDepndencyGraph(componentTypeList);
        var stack = [];
        var entryCount = [];

        zrUtil.each(componentTypeList, function (componentType) {
            entryCount[componentType] = dependencyGraph[componentType].predecessor.length;
            if (entryCount[componentType] === 0) {
                stack.push(componentType);
            }
        });

        if (!stack.length) {
            throw new Error('Circle exists in dependency graph.');
        }

        while (stack.length) {
            var currComponentType = stack.pop();
            var currVertex = dependencyGraph[currComponentType];
            callback.call(scope, currComponentType, currVertex.predecessor.slice());
            zrUtil.each(currVertex.successor, removeEdge);
        }

        function removeEdge(succComponentType) {
            entryCount[succComponentType]--;
            if (entryCount[succComponentType] === 0) {
                stack.push(succComponentType);
            }
        }
    };

    /**
     * DepndencyGraph: {Object}
     * key: conponentType,
     * value: {
     *     predecessor: [conponentTypes...]
     *     successor: [conponentTypes...]
     * }
     */
    function makeDepndencyGraph(componentTypeList) {
        var dependencyGraph = {};

        zrUtil.each(componentTypeList, function (componentType) {
            var thisItem = createDependencyGraphItem(dependencyGraph, componentType);
            var ModelClass = componentModelClasses[componentType];
            var depends = ModelClass.prototype.depends || [];

            zrUtil.each(depends, function (depComponentType) {
                if (zrUtil.indexOf(thisItem.predecessor, depComponentType) < 0) {
                    thisItem.predecessor.push(depComponentType);
                }
                var thatItem = createDependencyGraphItem(dependencyGraph, depComponentType);
                if (zrUtil.indexOf(thatItem.successor, depComponentType) < 0) {
                    thatItem.successor.push(componentType);
                }
            });
        });

        return dependencyGraph;
    }

    function createDependencyGraphItem(dependencyGraph, componentType) {
        if (!dependencyGraph[componentType]) {
            dependencyGraph[componentType] = {predecessor: [], successor: []};
        }
        return dependencyGraph[componentType];
    }

    return ComponentModel;
});