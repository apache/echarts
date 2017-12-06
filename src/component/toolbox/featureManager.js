
var features = {};

export function register(name, ctor) {
    features[name] = ctor;
}

export function get(name) {
    return features[name];
}
