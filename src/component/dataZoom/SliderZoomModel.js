/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import DataZoomModel from './DataZoomModel';

var SliderZoomModel = DataZoomModel.extend({

    type: 'dataZoom.slider',

    layoutMode: 'box',

    /**
     * @protected
     */
    defaultOption: {
        show: true,

        // ph => placeholder. Using placehoder here because
        // deault value can only be drived in view stage.
        right: 'ph',  // Default align to grid rect.
        top: 'ph',    // Default align to grid rect.
        width: 'ph',  // Default align to grid rect.
        height: 'ph', // Default align to grid rect.
        left: null,   // Default align to grid rect.
        bottom: null, // Default align to grid rect.

        backgroundColor: 'rgba(47,69,84,0)',    // Background of slider zoom component.
        // dataBackgroundColor: '#ddd',         // Background coor of data shadow and border of box,
                                                // highest priority, remain for compatibility of
                                                // previous version, but not recommended any more.
        dataBackground: {
            lineStyle: {
                color: '#2f4554',
                width: 0.5,
                opacity: 0.3
            },
            areaStyle: {
                color: 'rgba(47,69,84,0.3)',
                opacity: 0.3
            }
        },
        borderColor: '#ddd',                    // border color of the box. For compatibility,
                                                // if dataBackgroundColor is set, borderColor
                                                // is ignored.

        fillerColor: 'rgba(167,183,204,0.4)',     // Color of selected area.
        // handleColor: 'rgba(89,170,216,0.95)',     // Color of handle.
        // handleIcon: 'path://M4.9,17.8c0-1.4,4.5-10.5,5.5-12.4c0-0.1,0.6-1.1,0.9-1.1c0.4,0,0.9,1,0.9,1.1c1.1,2.2,5.4,11,5.4,12.4v17.8c0,1.5-0.6,2.1-1.3,2.1H6.1c-0.7,0-1.3-0.6-1.3-2.1V17.8z',
        handleIcon: 'M8.2,13.6V3.9H6.3v9.7H3.1v14.9h3.3v9.7h1.8v-9.7h3.3V13.6H8.2z M9.7,24.4H4.8v-1.4h4.9V24.4z M9.7,19.1H4.8v-1.4h4.9V19.1z',
        // Percent of the slider height
        handleSize: '100%',

        handleStyle: {
            color: '#a7b7cc'
        },

        labelPrecision: null,
        labelFormatter: null,
        showDetail: true,
        showDataShadow: 'auto',                 // Default auto decision.
        realtime: true,
        zoomLock: false,                        // Whether disable zoom.
        textStyle: {
            color: '#333'
        }
    }

});

export default SliderZoomModel;
