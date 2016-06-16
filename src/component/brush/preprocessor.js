/**
 * @file brush preprocessor
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');

    var DEFAULT_TOOLBOX_BTNS = ['rect', 'polygon', 'keep', 'clear'];

    return function (option) {
        var btns = findToolboxNeededByBrush(option);

        if (!btns.length) {
            return;
        }

        var toolbox = option && option.toolbox;

        if (zrUtil.isArray(toolbox)) {
            toolbox = toolbox[0];
        }
        if (!toolbox) {
            toolbox = {feature: {}};
            option.toolbox = [toolbox];
        }

        (toolbox.feature || (toolbox.feature = {})).brush = {type: btns};
    };

    function findToolboxNeededByBrush(option) {
        var brush = option && option.brush;
        var btns = [];

        if (!zrUtil.isArray(brush)) {
            brush = brush ? [brush] : [];
        }

        zrUtil.each(brush, function (brushOpt) {
            var tbs = brushOpt.hasOwnProperty('toolbox')
                ? brushOpt.toolbox
                : DEFAULT_TOOLBOX_BTNS; // Default value

            if (tbs instanceof Array) {
                btns = btns.concat(tbs);
            }
        });

        return btns;
    }

});