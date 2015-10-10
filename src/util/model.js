define(function(require) {

    var zrUtil = require('zrender/core/util');
    var matrix = require('zrender/core/matrix');

    var AXIS_DIMS = ['x', 'y', 'z', 'radius', 'angle'];

    var util = {};

    /**
     * Create "each" method to iterate names.
     *
     * @pubilc
     * @param  {Array.<string>} names
     * @param  {Array.<string>=} attrs
     * @return {Function}
     */
    util.createNameEach = function (names, attrs) {
        names = names.slice();
        var capitalNames = zrUtil.map(names, util.capitalFirst);
        attrs = (attrs || []).slice();
        var capitalAttrs = zrUtil.map(attrs, util.capitalFirst);

        return function (callback, context) {
            zrUtil.each(names, function (name, index) {
                var nameObj = {name: name, capital: capitalNames[index]};

                for (var j = 0; j < attrs.length; j++) {
                    nameObj[attrs[j]] = name + capitalAttrs[j];
                }

                callback.call(context, nameObj);
            });
        };
    };

    /**
     * @public
     */
    util.capitalFirst = function (str) {
        return str ? str[0].toUpperCase() + str.substr(1) : str;
    };

    /**
     * Iterate each dimension name.
     *
     * @public
     * @param {Function} callback The parameter is like:
     *                            {
     *                                name: 'angle',
     *                                capital: 'Angle',
     *                                axis: 'angleAxis',
     *                                axisIndex: 'angleAixs',
     *                                index: 'angleIndex'
     *                            }
     * @param {Object} context
     */
    util.eachAxisDim = util.createNameEach(AXIS_DIMS, ['axisIndex', 'axis', 'index']);

    /**
     * If value1 is not null, then return value1, otherwise judget rest of values.
     * @param  {*...} values
     * @return {*} Final value
     */
    util.retrieveValue = function (values) {
        for (var i = 0, len = arguments.length; i < len; i++) {
            if (arguments[i] != null) {
                return arguments[i];
            }
        }
    };

    /**
     * If value is not array, then translate it to array.
     * @param  {*} value
     * @return {Array} [value] or value
     */
    util.normalizeToArray = function (value) {
        return zrUtil.isArray(value)
            ? value
            : value == null
            ? []
            : [value];
    };

    /**
     * Get transform matrix of target (param target),
     * in coordinate of its ancestor (param ancestor)
     *
     * @param {module:zrender/mixin/Transformable} target
     * @param {module:zrender/mixin/Transformable} ancestor
     */
    util.getTransform = function (target, ancestor) {
        var node = target;
        var nodeList = [];

        while (node && node !== ancestor) {
            nodeList.push(node);
            node = node.parent;
        }

        var mat = matrix.identity([]);

        for (var i = nodeList.length - 1; i >= 0; i--) {
            mat = matrix.mul(mat, mat, nodeList[i].getLocalTransform());
        }
        return mat;
    };

    /**
     * Apply transform to an vertex.
     * @param {Array.<number>} vertex [x, y]
     * @param {Array.<number>} transform Transform matrix: like [1, 0, 0, 1, 0, 0]
     * @param {boolean=} invert Whether use invert matrix.
     * @return {Array.<number>} [x, y]
     */
    util.applyTransform = function (vertex, tansform, invert) {
        var mat = [1, 0, 0, 1, vertex[0], vertex[1]];
        if (invert) {
            tansform = matrix.invert([], tansform);
        }
        matrix.mul(mat, tansform, mat);
        return [mat[4], mat[5]];
    };

    /**
     * If tow dataZoomModels has the same axis controlled, we say that they are 'linked'.
     * dataZoomModels and 'links' make up one or more graphics.
     * This function finds the graphic where the source dataZoomModel is in.
     *
     * @public
     * @param {Function} forEachNode Node iterator.
     * @param {Function} forEachEdgeType edgeType iterator
     * @param {Function} edgeIdGetter Giving node and edgeType, return an array of edge id.
     * @return {Function} Input: sourceNode, Output: Like {nodes: [], dims: {}}
     */
    util.createLinkedNodesFinder = function (forEachNode, forEachEdgeType, edgeIdGetter) {

        return function (sourceNode) {
            var result = {
                nodes: [],
                records: {} // key: edgeType.name, value: Object (key: edge id, value: boolean).
            };

            forEachEdgeType(function (edgeType) {
                result.records[edgeType.name] = {};
            });

            if (!sourceNode) {
                return result;
            }

            absorb(sourceNode, result);

            var existsLink;
            do {
                existsLink = false;
                forEachNode(processSingleNode);
            }
            while (existsLink);

            function processSingleNode(node) {
                if (!isNodeAbsorded(node, result) && isLinked(node, result)) {
                    absorb(node, result);
                    existsLink = true;
                }
            }

            return result;
        };

        function isNodeAbsorded(node, result) {
            return zrUtil.indexOf(result.nodes, node) >= 0;
        }

        function isLinked(node, result) {
            var hasLink = false;
            forEachEdgeType(function (edgeType) {
                zrUtil.each(edgeIdGetter(node, edgeType) || [], function (edgeId) {
                    result.records[edgeType.name][edgeId] && (hasLink = true);
                });
            });
            return hasLink;
        }

        function absorb(node, result) {
            result.nodes.push(node);
            forEachEdgeType(function (edgeType) {
                zrUtil.each(edgeIdGetter(node, edgeType) || [], function (edgeId) {
                    result.records[edgeType.name][edgeId] = true;
                });
            });
        }
    };

    return util;
});