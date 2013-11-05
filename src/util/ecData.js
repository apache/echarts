/**
 * echarts通用私有数据服务
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function() {
    /**
     * 打包私有数据
     *
     * @param {shape} shape 修改目标
     * @param {Object} series
     * @param {number} seriesIndex
     * @param {number | Object} data
     * @param {number} dataIndex
     * @param {*=} special
     * @param {*=} special2
     */
    function pack(
        shape, series, seriesIndex, data, dataIndex, name, special, special2
    ) {
        var value;
        if (typeof data != 'undefined') {
            if (typeof data.value != 'undefined') {
                value = data.value;
            }
            else {
                value = data;
            }
        }

        shape._echartsData =  {
            '_series' : series,
            '_seriesIndex' : seriesIndex,
            '_data' : data,
            '_dataIndex' : dataIndex,
            '_name' : name,
            '_value' : value,
            '_special' : special,
            '_special2' : special2
        };
        return shape._echartsData;
    }

    /**
     * 从私有数据中获取特定项
     * @param {shape} shape
     * @param {string} key
     */
    function get(shape, key) {
        var data = shape._echartsData;
        if (!key) {
            return data;
        }

        switch (key) {
            case 'series' :
                return data && data._series;
            case 'seriesIndex' :
                return data && data._seriesIndex;
            case 'data' :
                return data && data._data;
            case 'dataIndex' :
                return data && data._dataIndex;
            case 'name' :
                return data && data._name;
            case 'value' :
                return data && data._value;
            case 'special' :
                return data && data._special;
            case 'special2' :
                return data && data._special2;
        }

        return null;
    }

    /**
     * 修改私有数据中获取特定项
     * @param {shape} shape
     * @param {string} key
     * @param {*} value
     */
    function set(shape, key, value) {
        shape._echartsData = shape._echartsData || {};
        switch (key) {
            case 'series' :             // 当前系列值
                shape._echartsData._series = value;
                break;
            case 'seriesIndex' :        // 系列数组位置索引
                shape._echartsData._seriesIndex = value;
                break;
            case 'data' :               // 当前数据值
                shape._echartsData._data = value;
                break;
            case 'dataIndex' :          // 数据数组位置索引
                shape._echartsData._dataIndex = value;
                break;
            case 'name' :
                shape._echartsData._name = value;
                break;
            case 'value' :
                shape._echartsData._value = value;
                break;
            case 'special' :
                shape._echartsData._special = value;
                break;
            case 'special2' :
                shape._echartsData._special2 = value;
                break;
        }
    }

    return {
        pack : pack,
        set : set,
        get : get
    };
});