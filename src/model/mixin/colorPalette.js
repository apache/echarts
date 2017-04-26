define(function (require) {

    var classUtil = require('../../util/clazz');
    var set = classUtil.set;
    var get = classUtil.get;

    return {
        clearColorPalette: function () {
            set(this, 'colorIdx', 0);
            set(this, 'colorNameMap', {});
        },

        getColorFromPalette: function (name, scope) {
            scope = scope || this;
            var colorIdx = get(scope, 'colorIdx') || 0;
            var colorNameMap = get(scope, 'colorNameMap') || set(scope, 'colorNameMap', {});
            // Use `hasOwnProperty` to avoid conflict with Object.prototype.
            if (colorNameMap.hasOwnProperty(name)) {
                return colorNameMap[name];
            }
            var colorPalette = this.get('color', true) || [];
            if (!colorPalette.length) {
                return;
            }

            var color = colorPalette[colorIdx];
            if (name) {
                colorNameMap[name] = color;
            }
            set(scope, 'colorIdx', (colorIdx + 1) % colorPalette.length);

            return color;
        }
    };
});