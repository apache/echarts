define(function(require) {

    'use strict';

    return require('../../model/Component').extend({

        type: 'grid',

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 0,                       // 二级层叠
            x: 80,
            y: 60,
            x2: 80,
            y2: 60,
            // width: {totalWidth} - x - x2,
            // height: {totalHeight} - y - y2,
            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 1,
            borderColor: '#ccc'
        }
    });
});