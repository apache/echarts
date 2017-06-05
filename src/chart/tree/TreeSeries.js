/**
 * @file Create data struct and define tree view's series model
 * @author Deqing Li(annong035@gmail.com)
 */

define(function (require) {

    var SeriesModel = require('../../model/Series');
    var Tree = require('../../data/Tree');

    return SeriesModel.extend({

        type: 'series.tree',

        layoutInfo: null,

        getInitialData: function (option) {

            //create an virtual root
            var root = {name: option.name, children: option.data};

            return Tree.createTree(root, this).data;

        },

        defaultOption: {
            zlevel: 0,
            z: 2,

            // the position of the whole view
            left: '5%',
            top: '5%',
            right: '10%',
            bottom: '5%',

            layout: 'orthogonal',
            orient: 'horizontal'

        }

    });

});