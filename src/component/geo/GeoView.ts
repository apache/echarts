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


import MapDraw from '../helper/MapDraw';
import ComponentView from '../../view/Component';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import GeoModel from '../../coord/geo/GeoModel';
import { Payload, ZRElementEvent, ECEventData } from '../../util/types';
import { getECData } from '../../util/innerStore';

class GeoView extends ComponentView {

    static type = 'geo' as const;
    readonly type = GeoView.type;

    private _mapDraw: MapDraw;

    private _api: ExtensionAPI;

    private _model: GeoModel;

    init(ecModel: GlobalModel, api: ExtensionAPI) {
        const mapDraw = new MapDraw(api);
        this._mapDraw = mapDraw;

        this.group.add(mapDraw.group);

        this._api = api;
    }

    render(
        geoModel: GeoModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload
    ): void {
        const mapDraw = this._mapDraw;
        if (geoModel.get('show')) {
            mapDraw.draw(geoModel, ecModel, api, this, payload);
        }
        else {
            this._mapDraw.group.removeAll();
        }

        mapDraw.group.on('click', this._handleRegionClick, this);
        mapDraw.group.silent = geoModel.get('silent');

        this._model = geoModel;

        this.updateSelectStatus(geoModel, ecModel, api);
    }

    private _handleRegionClick(e: ZRElementEvent) {
        let current = e.target;
        let eventData: ECEventData;
        // TODO extract a util function
        while (current && (eventData = getECData(current).eventData) == null) {
            current = current.__hostTarget || current.parent;
        }

        if (eventData) {
            this._api.dispatchAction({
                type: 'geoToggleSelect',
                geoId: this._model.id,
                name: eventData.name
            });
        }
    }

    updateSelectStatus(model: GeoModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this._mapDraw.group.traverse((node) => {
            const eventData = getECData(node).eventData;
            if (eventData) {
                this._model.isSelected(eventData.name)
                    ? api.enterSelect(node) : api.leaveSelect(node);
                // No need to traverse children.
                return true;
            }
        });
    }

    dispose(): void {
        this._mapDraw && this._mapDraw.remove();
    }

}

export default GeoView;
