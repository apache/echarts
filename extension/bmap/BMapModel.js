define(function (require) {

    return require('echarts').extendComponentModel({
        type: 'bmap',

        getBMap: function () {
            // __bmap is injected when creating BMapCoordSys
            return this.__bmap;
        },

        defaultOption: {
            center: null,

            zoom: 1,

            mapStyle: {},

            roam: false
        }
    });
});