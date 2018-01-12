import {makeInner, normalizeToArray} from '../../util/model';

var inner = makeInner();

export default {
    clearColorPalette: function () {
        inner(this).colorIdx = 0;
        inner(this).colorNameMap = {};
    },

    getColorFromPalette: function (name, scope) {
        scope = scope || this;
        var scopeFields = inner(scope);
        var colorIdx = scopeFields.colorIdx || 0;
        var colorNameMap = scopeFields.colorNameMap = scopeFields.colorNameMap || {};
        // Use `hasOwnProperty` to avoid conflict with Object.prototype.
        if (colorNameMap.hasOwnProperty(name)) {
            return colorNameMap[name];
        }
        var colorPalette = normalizeToArray(this.get('color', true));
        if (!colorPalette.length) {
            return;
        }

        var color = colorPalette[colorIdx];
        if (name) {
            colorNameMap[name] = color;
        }
        scopeFields.colorIdx = (colorIdx + 1) % colorPalette.length;

        return color;
    }
};
