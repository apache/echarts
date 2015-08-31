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

    ComponentModel.create = function (name, option, ecModel, dependentModels) {
        if (componentModelClasses[name]) {
            return new componentModelClasses[name](option, null, ecModel, dependentModels);
        }
    };

    ComponentModel.has = function (name) {
        return !!componentModelClasses[name];
    };

    /**
     * Topological travel on Activity Network (Activity On Vertices).
     * Dependencies is defined in Model.prototype.dependencies, like ['xAxis', 'yAxis'].
     * If 'xAxis' or 'yAxis' is absent in componentTypeList, just ignore it in topology.
     *
     * @public
     * @param {Array.<string>} componentTypeList Target Component type list.
     * @param {Function} callback Params: componentType, dependencies.
     */
    ComponentModel.topologicalTravel = function (componentTypeList, callback, scope) {
        if (!componentTypeList.length) {
            return;
        }
        var result = makeDepndencyGraph(componentTypeList);
        var graph = result.graph;
        var stack = result.noEntryList;

        if (!stack.length) {
            throw new Error('Circle exists in dependency graph.');
        }

        while (stack.length) {
            var currComponentType = stack.pop();
            var currVertex = graph[currComponentType];
            callback.call(scope, currComponentType, currVertex.originalDeps.slice());
            zrUtil.each(currVertex.successor, removeEdge);
        }

        function removeEdge(succComponentType) {
            graph[succComponentType].entryCount--;
            if (graph[succComponentType].entryCount === 0) {
                stack.push(succComponentType);
            }
        }
    };

    /**
     * DepndencyGraph: {Object}
     * key: conponentType,
     * value: {
     *     successor: [conponentTypes...],
     *     originalDeps: [conponentTypes...],
     *     entryCount: {number}
     * }
     */
    function makeDepndencyGraph(componentTypeList) {
        var graph = {};
        var noEntryList = [];

        zrUtil.each(componentTypeList, function (componentType) {

            var thisItem = createDependencyGraphItem(graph, componentType);
            var originalDeps = thisItem.originalDeps =
                (componentModelClasses[componentType].prototype.dependencies || []).slice();

            var availableDeps = getAvailableDependencies(originalDeps, componentTypeList);
            thisItem.entryCount = availableDeps.length;
            if (thisItem.entryCount === 0) {
                noEntryList.push(componentType);
            }

            zrUtil.each(availableDeps, function (depComponentType) {
                if (zrUtil.indexOf(thisItem.predecessor, depComponentType) < 0) {
                    thisItem.predecessor.push(depComponentType);
                }
                var thatItem = createDependencyGraphItem(graph, depComponentType);
                if (zrUtil.indexOf(thatItem.successor, depComponentType) < 0) {
                    thatItem.successor.push(componentType);
                }
            });
        });

        return {graph: graph, noEntryList: noEntryList};
    }

    function createDependencyGraphItem(graph, componentType) {
        if (!graph[componentType]) {
            graph[componentType] = {predecessor: [], successor: []};
        }
        return graph[componentType];
    }

    function getAvailableDependencies(originalDeps, componentTypeList) {
        var availableDeps = [];
        zrUtil.each(originalDeps, function (dep) {
            zrUtil.indexOf(componentTypeList, dep) >= 0 && availableDeps.push(dep);
        });
        return availableDeps;
    }

    return ComponentModel;
});