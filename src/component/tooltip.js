// FIXME Better way to pack data in graphic element
define(function (require) {

    require('./tooltip/TooltipModel');

    require('./tooltip/TooltipView');

    require('../echarts').registerAction(
        {
            type: 'showTip',
            event: 'showTip',
            update: 'none'
        },
        // noop
        function () {}
    );
});