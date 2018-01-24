import * as zrUtil from 'zrender/src/core/util';
import ComponentModel from '../../model/Component';
import List from '../../data/List';
import * as modelUtil from '../../util/model';

var TimelineModel = ComponentModel.extend({

    type: 'timeline',

    layoutMode: 'box',

    /**
     * @protected
     */
    defaultOption: {

        zlevel: 0,                  // 一级层叠
        z: 4,                       // 二级层叠
        show: true,

        axisType: 'time',  // 模式是时间类型，支持 value, category

        realtime: true,

        left: '20%',
        top: null,
        right: '20%',
        bottom: 0,
        width: null,
        height: 40,
        padding: 5,

        controlPosition: 'left',           // 'left' 'right' 'top' 'bottom' 'none'
        autoPlay: false,
        rewind: false,                     // 反向播放
        loop: true,
        playInterval: 2000,                // 播放时间间隔，单位ms

        currentIndex: 0,

        itemStyle: {},
        label: {
            color: '#000'
        },

        data: []
    },

    /**
     * @override
     */
    init: function (option, parentModel, ecModel) {

        /**
         * @private
         * @type {module:echarts/data/List}
         */
        this._data;

        /**
         * @private
         * @type {Array.<string>}
         */
        this._names;

        this.mergeDefaultAndTheme(option, ecModel);
        this._initData();
    },

    /**
     * @override
     */
    mergeOption: function (option) {
        TimelineModel.superApply(this, 'mergeOption', arguments);
        this._initData();
    },

    /**
     * @param {number} [currentIndex]
     */
    setCurrentIndex: function (currentIndex) {
        if (currentIndex == null) {
            currentIndex = this.option.currentIndex;
        }
        var count = this._data.count();

        if (this.option.loop) {
            currentIndex = (currentIndex % count + count) % count;
        }
        else {
            currentIndex >= count && (currentIndex = count - 1);
            currentIndex < 0 && (currentIndex = 0);
        }

        this.option.currentIndex = currentIndex;
    },

    /**
     * @return {number} currentIndex
     */
    getCurrentIndex: function () {
        return this.option.currentIndex;
    },

    /**
     * @return {boolean}
     */
    isIndexMax: function () {
        return this.getCurrentIndex() >= this._data.count() - 1;
    },

    /**
     * @param {boolean} state true: play, false: stop
     */
    setPlayState: function (state) {
        this.option.autoPlay = !!state;
    },

    /**
     * @return {boolean} true: play, false: stop
     */
    getPlayState: function () {
        return !!this.option.autoPlay;
    },

    /**
     * @private
     */
    _initData: function () {
        var thisOption = this.option;
        var dataArr = thisOption.data || [];
        var axisType = thisOption.axisType;
        var names = this._names = [];

        if (axisType === 'category') {
            var idxArr = [];
            zrUtil.each(dataArr, function (item, index) {
                var value = modelUtil.getDataItemValue(item);
                var newItem;

                if (zrUtil.isObject(item)) {
                    newItem = zrUtil.clone(item);
                    newItem.value = index;
                }
                else {
                    newItem = index;
                }

                idxArr.push(newItem);

                if (!zrUtil.isString(value) && (value == null || isNaN(value))) {
                    value = '';
                }

                names.push(value + '');
            });
            dataArr = idxArr;
        }

        var dimType = ({category: 'ordinal', time: 'time'})[axisType] || 'number';

        var data = this._data = new List([{name: 'value', type: dimType}], this);

        data.initData(dataArr, names);
    },

    getData: function () {
        return this._data;
    },

    /**
     * @public
     * @return {Array.<string>} categoreis
     */
    getCategories: function () {
        if (this.get('axisType') === 'category') {
            return this._names.slice();
        }
    }

});

export default TimelineModel;