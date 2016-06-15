define(function(require) {

    var polygonContain = require('zrender/contain/polygon').contain;

    // `line`, `rect`, `polygon` is brush type.
    // See moudule:echarts/component/helper/BrushController
    // function param:
    //      {Object} itemLayout fetch from data.getItemLayout(dataIndex)
    //      {Object} brushRange {type: ''}
    //      {module:zrender/core/BoundingRect} [boundingRect]
    // function return:
    //      {boolean} Whether in the given brush.
    var isInBrush = {
        point: {
            rect: function (itemLayout, brushRange, boundingRect) {
                return boundingRect.contain(itemLayout[0], itemLayout[1]);
            },
            polygon: function (itemLayout, brushRange, boundingRect, data, dataIndex) {

                // TEST contain
                if (
                    data.get('x', dataIndex) === 6
                    && data.get('y', dataIndex) === 1
                    && boundingRect.contain(itemLayout[0], itemLayout[1])
                    && polygonContain(brushRange.range, itemLayout[0], itemLayout[1])
                ) {
                    console.log(itemLayout, JSON.stringify(brushRange));
                }

                return boundingRect.contain(itemLayout[0], itemLayout[1])
                    && polygonContain(brushRange.range, itemLayout[0], itemLayout[1]);
            }
        },
        rect: {
            rect: function (itemLayout, brushRange, boundingRect) {
                return boundingRect.contain(itemLayout[0], itemLayout[1]);
            },
            polygon: function (itemLayout, brushRange, boundingRect, data, dataIndex) {

                // TEST contain
                if (
                    data.get('x', dataIndex) === 6
                    && data.get('y', dataIndex) === 1
                    && boundingRect.contain(itemLayout[0], itemLayout[1])
                    && polygonContain(brushRange.range, itemLayout[0], itemLayout[1])
                ) {
                    console.log(itemLayout, JSON.stringify(brushRange));
                }

                return boundingRect.contain(itemLayout[0], itemLayout[1])
                    && polygonContain(brushRange.range, itemLayout[0], itemLayout[1]);
            }
        }
    };

    return {

        isInBrush: isInBrush,

        /**
         * Brushed is get by API, but not by event params, because when user calls
         * setOption, no event triggered to tell user which are brushed.
         * And on other event like dataZoom, user may need brushed params too.
         * @public
         * @return {Array.<number>} Brushed data index list.
         */
        getBrushed: function () {
            return this.__brushedRawIndices || [];
        }
    };
});