define(function(require) {

    var polygonContain = require('zrender/contain/polygon').contain;
    var BoundingRect = require('zrender/core/BoundingRect');

    // Key of the first level is brushType: `line`, `rect`, `polygon`.
    // Key of the second level is chart element type: `point`, `rect`.
    // See moudule:echarts/component/helper/BrushController
    // function param:
    //      {Object} itemLayout fetch from data.getItemLayout(dataIndex)
    //      {Object} selectors {point: selector, rect: selector, ...}
    //      {Object} area {range: [[], [], ..], boudingRect}
    // function return:
    //      {boolean} Whether in the given brush.
    var selector = {
        lineX: getLineSelectors(0),
        lineY: getLineSelectors(1),
        rect: {
            point: function (itemLayout, selectors, area) {
                return area.boundingRect.contain(itemLayout[0], itemLayout[1]);
            },
            rect: function (itemLayout, selectors, area) {
                return area.boundingRect.intersect(makeBoundingRect(itemLayout));
            }
        },
        polygon: {
            point: function (itemLayout, selectors, area) {
                return area.boundingRect.contain(itemLayout[0], itemLayout[1])
                    && polygonContain(area.range, itemLayout[0], itemLayout[1]);
            },
            rect: function (itemLayout, selectors, area) {
                // FIXME
                // 随意写的，没有考察过效率。
                var points = area.range;

                if (points.length <= 1) {
                    return false;
                }

                var x = itemLayout.x;
                var y = itemLayout.y;
                var width = itemLayout.width;
                var height = itemLayout.height;
                var p = points[0];

                if (polygonContain(points, x, y)
                    || polygonContain(points, x + width, y)
                    || polygonContain(points, x, y + height)
                    || polygonContain(points, x + width, y + height)
                    || makeBoundingRect(itemLayout).contain(p[0], p[1])
                    || lineIntersectPolygon(x, y, x + width, y, points)
                    || lineIntersectPolygon(x, y, x, y + height, points)
                    || lineIntersectPolygon(x + width, y, x + width, y + height, points)
                    || lineIntersectPolygon(x, y + height, x + width, y + height, points)
                ) {
                    return true;
                }
            }
        }
    };

    function getLineSelectors(xyIndex) {
        var xy = ['x', 'y'];
        var wh = ['width', 'height'];

        return {
            point: function (itemLayout, selectors, area) {
                var range = area.range;
                var p = itemLayout[xyIndex];
                return inLineRange(p, range);
            },
            rect: function (itemLayout, selectors, area) {
                var range = area.range;
                return inLineRange(itemLayout[xy[xyIndex]], range)
                    || inLineRange(itemLayout[xy[xyIndex]] + itemLayout[wh[xyIndex]], range);
            }
        };
    }

    function inLineRange(p, range) {
        return range[0] <= p && p <= range[1];
    }

    // FIXME
    // 随意写的，没考察过效率。
    function lineIntersectPolygon(lx, ly, l2x, l2y, points) {
        for (var i = 0, p2 = points[points.length - 1]; i < points.length; i++) {
            var p = points[i];
            if (lineIntersect(lx, ly, l2x, l2y, p[0], p[1], p2[0], p2[1])) {
                return true;
            }
            p2 = p;
        }
    }

    // Code from <http://blog.csdn.net/rickliuxiao/article/details/6259322> with some fix.
    // See <https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection>
    function lineIntersect(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y) {
        var delta = determinant(a2x - a1x, b1x - b2x, a2y - a1y, b1y - b2y);
        if (nearZero(delta)) { // parallel
            return false;
        }
        var namenda = determinant(b1x - a1x, b1x - b2x, b1y - a1y, b1y - b2y) / delta;
        if (namenda < 0 || namenda > 1) {
            return false;
        }
        var miu = determinant(a2x - a1x, b1x - a1x, a2y - a1y, b1y - a1y) / delta;
        if (miu < 0 || miu > 1) {
            return false;
        }
        return true;
    }

    function nearZero(val) {
        return val <= (1e-6) && val >= -(1e-6);
    }

    function determinant(v1, v2, v3, v4) {
        return v1 * v4 - v2 * v3;
    }

    function makeBoundingRect(itemLayout) {
        var x = itemLayout.x;
        var y = itemLayout.y;
        var width = itemLayout.width;
        var height = itemLayout.height;

        // width and height might be negative.
        if (width < 0) {
            x = x + width;
            width = -width;
        }
        if (height < 0) {
            y = y + height;
            height = -height;
        }
        return new BoundingRect(x, y, width, height);
    }

    return selector;

});