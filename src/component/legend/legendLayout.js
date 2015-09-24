define(function(require) {
    'use strict';

    var formatUtil = require('../../util/format');

    return function (group, legendModel) {
        var itemGap = legendModel.get('itemGap');
        var padding = formatUtil.normalizeCssArray(
            legendModel.get('padding')
        );
        var orient = legendModel.get('orient');

        var x = padding[3];
        var y = padding[0];

        group.eachChild(function (child) {
            var position = child.position;
            var rect = child.getBoundingRect();
            position[0] = x;
            position[1] = y;

            orient === 'horizontal'
                ? (x += rect.width + itemGap)
                : (y += rect.height + itemGap);
        });

        group.padding = padding;
    };
});