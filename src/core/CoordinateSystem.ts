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

import * as zrUtil from 'zrender/src/core/util';

import type GlobalModel from '../model/Global';
import type ExtensionAPI from './ExtensionAPI';
import type { CoordinateSystemCreator, CoordinateSystemMaster } from '../coord/CoordinateSystem';

const coordinateSystemCreators: {[type: string]: CoordinateSystemCreator} = {};

class CoordinateSystemManager {

    private _coordinateSystems: CoordinateSystemMaster[] = [];

    create(ecModel: GlobalModel, api: ExtensionAPI): void {
        let coordinateSystems: CoordinateSystemMaster[] = [];
        zrUtil.each(coordinateSystemCreators, function (creator, type) {
            const list = creator.create(ecModel, api);
            coordinateSystems = coordinateSystems.concat(list || []);
        });

        this._coordinateSystems = coordinateSystems;
    }

    update(ecModel: GlobalModel, api: ExtensionAPI): void {
        zrUtil.each(this._coordinateSystems, function (coordSys) {
            coordSys.update && coordSys.update(ecModel, api);
        });
    }

    getCoordinateSystems(): CoordinateSystemMaster[] {
        return this._coordinateSystems.slice();
    }

    static register = function (type: string, creator: CoordinateSystemCreator): void {
        coordinateSystemCreators[type] = creator;
    };

    static get = function (type: string): CoordinateSystemCreator {
        return coordinateSystemCreators[type];
    };

}

export default CoordinateSystemManager;
