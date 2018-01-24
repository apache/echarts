import {makeInner, normalizeToArray} from '../../util/model';

var inner = makeInner();

function getNearestColorPalette(colors, requestColorNum) {
    var paletteNum = colors.length;
    // TODO colors must be in order
    for (var i = 0; i < paletteNum; i++) {
        if (colors[i].length > requestColorNum) {
            return colors[i];
        }
    }
    return colors[paletteNum - 1];
}

export default {
    clearColorPalette: function () {
        inner(this).colorIdx = 0;
        inner(this).colorNameMap = {};
    },

    getColorFromPalette: function (name, scope, requestColorNum) {
        scope = scope || this;
        var scopeFields = inner(scope);
        var colorIdx = scopeFields.colorIdx || 0;
        var colorNameMap = scopeFields.colorNameMap = scopeFields.colorNameMap || {};
        // Use `hasOwnProperty` to avoid conflict with Object.prototype.
        if (colorNameMap.hasOwnProperty(name)) {
            return colorNameMap[name];
        }
        var defaultColorPalette = normalizeToArray(this.get('color', true));
        var layeredColorPalette = this.get('colorLayer', true);
        var colorPalette = ((requestColorNum == null || !layeredColorPalette)
            ? defaultColorPalette : getNearestColorPalette(layeredColorPalette, requestColorNum));

        // In case can't find in layered color palette.
        colorPalette = colorPalette || defaultColorPalette;

        if (!colorPalette || !colorPalette.length) {
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
