import * as zrUtil from 'zrender/src/core/util';
import * as modelUtil from '../../util/model';
import ComponentModel from '../../model/Component';
import Model from '../../model/Model';
import selectableMixin from '../../component/helper/selectableMixin';
import geoCreator from './geoCreator';

var GeoModel = ComponentModel.extend({

    type: 'geo',

    /**
     * @type {module:echarts/coord/geo/Geo}
     */
    coordinateSystem: null,

    layoutMode: 'box',

    init: function (option) {
        ComponentModel.prototype.init.apply(this, arguments);

        // Default label emphasis `show`
        modelUtil.defaultEmphasis(option.label, ['show']);
    },

    optionUpdated: function () {
        var option = this.option;
        var self = this;

        option.regions = geoCreator.getFilledRegions(option.regions, option.map, option.nameMap);

        this._optionModelMap = zrUtil.reduce(option.regions || [], function (optionModelMap, regionOpt) {
            if (regionOpt.name) {
                optionModelMap.set(regionOpt.name, new Model(regionOpt, self));
            }
            return optionModelMap;
        }, zrUtil.createHashMap());

        this.updateSelectedMap(option.regions);
    },

    defaultOption: {

        zlevel: 0,

        z: 0,

        show: true,

        left: 'center',

        top: 'center',


        // width:,
        // height:,
        // right
        // bottom

        // Aspect is width / height. Inited to be geoJson bbox aspect
        // This parameter is used for scale this aspect
        aspectScale: 0.75,

        ///// Layout with center and size
        // If you wan't to put map in a fixed size box with right aspect ratio
        // This two properties may more conveninet
        // layoutCenter: [50%, 50%]
        // layoutSize: 100


        silent: false,

        // Map type
        map: '',

        // Define left-top, right-bottom coords to control view
        // For example, [ [180, 90], [-180, -90] ]
        boundingCoords: null,

        // Default on center of map
        center: null,

        zoom: 1,

        scaleLimit: null,

        // selectedMode: false

        label: {
            normal: {
                show: false,
                color: '#000'
            },
            emphasis: {
                show: true,
                color: 'rgb(100,0,0)'
            }
        },

        itemStyle: {
            normal: {
                // color: 各异,
                borderWidth: 0.5,
                borderColor: '#444',
                color: '#eee'
            },
            emphasis: {                 // 也是选中样式
                color: 'rgba(255,215,0,0.8)'
            }
        },

        regions: []
    },

    /**
     * Get model of region
     * @param  {string} name
     * @return {module:echarts/model/Model}
     */
    getRegionModel: function (name) {
        return this._optionModelMap.get(name) || new Model(null, this, this.ecModel);
    },

    /**
     * Format label
     * @param {string} name Region name
     * @param {string} [status='normal'] 'normal' or 'emphasis'
     * @return {string}
     */
    getFormattedLabel: function (name, status) {
        var regionModel = this.getRegionModel(name);
        var formatter = regionModel.get('label.' + status + '.formatter');
        var params = {
            name: name
        };
        if (typeof formatter === 'function') {
            params.status = status;
            return formatter(params);
        }
        else if (typeof formatter === 'string') {
            return formatter.replace('{a}', name != null ? name : '');
        }
    },

    setZoom: function (zoom) {
        this.option.zoom = zoom;
    },

    setCenter: function (center) {
        this.option.center = center;
    }
});

zrUtil.mixin(GeoModel, selectableMixin);

export default GeoModel;