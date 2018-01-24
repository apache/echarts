import * as zrUtil from 'zrender/src/core/util';
import createListSimply from '../helper/createListSimply';
import SeriesModel from '../../model/Series';
import {encodeHTML, addCommas} from '../../util/format';
import dataSelectableMixin from '../../component/helper/selectableMixin';
// import geoCreator from '../../coord/geo/geoCreator';

var MapSeries = SeriesModel.extend({

    type: 'series.map',

    dependencies: ['geo'],

    layoutMode: 'box',

    /**
     * Only first map series of same mapType will drawMap
     * @type {boolean}
     */
    needsDrawMap: false,

    /**
     * Group of all map series with same mapType
     * @type {boolean}
     */
    seriesGroup: [],

    init: function (option) {

        this._fillOption(option, this.getMapType());
        // this.option = option;

        MapSeries.superApply(this, 'init', arguments);

        this.updateSelectedMap(this.getRawData());
    },

    getInitialData: function (option) {
        return createListSimply(this, ['value']);
    },

    mergeOption: function (newOption) {
        this._fillOption(newOption, this.getMapType());

        MapSeries.superApply(this, 'mergeOption', arguments);

        this.updateSelectedMap(this.getRawData());
    },

    /**
     * If no host geo model, return null, which means using a
     * inner exclusive geo model.
     */
    getHostGeoModel: function () {
        var geoIndex = this.option.geoIndex;
        return geoIndex != null
            ? this.dependentModels.geo[geoIndex]
            : null;
    },

    getMapType: function () {
        return (this.getHostGeoModel() || this).option.map;
    },

    _fillOption: function (option, mapName) {
        // Shallow clone
        // option = zrUtil.extend({}, option);

        // option.data = geoCreator.getFilledRegions(option.data, mapName, option.nameMap);

        // return option;
    },

    getRawValue: function (dataIndex) {
        // Use value stored in data instead because it is calculated from multiple series
        // FIXME Provide all value of multiple series ?
        var data = this.getData();
        return data.get(data.mapDimension('value'), dataIndex);
    },

    /**
     * Get model of region
     * @param  {string} name
     * @return {module:echarts/model/Model}
     */
    getRegionModel: function (regionName) {
        var data = this.getData();
        return data.getItemModel(data.indexOfName(regionName));
    },

    /**
     * Map tooltip formatter
     *
     * @param {number} dataIndex
     */
    formatTooltip: function (dataIndex) {
        // FIXME orignalData and data is a bit confusing
        var data = this.getData();
        var formattedValue = addCommas(this.getRawValue(dataIndex));
        var name = data.getName(dataIndex);

        var seriesGroup = this.seriesGroup;
        var seriesNames = [];
        for (var i = 0; i < seriesGroup.length; i++) {
            var otherIndex = seriesGroup[i].originalData.indexOfName(name);
            var valueDim = data.mapDimension('value');
            if (!isNaN(seriesGroup[i].originalData.get(valueDim, otherIndex))) {
                seriesNames.push(
                    encodeHTML(seriesGroup[i].name)
                );
            }
        }

        return seriesNames.join(', ') + '<br />'
            + encodeHTML(name + ' : ' + formattedValue);
    },

    /**
     * @implement
     */
    getTooltipPosition: function (dataIndex) {
        if (dataIndex != null) {
            var name = this.getData().getName(dataIndex);
            var geo = this.coordinateSystem;
            var region = geo.getRegion(name);

            return region && geo.dataToPoint(region.center);
        }
    },

    setZoom: function (zoom) {
        this.option.zoom = zoom;
    },

    setCenter: function (center) {
        this.option.center = center;
    },

    defaultOption: {
        // 一级层叠
        zlevel: 0,
        // 二级层叠
        z: 2,

        coordinateSystem: 'geo',

        // map should be explicitly specified since ec3.
        map: '',

        // If `geoIndex` is not specified, a exclusive geo will be
        // created. Otherwise use the specified geo component, and
        // `map` and `mapType` are ignored.
        // geoIndex: 0,

        // 'center' | 'left' | 'right' | 'x%' | {number}
        left: 'center',
        // 'center' | 'top' | 'bottom' | 'x%' | {number}
        top: 'center',
        // right
        // bottom
        // width:
        // height

        // Aspect is width / height. Inited to be geoJson bbox aspect
        // This parameter is used for scale this aspect
        aspectScale: 0.75,

        ///// Layout with center and size
        // If you wan't to put map in a fixed size box with right aspect ratio
        // This two properties may more conveninet
        // layoutCenter: [50%, 50%]
        // layoutSize: 100


        // 数值合并方式，默认加和，可选为：
        // 'sum' | 'average' | 'max' | 'min'
        // mapValueCalculation: 'sum',
        // 地图数值计算结果小数精度
        // mapValuePrecision: 0,


        // 显示图例颜色标识（系列标识的小圆点），图例开启时有效
        showLegendSymbol: true,
        // 选择模式，默认关闭，可选single，multiple
        // selectedMode: false,
        dataRangeHoverLink: true,
        // 是否开启缩放及漫游模式
        // roam: false,

        // Define left-top, right-bottom coords to control view
        // For example, [ [180, 90], [-180, -90] ],
        // higher priority than center and zoom
        boundingCoords: null,

        // Default on center of map
        center: null,

        zoom: 1,

        scaleLimit: null,

        label: {
            show: false,
            color: '#000'
        },
        // scaleLimit: null,
        itemStyle: {
            borderWidth: 0.5,
            borderColor: '#444',
            areaColor: '#eee'
        },

        emphasis: {
            label: {
                show: true,
                color: 'rgb(100,0,0)'
            },
            itemStyle: {
                areaColor: 'rgba(255,215,0,0.8)'
            }
        }
    }

});

zrUtil.mixin(MapSeries, dataSelectableMixin);

export default MapSeries;