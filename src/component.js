/**
 * echart组件库
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function(require) {    //component
    var self = {};

    var _componentLibrary = {};     //echart组件库

    /**
     * 定义图形实现
     * @param {Object} name
     * @param {Object} clazz 图形实现
     */
    self.define = function(name, clazz) {
        _componentLibrary[name] = clazz;
        return self;
    };

    /**
     * 获取图形实现
     * @param {Object} name
     */
    self.get = function(name) {
        return _componentLibrary[name];
    };

    // 内置组件注册
    self.define('axis', require('./component/axis'));

    self.define('categoryAxis', require('./component/categoryAxis'));

    self.define('valueAxis', require('./component/valueAxis'));

    self.define('grid', require('./component/grid'));

    self.define('dataZoom', require('./component/dataZoom'));

    self.define('legend', require('./component/legend'));
    
    self.define('dataRange', require('./component/dataRange'));

    self.define('tooltip', require('./component/tooltip'));

    self.define('toolbox', require('./component/toolbox'));

    self.define('dataView', require('./component/dataView'));

    return self;
});