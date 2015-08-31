/**
 * Component model
 *
 * @module echarts/model/Component
 */
define(function(require) {

    'use strict';

    var Model = require('./Model');
    var zrUtil = require('zrender/core/util');
    var arrayPush = Array.prototype.push;

    var TYPE_DELIMITER = '.';
    var IS_CONTAINER = '___EC__COMPONENT__CONTAINER___';

    /**
     * Component model classes
     * key: componentType,
     * value:
     *     componentClass, when componentType is 'xxx'
     *     or Array.<componentClass>, when componentType is 'xxx.yy'
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
            componentType = ComponentModel.parseComponentType(componentType);

            if (!componentType.sub) {
                if (componentModelClasses[componentType.main]) {
                    throw new Error(componentType.main + 'exists');
                }
                componentModelClasses[componentType.main] = SubComponentModel;
            }
            else if (componentType.sub !== IS_CONTAINER) {
                var container = makeContainer(componentType);
                container[componentType.sub] = SubComponentModel;
            }
        }
        return SubComponentModel;
    };

    ComponentModel.getComponentModelClass = function (componentType, option) {
        var fullComponentType = componentType;
        if (option && option.type) {
            fullComponentType = componentType + TYPE_DELIMITER + option.type;
        }
        var ComponentClass = getClassOrContainer(fullComponentType);
        if (ComponentClass[IS_CONTAINER]) {
            ComponentClass = ComponentClass[option.type];
        }
        return ComponentClass;
    };

    ComponentModel.has = function (componentType) {
        return !!getClassOrContainer(componentType);
    };

    ComponentModel.parseComponentType = function (componentType) {
        var ret = {main: '', sub: ''};
        if (componentType) {
            componentType = componentType.split(TYPE_DELIMITER);
            ret.main = componentType[0] || '';
            ret.sub = componentType[1] || '';
        }
        return ret;
    };

    function makeContainer(componentType) {
        var container = componentModelClasses[componentType.main];
        if (!container || !container[IS_CONTAINER]) {
            container = componentModelClasses[componentType.main] = {};
            container[IS_CONTAINER] = true;
        }
        return container;
    }

    function getClassOrContainer(componentType) {
        componentType = ComponentModel.parseComponentType(componentType);
        return componentModelClasses[componentType.main];
    }

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
            var originalDeps = thisItem.originalDeps = getDependencies(componentType);

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

    function getDependencies(componentType) {
        componentType = ComponentModel.parseComponentType(componentType);
        var deps = [];
        var obj = componentModelClasses[componentType.main];
        if (obj && obj[IS_CONTAINER]) {
            zrUtil.each(obj, function (ComponentClass, componentType) {
                if (componentType !== IS_CONTAINER) {
                    arrayPush.apply(deps, ComponentClass.prototype.dependencies || []);
                }
            });
        }
        else if (obj) {
            arrayPush.apply(deps, obj.prototype.dependencies || []);
        }
        return deps;
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