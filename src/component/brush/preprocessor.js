/**
 * @file brush preprocessor
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');

    var DEFAULT_TOOLBOX_BTNS = ['rect', 'polygon', 'keep', 'clear'];

    return function (option, isNew) {
        var brushComponents = option && option.brush;
        if (!zrUtil.isArray(brushComponents)) {
            brushComponents = brushComponents ? [brushComponents] : [];
        }

        if (!brushComponents.length) {
            return;
        }

        var brushComponentSpecifiedBtns = [];

        zrUtil.each(brushComponents, function (brushOpt) {
            var tbs = brushOpt.hasOwnProperty('toolbox')
                ? brushOpt.toolbox : [];

            if (tbs instanceof Array) {
                brushComponentSpecifiedBtns = brushComponentSpecifiedBtns.concat(tbs);
            }
        });

        var toolbox = option && option.toolbox;

        if (zrUtil.isArray(toolbox)) {
            toolbox = toolbox[0];
        }
        if (!toolbox) {
            toolbox = {feature: {}};
            option.toolbox = [toolbox];
        }

        var toolboxFeature = (toolbox.feature || (toolbox.feature = {}));
        var toolboxBrush = toolboxFeature.brush || (toolboxFeature.brush = {});
        var brushTypes = toolboxBrush.type || (toolboxBrush.type = []);

        brushTypes.push.apply(brushTypes, brushComponentSpecifiedBtns);

        removeDuplicate(brushTypes);

        if (isNew && !brushTypes.length) {
            brushTypes.push.apply(brushTypes, DEFAULT_TOOLBOX_BTNS);
        }
    };

    function removeDuplicate(arr) {
        var map = {};
        zrUtil.each(arr, function (val) {
            map[val] = 1;
        });
        arr.length = 0;
        zrUtil.each(map, function (flag, val) {
            arr.push(val);
        });
    }

});