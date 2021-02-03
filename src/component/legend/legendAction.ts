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

// @ts-nocheck

import {curry, each} from 'zrender/src/core/util';

function legendSelectActionHandler(methodName, payload, ecModel) {
    const selectedMap = {};
    const isToggleSelect = methodName === 'toggleSelected';
    let isSelected;
    // Update all legend components
    ecModel.eachComponent('legend', function (legendModel) {
        if (isToggleSelect && isSelected != null) {
            // Force other legend has same selected status
            // Or the first is toggled to true and other are toggled to false
            // In the case one legend has some item unSelected in option. And if other legend
            // doesn't has the item, they will assume it is selected.
            legendModel[isSelected ? 'select' : 'unSelect'](payload.name);
        }
        else if (methodName === 'allSelect' || methodName === 'inverseSelect') {
            legendModel[methodName]();
        }
        else {
            legendModel[methodName](payload.name);
            isSelected = legendModel.isSelected(payload.name);
        }
        const legendData = legendModel.getData();
        each(legendData, function (model) {
            const name = model.get('name');
            // Wrap element
            if (name === '\n' || name === '') {
                return;
            }
            const isItemSelected = legendModel.isSelected(name);
            if (selectedMap.hasOwnProperty(name)) {
                // Unselected if any legend is unselected
                selectedMap[name] = selectedMap[name] && isItemSelected;
            }
            else {
                selectedMap[name] = isItemSelected;
            }
        });
    });
    // Return the event explicitly
    return (methodName === 'allSelect' || methodName === 'inverseSelect')
        ? {
            selected: selectedMap
        }
        : {
            name: payload.name,
            selected: selectedMap
        };
}

export function installLegendAction(registers) {
    /**
     * @event legendToggleSelect
     * @type {Object}
     * @property {string} type 'legendToggleSelect'
     * @property {string} [from]
     * @property {string} name Series name or data item name
     */
    registers.registerAction(
        'legendToggleSelect', 'legendselectchanged',
        curry(legendSelectActionHandler, 'toggleSelected')
    );

    registers.registerAction(
        'legendAllSelect', 'legendselectall',
        curry(legendSelectActionHandler, 'allSelect')
    );

    registers.registerAction(
        'legendInverseSelect', 'legendinverseselect',
        curry(legendSelectActionHandler, 'inverseSelect')
    );

    /**
     * @event legendSelect
     * @type {Object}
     * @property {string} type 'legendSelect'
     * @property {string} name Series name or data item name
     */
    registers.registerAction(
        'legendSelect', 'legendselected',
        curry(legendSelectActionHandler, 'select')
    );

    /**
     * @event legendUnSelect
     * @type {Object}
     * @property {string} type 'legendUnSelect'
     * @property {string} name Series name or data item name
     */
    registers.registerAction(
        'legendUnSelect', 'legendunselected',
        curry(legendSelectActionHandler, 'unSelect')
    );
}