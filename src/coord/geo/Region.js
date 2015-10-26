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
     * @param {Array} contours
     * @param {Array.<number>} cp
     */
    function Region(name, contours, cp) {

        /**
         * @type {string}
         * @readOnly
         */
        this.name = name;

        /**
         * @type {Array.<Array>}
         * @readOnly
         */
        this.contours = contours;

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
    };

    Region.prototype = {

        constructor: Region,

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
            var contours = this.contours;
            for (var i = 0; i < contours.length; i++) {
                bbox.fromPoints(contours[i], min2, max2);
                vec2.min(min, min, min2);
                vec2.max(max, max, max2);
            }
            // No data
            if (i === 0) {
                min[0] = min[1] = max[0] = max[1] = 0;
            }

            return this._rect = new BoundingRect(
                min[0], min[1], max[0] - min[0], max[1] - min[1]
            );
        },

        /**
         * @param {<Array.<number>} coord
         * @return {boolean}
         */
        contain: function (coord) {
            var contours = this.contours;
            for (var i = 0, len = contours.length; i < len; i++) {
                if (polygonContain.contain(contours[i], coord[0], coord[1])) {
                    return true;
                }
            }
            return false;
        }
    };

    return Region;
});