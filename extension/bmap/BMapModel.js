define(function (require) {

    return require('echarts').extendComponentModel({
        type: 'bmap',

        getBMap: function () {
            // __bmap is injected when creating BMapCoordSys
            return this.__bmap;
        },

        setCenterAndZoom: function (center, zoom) {
            this.option.center = center;
            this.option.zoom = zoom;
        },

        defaultOption: {
            center: null,

            zoom: 1,

            mapStyle: {},

            roam: false
        }
    });
});