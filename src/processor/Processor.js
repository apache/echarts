define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    var Processor = function () {};

    Processor.prototype = {

        constructor: Processor,

        type: '',

        // Processor 第一次使用的时候调用
        init: function () {
            this.state = this.getInitialState();
        },

        // Should be overwritten
        getInitialState: function () { return {} },

        setState: function (state) {},

        optionChanged: function (optionChanged) {},

        syncState: function (globalState) {},

        // Should be overwritten
        process: function (option) {}
    };

    Processor.extend = function (proto) {
        var Super = this;

        var ExtendedProcessor = function () {
            Super.call(this);
        };

        for (var name in proto) {
            ExtendedProcessor.prototype[name] = proto[name];
        }

        ExtendedProcessor.extend = Super.extend;

        zrUtil.inherits(ExtendedProcessor, Super);

        return ExtendedProcessor;
    }

    return Processor;
});