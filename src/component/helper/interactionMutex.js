define(function (require) {

    var ATTR = '\0_ec_interaction_mutex';

    var interactionMutex = {

        take: function (zr, resourceKey, userKey) {
            var store = getStore(zr);
            store[resourceKey] = userKey;
        },

        release: function (zr, resourceKey, userKey) {
            var store = getStore(zr);
            var uKey = store[resourceKey];

            if (uKey === userKey) {
                store[resourceKey] = null;
            }
        },

        isTaken: function (zr, resourceKey) {
            return !!getStore(zr)[resourceKey];
        }
    };

    function getStore(zr) {
        return zr[ATTR] || (zr[ATTR] = {});
    }

    /**
     * payload: {
     *     type: 'takeGlobalCursor',
     *     key: 'dataZoomSelect', or 'brush', or ...,
     *         If no userKey, release global cursor.
     * }
     */
    require('../../echarts').registerAction(
        {type: 'takeGlobalCursor', event: 'globalCursorTaken', update: 'update'},
        function () {}
    );

    return interactionMutex;
});