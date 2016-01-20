define(function (require) {

    var zrUtil = require('zrender/core/util');

    /**
     * nest helper used to group by the array.
     * can specified the keys and sort the keys.
     */
    function nest() {

        var keysFunction = [];
        var sortKeysFunction = [];

        /**
         * map an Array into the mapObject.
         * @param {Array} array
         * @param {number} depth
         */
        function map(array, depth) {
            if (depth >= keysFunction.length) {
                return array;
            }
            var i = -1;
            var n = array.length;
            var keyFunction = keysFunction[depth++];
            var mapObject = {};
            var valuesByKey = {};

            while (++i < n) {
                var keyValue = keyFunction(array[i]);
                var values = valuesByKey[keyValue];

                if (values) {
                    values.push(array[i]);
                }
                else {
                    valuesByKey[keyValue] = [array[i]];
                }
            }

            zrUtil.each(valuesByKey, function (value, key) {
                mapObject[key] = map(value, depth);
            });

            return mapObject;
        }

        /**
         * transform the Map Object to multidimensional Array
         * @param {Object} map
         * @param {number} depth
         */
        function entriesMap(mapObject, depth) {
            if (depth >= keysFunction.length) {
                return mapObject;
            }
            var array = [];
            var sortKeyFunction = sortKeysFunction[depth++];

            zrUtil.each(mapObject, function (value, key) {
                array.push({
                    key: key, values: entriesMap(value, depth)
                });
            });

            if (sortKeyFunction) {
                return array.sort(function (a, b) {
                    return sortKeyFunction(a.key, b.key);
                });
            }
            else {
                return array;
            }
        }

        return {
            /**
             * specified the key to groupby the arrays.
             * users can specified one more keys.
             * @param {Function} d
             */
            key: function (d) {
                keysFunction.push(d);
                return this;
            },

            /**
             * specified the comparator to sort the keys
             * @param {Function} order
             */
            sortKeys: function (order) {
                sortKeysFunction[keysFunction.length - 1] = order;
                return this;
            },

            /**
             * the array to be grouped by.
             * @param {Array} array
             */
            entries: function (array) {
                return entriesMap(map(array, 0), 0);
            }
        };
    }
    return nest;
});