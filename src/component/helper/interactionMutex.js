define(function (require) {

    var ATTR = '\0_ec_interaction_mutex';

    var interactionMutex = {

        take: function (key, zr) {
            getStore(zr)[key] = true;
        },

        release: function (key, zr) {
            getStore(zr)[key] = false;
        },

        isTaken: function (key, zr) {
            return !!getStore(zr)[key];
        }
    };

    function getStore(zr) {
        return zr[ATTR] || (zr[ATTR] = {});
    }

    return interactionMutex;
});