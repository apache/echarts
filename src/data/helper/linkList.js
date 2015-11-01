/**
 * Link list to graph or tree
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var arraySlice = Array.prototype.slice;

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