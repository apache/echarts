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
    }

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
            var contours = this.contours;
            if (rect.contain(coord[0], coord[1])) {
                for (var i = 0, len = contours.length; i < len; i++) {
                    if (polygonContain.contain(contours[i], coord[0], coord[1])) {
                        return true;
                    }
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
            var contours = this.contours;
            for (var i = 0; i < contours.length; i++) {
                for (var p = 0; p < contours[i].length; p++) {
                    vec2.applyTransform(contours[i][p], contours[i][p], transform);
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