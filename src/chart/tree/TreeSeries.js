/**
 * @file Create data struct and define tree view's series model
 */

define(function (require) {

    var SeriesModel = require('../../model/Series');
    var Tree = require('../../data/Tree');

    return SeriesModel.extend({

        type: 'series.tree',

        layoutInfo: null,

        /**
         * Init a tree data structure from data in option series
         *
         * @param  {Object} option  the object used to config echarts view
         * @return {module:echarts/data/List} storage initial data
         */
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

            // the layout of the tree, two value can be selected, 'orthogonal' or 'radial'
            layout: 'orthogonal',

            // the orient of orthoginal layout, can be setted to 'horizontal' or 'vertical'
            orient: 'horizontal',

            // the radius of the node circle
            nodeRadius: 2

        }

    });

});