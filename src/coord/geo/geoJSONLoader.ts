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

import {each} from 'zrender/src/core/util';
import parseGeoJson from './parseGeoJson';
import {makeInner} from '../../util/model';

// Built-in GEO fixer.
import fixNanhai from './fix/nanhai';
import fixTextCoord from './fix/textCoord';
import fixGeoCoord from './fix/geoCoord';
import fixDiaoyuIsland from './fix/diaoyuIsland';
import { GeoJSONMapRecord } from './mapDataStorage';
import BoundingRect from 'zrender/src/core/BoundingRect';
import Region from './Region';

type MapRecordInner = {
    parsed: {
        regions: Region[];
        boundingRect: BoundingRect;
    };
};

const inner = makeInner<MapRecordInner, GeoJSONMapRecord>();

export default {

    load(mapName: string, mapRecord: GeoJSONMapRecord, nameProperty: string): MapRecordInner['parsed'] {

        const parsed = inner(mapRecord).parsed;

        if (parsed) {
            return parsed;
        }

        const specialAreas = mapRecord.specialAreas || {};
        const geoJSON = mapRecord.geoJSON;
        let regions;

        // https://jsperf.com/try-catch-performance-overhead
        try {
            regions = geoJSON ? parseGeoJson(geoJSON, nameProperty) : [];
        }
        catch (e) {
            throw new Error('Invalid geoJson format\n' + e.message);
        }

        fixNanhai(mapName, regions);

        each(regions, function (region) {
            const regionName = region.name;

            fixTextCoord(mapName, region);
            fixGeoCoord(mapName, region);
            fixDiaoyuIsland(mapName, region);

            // Some area like Alaska in USA map needs to be tansformed
            // to look better
            const specialArea = specialAreas[regionName];
            if (specialArea) {
                region.transformTo(
                    specialArea.left, specialArea.top, specialArea.width, specialArea.height
                );
            }
        });

        return (inner(mapRecord).parsed = {
            regions: regions,
            boundingRect: getBoundingRect(regions)
        });
    }
};

function getBoundingRect(regions: Region[]): BoundingRect {
    let rect;
    for (let i = 0; i < regions.length; i++) {
        const regionRect = regions[i].getBoundingRect();
        rect = rect || regionRect.clone();
        rect.union(regionRect);
    }
    return rect;
}

