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

import {each, createHashMap, HashMap} from 'zrender/src/core/util';
import mapDataStorage, { MapRecord } from './mapDataStorage';
import geoJSONLoader from './geoJSONLoader';
import geoSVGLoader from './geoSVGLoader';
import BoundingRect from 'zrender/src/core/BoundingRect';
import { NameMap } from './geoTypes';
import Region from './Region';
import { Dictionary } from 'zrender/src/core/types';
import Group from 'zrender/src/graphic/Group';


interface Loader {
    load: (mapName: string, mapRecord: MapRecord, nameProperty?: string) => {
        regions?: Region[];
        boundingRect?: BoundingRect;
    };
    makeGraphic?: (mapName: string, mapRecord: MapRecord, hostKey: string) => Group;
    removeGraphic?: (mapName: string, mapRecord: MapRecord, hostKey: string) => void;
}
const loaders = {
    geoJSON: geoJSONLoader,
    svg: geoSVGLoader
} as Dictionary<Loader>;

export default {

    load: function (mapName: string, nameMap: NameMap, nameProperty?: string): {
        regions: Region[];
        // Key: mapName
        regionsMap: HashMap<Region>;
        // Key: mapName
        nameCoordMap: HashMap<number[]>;
        boundingRect: BoundingRect
    } {
        const regions = [] as Region[];
        const regionsMap = createHashMap<Region>();
        const nameCoordMap = createHashMap<Region['center']>();
        let boundingRect: BoundingRect;
        const mapRecords = retrieveMap(mapName);

        each(mapRecords, function (record) {
            const singleSource = loaders[record.type].load(mapName, record, nameProperty);

            each(singleSource.regions, function (region) {
                let regionName = region.name;

                // Try use the alias in geoNameMap
                if (nameMap && nameMap.hasOwnProperty(regionName)) {
                    region = region.cloneShallow(regionName = nameMap[regionName]);
                }

                regions.push(region);
                regionsMap.set(regionName, region);
                nameCoordMap.set(regionName, region.center);
            });

            const rect = singleSource.boundingRect;
            if (rect) {
                boundingRect
                    ? boundingRect.union(rect)
                    : (boundingRect = rect.clone());
            }
        });

        return {
            regions: regions,
            regionsMap: regionsMap,
            nameCoordMap: nameCoordMap,
            // FIXME Always return new ?
            boundingRect: boundingRect || new BoundingRect(0, 0, 0, 0)
        };
    },

    /**
     * @param hostKey For cache.
     * @return Roots.
     */
    makeGraphic: function (mapName: string, hostKey: string): Group[] {
        const mapRecords = retrieveMap(mapName);
        const results = [] as Group[];
        each(mapRecords, function (record) {
            const method = loaders[record.type].makeGraphic;
            method && results.push(method(mapName, record, hostKey));
        });
        return results;
    },

    /**
     * @param hostKey For cache.
     */
    removeGraphic: function (mapName: string, hostKey: string): void {
        const mapRecords = retrieveMap(mapName);
        each(mapRecords, function (record) {
            const method = loaders[record.type].makeGraphic;
            method && method(mapName, record, hostKey);
        });
    }
};

function mapNotExistsError(mapName: string): void {
    if (__DEV__) {
        console.error(
            'Map ' + mapName + ' not exists. The GeoJSON of the map must be provided.'
        );
    }
}

function retrieveMap(mapName: string): MapRecord[] {
    const mapRecords = mapDataStorage.retrieveMap(mapName) || [];

    if (__DEV__) {
        if (!mapRecords.length) {
            mapNotExistsError(mapName);
        }
    }

    return mapRecords;
}

