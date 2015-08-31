define(function(require) {

    'use strict';

    var unique = {};
    var base = 0;
    var DELIMITER = '_';

    /**
     * @public
     * @param {string} type
     * @return {string}
     */
    unique.getUID = function (type) {
        // Considering the case of crossing js context,
        // use Math.random to make id as unique as possible.
        return [(type || ''), base++, Math.random()].join(DELIMITER);
    };

    /**
     * @public
     * @param {string} uid
     * @return {string} Type
     */
    unique.getType = function (uid) {
        if (uid) {
            return uid.split(DELIMITER)[0];
        }
    };

    return unique;
});