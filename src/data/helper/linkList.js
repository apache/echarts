/**
 * Link list to graph or tree
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var arraySlice = Array.prototype.slice;

    // Caution:
    // In most case, only one of the list and its shallow clones (see list.cloneShallow)
    // can be active in echarts process. Considering heap memory consumption,
    // we do not clone tree or graph, but share them among list and its shallow clones.
    // But in some rare case, we have to keep old list (like do animation in chart). So
    // please take care that both the old list and the new list share the same tree/graph.

    function linkList(list, target, targetType) {
        zrUtil.each(listProxyMethods, function (method, methodName) {
            var originMethod = list[methodName];
            list[methodName] = zrUtil.curry(method, originMethod, target, targetType);
        });

        list[targetType] = target;
        target.data = list;

        return list;
    }

    var listProxyMethods = {
        cloneShallow: function (originMethod, target, targetType) {
            var newList = originMethod.apply(this, arraySlice.call(arguments, 3));
            return linkList(newList, target, targetType);
        },
        map: function (originMethod, target, targetType) {
            var newList = originMethod.apply(this, arraySlice.call(arguments, 3));
            return linkList(newList, target, targetType);
        },
        filterSelf: function (originMethod, target, targetType) {
            var result = originMethod.apply(this, arraySlice.call(arguments, 3));
            target.update();
            return result;
        }
    };

    return {
        linkToGraph: function (list, graph) {
            linkList(list, graph, 'graph');
        },

        linkToTree: function (list, tree) {
            linkList(list, tree, 'tree');
        }
    };
});