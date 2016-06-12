define(function (require) {

    var ATTR = '\0_ec_interaction_mutex';

    var interactionMutex = {

        take: function (zr, resourceKey, userKey, onRelease) {
            var store = getStore(zr);
            var record = store[resourceKey];

            record && record.onRelease && record.onRelease();

            store[resourceKey] = {
                userKey: userKey,
                onRelease: onRelease
            };
        },

        release: function (zr, resourceKey, userKey) {
            var store = getStore(zr);
            var record = store[resourceKey];

            if (record.userKey === userKey) {
                store[resourceKey] = null;
                record.onRelease && record.onRelease();
            }
        },

        isTaken: function (zr, resourceKey) {
            return !!getStore(zr)[resourceKey];
        }
    };

    function getStore(zr) {
        return zr[ATTR] || (zr[ATTR] = {});
    }

    return interactionMutex;
});