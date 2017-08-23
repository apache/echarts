/**
 * @module echarts/coord/geo/Region
 */
define(function (require) {

    var polygonContain = require('zrender/contain/polygon');

    var BoundingRect = require('zrender/core/BoundingRect');

    var bbox = require('zrender/core/bbox');
    var vec2 = require('zrender/core/vector');

    /**
     * @param {string} name
     * @param {Array} geometries
     * @param {Array.<number>} cp
     */
    function Region(name, geometries, cp) {

        /**
         * @type {string}
         * @readOnly
         */
        this.name = name;

        /**
         * @type {Array.<Array>}
         * @readOnly
         */
        this.geometries = geometries;

        if (!cp) {
            var rect = this.getBoundingRect();
            cp = [
                rect.x + rect.width / 2,
                rect.y + rect.height / 2
            ];
        }
        else {
            cp = [cp[0], cp[1]];
        }
        /**
         * @type {Array.<number>}
         */
        this.center = cp;
    }

    Region.prototype = {

        constructor: Region,

        properties: null,

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        getBoundingRect: function () {
            var rect = this._rect;
            if (rect) {
                return rect;
            }

            var MAX_NUMBER = Number.MAX_VALUE;
            var min = [MAX_NUMBER, MAX_NUMBER];
            var max = [-MAX_NUMBER, -MAX_NUMBER];
            var min2 = [];
            var max2 = [];
            var geometries = this.geometries;
            for (var i = 0; i < geometries.length; i++) {
                // Only support polygon
                if (geometries[i].type !== 'polygon') {
                    continue;
                }
                // Doesn't consider hole
                var exterior = geometries[i].exterior;
                bbox.fromPoints(exterior, min2, max2);
                vec2.min(min, min, min2);
                vec2.max(max, max, max2);
            }
            // No data
            if (i === 0) {
                min[0] = min[1] = max[0] = max[1] = 0;
            }

            return (this._rect = new BoundingRect(
                min[0], min[1], max[0] - min[0], max[1] - min[1]
            ));
        },

        /**
         * @param {<Array.<number>} coord
         * @return {boolean}
         */
        contain: function (coord) {
            var rect = this.getBoundingRect();
            var geometries = this.geometries;
            if (!rect.contain(coord[0], coord[1])) {
                return false;
            }
            loopGeo: for (var i = 0, len = geometries.length; i < len; i++) {
                // Only support polygon.
                if (geometries[i].type !== 'polygon') {
                    continue;
                }
                var exterior = geometries[i].exterior;
                var interiors = geometries[i].interiors;
                if (polygonContain.contain(exterior, coord[0], coord[1])) {
                    // Not in the region if point is in the hole.
                    for (var k = 0; k < (interiors ? interiors.length : 0); k++) {
                        if (polygonContain.contain(interiors[k])) {
                            continue loopGeo;
                        }
                    }
                    return true;
                }
            }
            return false;
        },

        transformTo: function (x, y, width, height) {
            var rect = this.getBoundingRect();
            var aspect = rect.width / rect.height;
            if (!width) {
                width = aspect * height;
            }
            else if (!height) {
                height = width / aspect ;
            }
            var target = new BoundingRect(x, y, width, height);
            var transform = rect.calculateTransform(target);
            var geometries = this.geometries;
            for (var i = 0; i < geometries.length; i++) {
                // Only support polygon.
                if (geometries[i].type !== 'polygon') {
                    continue;
                }
                var exterior = geometries[i].exterior;
                var interiors = geometries[i].interiors;
                for (var p = 0; p < exterior.length; p++) {
                    vec2.applyTransform(exterior[p], exterior[p], transform);
                }
                for (var h = 0; h < (interiors ? interiors.length : 0); h++) {
                    for (var p = 0; p < interiors[h].length; p++) {
                        vec2.applyTransform(interiors[h][p], interiors[h][p], transform);
                    }
                }
            }
            rect = this._rect;
            rect.copy(target);
            // Update center
            this.center = [
                rect.x + rect.width / 2,
                rect.y + rect.height / 2
            ];
        }
    };

    return Region;
});