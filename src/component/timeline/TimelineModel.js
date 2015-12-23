/**
 * @file Timeline model
 */
define(function(require) {

    var ComponentModel = require('../../model/Component');
    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');

    var TimelineModel = ComponentModel.extend({

        type: 'timeline',

        /**
         * @protected
         */
        defaultOption: {

            zlevel: 0,                  // 一级层叠
            z: 4,                       // 二级层叠
            show: true,

            axisType: 'time',  // 模式是时间类型，支持 value, category

            realtime: true,

            x: '20%',
            y: null,
            x2: '20%',
            y2: 0,
            width: null,
            height: 40,
            padding: 5,

            controlPosition: 'left',           // 'right' | 'none'
            autoPlay: false,
            loop: true,
            playInterval: 2000,                // 播放时间间隔，单位ms

            currentIndex: 0,

            itemStyle: {
                normal: {},
                emphasis: {}
            },
            label: {
                normal: {
                    textStyle: {
                        color: '#000'
                    }
                },
                emphasis: {}
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

            this.mergeDefaultAndTheme(option, ecModel);
            this.mergeOption({}, true);
        },

        /**
         * @override
         */
        mergeOption: function (newOption) {
            newOption && zrUtil.merge(this.option, newOption);

            this._initData();
        },

        /**
         * @public
         */
        infectOption: function (timelineOption) {
            var thisOption = this.option;

            if (zrUtil.isArray(timelineOption)) {
                timelineOption = timelineOption[0];
            }
            if (timelineOption) {
                timelineOption.currentIndex = thisOption.currentIndex;
                timelineOption.autoPlay = thisOption.autoPlay;
            }
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
            var names = [];

            if (axisType === 'category') {
                var idxArr = [];
                zrUtil.each(dataArr, function (item, index) {
                    idxArr.push(index);

                    var name = zrUtil.isObject(item) ? item.value : item;
                    if (!zrUtil.isString(name) && (name == null || isNaN(name))) {
                        name = '';
                    }

                    names.push(name + '');
                });
                dataArr = idxArr;
            }

            var data = this._data = new List(['value'], this);
            data.initData(dataArr, names, function (dataItem) {
                if (axisType === 'time') {
                    if (zrUtil.isObject(dataItem)) {
                        dataItem.value = +numberUtil.parseDate(dataItem.value);
                        return dataItem;
                    }
                    else {
                        return +numberUtil.parseDate(dataItem);
                    }
                }
                return dataItem;
            });
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
                return this.get('data').slice();
            }
        }

    });

    return TimelineModel;
});