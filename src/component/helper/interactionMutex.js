define(function (require) {

    var ATTR = '\0_ec_interaction_mutex';

    var interactionMutex = {

        take: function (zr, resourceKey, userKey, onTakeAway) {
            var store = getStore(zr);
            var record = store[resourceKey];

            record && record.onTakeAway && record.onTakeAway();

            store[resourceKey] = {
                userKey: userKey,
                onTakeAway: onTakeAway
            };
        },

        release: function (zr, resourceKey, userKey) {
            var store = getStore(zr);
            var record = store[resourceKey];

            if (record && record.userKey === userKey) {
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

    return interactionMutex;
});