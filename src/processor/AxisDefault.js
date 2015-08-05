define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    // Process axis to add the default properties
    return require('./Processor').extend({

        type: 'axisDefault',

        optionChanged: function (optionModel) {
            var xAxesList = optionModel.get('xAxis');
            var yAxesList = optionModel.get('yAxis');

            if (xAxesList && ! (xAxesList instanceof Array)) {
                xAxesList = [xAxesList];
            }
            if (yAxesList && ! (yAxesList instanceof Array)) {
                yAxesList = [yAxesList];
            }

            // Find if any axis has position make the x axis vertical orientation
            var isXHorizontal = true;
            var position;
            var xAxesLen = xAxesList.length;
            var yAxesLen = yAxesList.length;
            for (var i = 0; i < xAxesLen; i++) {
                // Merge
                var xAxis = xAxesList[i];
                // If has vertical x axis
                position = xAxis.position;
                if (position === 'left' || position === 'right') {
                    isXHorizontal = false;
                    break;
                }
            }
            if (isXHorizontal) {
                // If has horizontal y axis
                for (var i = 0; i < yAxesLen; i++) {
                    position = yAxesList[i].position;
                    if (position === 'top' || position === 'bottom') {
                        isXHorizontal = false;
                        break;
                    }
                }
            }

            var gridPositionOccupied = {
                left: false,
                top: false,
                bottom: false,
                right: false
            };

            function processAxesSingleDim(name, axisList) {
                for (var i = 0; i < axisList.length; i++) {
                    var axis = axisList[i];
                    var position = axis.position;

                    if (name === 'x') {
                        // X Axis is default category
                        axis.type = axis.type || 'category';
                    }
                    else {
                        // Y Axis is default value
                        axis.type = axis.type || 'value';
                    }
                    // Merge from option with specified type
                    zrUtil.merge(xAxis, optionModel.get(axis.type + 'Axis'));

                    // Default axis position:
                    //  x axis on the bottom and y axis on the left
                    if (
                        (name === 'x' && isXHorizontal)
                        || (name === 'y' && ! isXHorizontal)
                    ) {
                        position = gridPositionOccupied.bottom ?
                            'top ' : 'bottom';
                    }
                    else {
                        position = gridPositionOccupied.left ?
                            'right ' : 'left';
                    }
                    axis.position = position;

                    // Take the position on the grid
                    gridPositionOccupied[position] = true;
                }
            }

            processAxesSingleDim('x', xAxesList);
            processAxesSingleDim('y', yAxesList);

            optionModel.set('xAxis', xAxesList);
            optionModel.set('yAxis', yAxesList);
        }
    });
});