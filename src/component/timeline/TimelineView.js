/**
 * @file Timeline view
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var ComponentView = require('../../view/Component');
    var Rect = graphic.Rect;
    var numberUtil = require('../../util/number');
    var linearMap = numberUtil.linearMap;
    var sliderMove = require('../helper/sliderMove');
    var retrieveValue = zrUtil.retrieve;
    var parsePercent = numberUtil.parsePercent;
    var asc = numberUtil.asc;
    var bind = zrUtil.bind;
    var mathRound = Math.round;
    var mathMax = Math.max;
    var each = zrUtil.each;

    // Constants

    return ComponentView.extend({

        type: 'timeline'

    });

});