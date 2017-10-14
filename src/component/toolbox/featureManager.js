
var features = {};

return {
    register: function (name, ctor) {
        features[name] = ctor;
    },

    get: function (name) {
        return features[name];
    }
};