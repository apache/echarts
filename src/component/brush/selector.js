define(function(require) {

    var polygonContain = require('zrender/contain/polygon').contain;

    // Key of the first level is brushType: `line`, `rect`, `polygon`.
    // Key of the second level is chart element type: `point`, `rect`.
    // See moudule:echarts/component/helper/BrushController
    // function param:
    //      {Object} itemLayout fetch from data.getItemLayout(dataIndex)
    //      {Object} brushRange {type: ''}
    //      {module:zrender/core/BoundingRect} [boundingRect]
    // function return:
    //      {boolean} Whether in the given brush.
    var selector = {
        rect: {
            point: function (itemLayout, brushRange, boundingRect) {
                return boundingRect.contain(itemLayout[0], itemLayout[1]);
            },
            rect: function (itemLayout, brushRange, boundingRect, data, dataIndex) {
                // TEST contain
                // if (
                //     data.get('x', dataIndex) === 6
                //     && data.get('y', dataIndex) === 1
                //     && boundingRect.contain(itemLayout[0], itemLayout[1])
                //     && polygonContain(brushRange.range, itemLayout[0], itemLayout[1])
                // ) {
                //     console.log(itemLayout, JSON.stringify(brushRange));
                // }
            }
        },
        polygon: {
            point: function (itemLayout, brushRange, boundingRect) {
                return boundingRect.contain(itemLayout[0], itemLayout[1])
                    && polygonContain(brushRange.range, itemLayout[0], itemLayout[1]);
            },
            rect: function (itemLayout, brushRange, boundingRect, data, dataIndex) {
            }
        }
    };

    return selector;

});