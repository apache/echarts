define(function () {
    return function (properties) {
        // Normalize
        for (var i = 0; i < properties.length; i++) {
            if (! properties[i][1]) {
               properties[i][1] = properties[i][0];
            }
        }
        return function () {
            var obj = {};
            for (var i = 0; i < properties.length; i++) {
                var val = this.get(properties[i][1]);
                if (val != null) {
                    obj[properties[i][0]] = val;
                }
            }
            return obj;
        }
    }
});