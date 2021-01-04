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

import {createHashMap, isString, isArray, each, assert} from 'zrender/src/core/util';
import {parseXML} from 'zrender/src/tool/parseXML';
import { GeoSpecialAreas, GeoJSON, GeoJSONCompressed } from './geoTypes';
import { Dictionary } from 'zrender/src/core/types';

// For minimize the code size of common echarts package,
// do not put too much logic in this module.

type SVGMapSource = 'string' | Document | SVGElement;
type GeoJSONMapSource = 'string' | GeoJSON | GeoJSONCompressed;
type MapInputObject = {
    geoJSON?: GeoJSONMapSource;
    geoJson?: GeoJSONMapSource;
    svg?: SVGMapSource;
    specialAreas?: GeoSpecialAreas;
};

export type MapRecord = GeoJSONMapRecord | SVGMapRecord;
export interface GeoJSONMapRecord {
    type: 'geoJSON';
    source: GeoJSONMapSource;
    specialAreas: GeoSpecialAreas;
    geoJSON: GeoJSON | GeoJSONCompressed;
}
export interface SVGMapRecord {
    type: 'svg';
    source: SVGMapSource;
    specialAreas: GeoSpecialAreas;
    svgXML: ReturnType<typeof parseXML>;
}


const storage = createHashMap<MapRecord[]>();


export default {

    /**
     * Compatible with previous `echarts.registerMap`.
     * @usage
     * ```js
     * $.get('USA.json', function (geoJson) {
     *     echarts.registerMap('USA', geoJson);
     *     // Or
     *     echarts.registerMap('USA', {
     *         geoJson: geoJson,
     *         specialAreas: {}
     *     })
     * });
     *
     * $.get('airport.svg', function (svg) {
     *     echarts.registerMap('airport', {
     *         svg: svg
     *     }
     * });
     *
     * echarts.registerMap('eu', [
     *     {svg: eu-topographic.svg},
     *     {geoJSON: eu.json}
     * ])
     * ```
     */
    registerMap: function (
        mapName: string,
        rawDef: MapInputObject | MapRecord[] | GeoJSONMapSource,
        rawSpecialAreas?: GeoSpecialAreas
    ): MapRecord[] {

        let records: MapRecord[];

        if (isArray(rawDef)) {
            records = rawDef as MapRecord[];
        }
        else if ((rawDef as MapInputObject).svg) {
            records = [{
                type: 'svg',
                source: (rawDef as MapInputObject).svg,
                specialAreas: (rawDef as MapInputObject).specialAreas
            } as SVGMapRecord];
        }
        else {
            // Backward compatibility.
            const geoSource = (rawDef as MapInputObject).geoJson
                || (rawDef as MapInputObject).geoJSON;
            if (geoSource && !(rawDef as GeoJSON).features) {
                rawSpecialAreas = (rawDef as MapInputObject).specialAreas;
                rawDef = geoSource;
            }
            records = [{
                type: 'geoJSON',
                source: rawDef as GeoJSONMapSource,
                specialAreas: rawSpecialAreas
            } as GeoJSONMapRecord];
        }

        each(records, function (record) {
            let type = record.type;
            (type as any) === 'geoJson' && (type = record.type = 'geoJSON');

            const parse = parsers[type];

            if (__DEV__) {
                assert(parse, 'Illegal map type: ' + type);
            }

            parse(record);
        });

        return storage.set(mapName, records);
    },

    retrieveMap: function (mapName: string): MapRecord[] {
        return storage.get(mapName);
    }

};

const parsers: Dictionary<(record: MapRecord) => void> = {

    geoJSON: function (record: GeoJSONMapRecord): void {
        const source = record.source;
        record.geoJSON = !isString(source)
            ? source
            : (typeof JSON !== 'undefined' && JSON.parse)
            ? JSON.parse(source)
            : (new Function('return (' + source + ');'))();
    },

    // Only perform parse to XML object here, which might be time
    // consiming for large SVG.
    // Although convert XML to zrender element is also time consiming,
    // if we do it here, the clone of zrender elements has to be
    // required. So we do it once for each geo instance, util real
    // performance issues call for optimizing it.
    svg: function (record: SVGMapRecord): void {
        record.svgXML = parseXML(record.source as SVGMapSource);
    }

};
