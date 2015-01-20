/**
 * K-Dimension Tree
 *
 * @module echarts/data/KDTree
 * @author Yi Shen(https://github.com/pissang)
 */
define(function (require) {

    var quickSelect = require('./quickSelect');

    function Node(axis, data) {
        this.left = null;
        this.right = null;
        this.axis = axis;

        this.data = data;
    };

    /**
     * @constructor
     * @alias module:echarts/data/KDTree
     * @param {Array} points List of points
     * @param {Number} [dimension]
     *        Point dimension.
     *        Default will use the first point's length as dimensiont
     */
    var KDTree = function (points, dimension) {
        if (!dimension && points.length > 0) {
            dimension = points[0].length;
        }
        this.dimension = dimension;
        this.root = this._buildTree(points, 0, points.length - 1, 0);
    };

    /**
     * Resursively build the tree
     */
    KDTree.prototype._buildTree = function (points, left, right, axis) {
        var medianIndex = Math.floor((left + right) / 2);
        medianIndex = quickSelect(
            points, left, right, medianIndex,
            function (a, b) {
                return a[axis] - b[axis];
            }
        );
        var median = points[medianIndex];

        var node = new Node(axis, median);

        axis = (axis + 1) % this.dimension;
        if (right > left) {
            node.left = this._buildTree(points, left, medianIndex, axis);
            node.right = this._buildTree(points, medianIndex + 1, right, axis);   
        }

        return node;
    };

    return KDTree;
});