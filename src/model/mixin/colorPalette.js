define(function () {
    return {
        clearColorPalette: function () {
            this._colorIdx = 0;
            this._colorNameMap = {};
        },

        getColorFromPalette: function (name, scope) {
            scope = scope || this;
            var colorIdx = scope._colorIdx || 0;
            var colorNameMap = scope._colorNameMap || (scope._colorNameMap = {});
            if (colorNameMap[name]) {
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
            scope._colorIdx = (colorIdx + 1) % colorPalette.length;

            return color;
        }
    };
});