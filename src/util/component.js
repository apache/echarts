define(function(require) {

    var zrUtil = require('zrender/core/util');

    var base = 0;
    var DELIMITER = '_';
    var TYPE_DELIMITER = '.';
    var IS_CONTAINER = '___EC__COMPONENT__CONTAINER___';

    var util = {};

    /**
     * @public
     * @param {string} type
     * @return {string}
     */
    util.getUID = function (type) {
        // Considering the case of crossing js context,
        // use Math.random to make id as unique as possible.
        return [(type || ''), base++, Math.random()].join(DELIMITER);
    };

    /**
     * @public
     * @param {string} uid
     * @return {string} Type
     */
    util.getUIDType = function (uid) {
        if (uid) {
            return uid.split(DELIMITER)[0];
        }
    };

    /**
     * @public
     */
    var parseComponentType = util.parseComponentType = function (componentType) {
        var ret = {main: '', sub: ''};
        if (componentType) {
            componentType = componentType.split(TYPE_DELIMITER);
            ret.main = componentType[0] || '';
            ret.sub = componentType[1] || '';
        }
        return ret;
    };

    /**
     * @public
     */
    util.enableClassExtend = function (RootClass, preConstruct) {
        RootClass.extend = function (proto) {
            var ExtendedClass = function () {
                preConstruct && preConstruct.apply(this, arguments);
                RootClass.apply(this, arguments);
            };

            zrUtil.extend(ExtendedClass.prototype, proto);
            ExtendedClass.extend = this.extend;
            zrUtil.inherits(ExtendedClass, this);

            return ExtendedClass;
        };
    };

    /**
     * @param {Object} entity
     * @param {Object} options
     * @param {boolean} [options.subTypeDefaulter]
     * @param {boolean} [options.registerWhenExtend]
     * @public
     */
    util.enableClassManagement = function (entity, options) {
        options = options || {};

        /**
         * Component model classes
         * key: componentType,
         * value:
         *     componentClass, when componentType is 'xxx'
         *     or Object.<subKey, componentClass>, when componentType is 'xxx.yy'
         * @type {Object}
         */
        var storage = {};

        entity.registerClass = function (Clazz, componentType) {
            if (componentType) {
                componentType = parseComponentType(componentType);

                if (!componentType.sub) {
                    if (storage[componentType.main]) {
                        throw new Error(componentType.main + 'exists');
                    }
                    storage[componentType.main] = Clazz;
                }
                else if (componentType.sub !== IS_CONTAINER) {
                    var container = makeContainer(componentType);
                    container[componentType.sub] = Clazz;
                }
            }
            return Clazz;
        };

        entity.getClass = function (componentTypeMain, subType, throwWhenNotFound) {
            var Clazz = storage[componentTypeMain];

            if (Clazz && Clazz[IS_CONTAINER]) {
                Clazz = subType ? Clazz[subType] : null;
            }

            if (throwWhenNotFound && !Clazz) {
                throw new Error(
                    'Component ' + componentTypeMain + '.' + (subType || '') + ' not exists'
                );
            }

            return Clazz;
        };

        entity.getClassesByMainType = function (componentType) {
            componentType = parseComponentType(componentType);

            var result = [];
            var obj = storage[componentType.main];

            if (obj && obj[IS_CONTAINER]) {
                zrUtil.each(obj, function (ComponentClass, componentType) {
                    if (componentType !== IS_CONTAINER) {
                        result.push(ComponentClass);
                    }
                });
            }
            else {
                result.push(obj);
            }

            return result;
        };

        entity.hasClass = function (componentType) {
            // Just consider componentType.main.
            componentType = parseComponentType(componentType);
            return !!storage[componentType.main];
        };

        entity.parseComponentType = parseComponentType;

        function makeContainer(componentType) {
            var container = storage[componentType.main];
            if (!container || !container[IS_CONTAINER]) {
                container = storage[componentType.main] = {};
                container[IS_CONTAINER] = true;
            }
            return container;
        }

        if (options.subTypeDefaulter) {
            enableSubTypeDefaulter(entity, storage);
        }

        if (options.registerWhenExtend) {
            var originalExtend = entity.extend;
            if (originalExtend) {
                entity.extend = function (proto) {
                    var ExtendedClass = originalExtend.call(this, proto);
                    return entity.registerClass(ExtendedClass, proto.type);
                };
            }
        }

        return entity;
    };

    /**
     * @inner
     */
    function enableSubTypeDefaulter(entity, storage) {

        var subTypeDefaulters = {};

        entity.registerSubTypeDefaulter = function (componentType, defaulter) {
            componentType = parseComponentType(componentType);
            subTypeDefaulters[componentType.main] = defaulter;
        };

        entity.determineSubType = function (componentType, option) {
            var type = option.type;
            if (!type) {
                var componentTypeMain = parseComponentType(componentType).main;
                var Clazz = storage[componentTypeMain];
                Clazz
                    && Clazz[IS_CONTAINER]
                    && subTypeDefaulters[componentTypeMain]
                    && subTypeDefaulters[componentTypeMain](option);
            }
            return type;
        };

        return entity;
    }

    /**
     * Topological travel on Activity Network (Activity On Vertices).
     * Dependencies is defined in Model.prototype.dependencies, like ['xAxis', 'yAxis'].
     * If 'xAxis' or 'yAxis' is absent in componentTypeList, just ignore it in topology.
     *
     */
    util.enableTopologicalTravel = function (entity, dependencyGetter) {

        /**
         * @public
         * @param {Array.<string>} componentTypeList Target Component type list.
         *                                           Can be ['aa', 'bb', 'aa.xx']
         * @param {Function} callback Params: componentType, dependencies.
         * @param {Object} context Scope of callback.
         */
        entity.topologicalTravel = function (componentTypeList, callback, context) {
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
                callback.call(context, currComponentType, currVertex.originalDeps.slice());
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
                var originalDeps = thisItem.originalDeps = dependencyGetter(componentType);

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
    };

    return util;
});