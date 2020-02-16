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

import {__DEV__} from '../../config';
import {createHashMap, isString, isArray, each, assert} from 'zrender/src/core/util';
import {parseXML} from 'zrender/src/tool/parseSVG';

// For minimize the code size of common echarts package,
// do not put too much logic in this module.

export type GeoMapSVGSource = 'string' | Document;
export type GeoMapGeoJSONSource = 'string' | object;
export type GeoSpecialAreas = object;

interface GeoMapGeoJSONDefinition {
    geoJSON?: GeoMapGeoJSONSource;
    geoJson?: GeoMapGeoJSONSource;
    specialAreas?: GeoSpecialAreas;
}
interface GeoMapSVGDefinition {
    svg?: GeoMapSVGSource;
    specialAreas?: GeoSpecialAreas;
}
export type GeoMapDefinition = GeoMapGeoJSONDefinition | GeoMapSVGDefinition;

interface GeoMapRecord {
    type: 'geoJSON' | 'svg';
    source: GeoMapGeoJSONSource | GeoMapSVGSource;
    specialAreas: GeoSpecialAreas;
    geoJSON: object;
    svgXML: Node
}


var storage = createHashMap<GeoMapRecord[]>();


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
        rawGeoJson: GeoMapDefinition | GeoMapDefinition[] | GeoMapGeoJSONSource,
        rawSpecialAreas?: GeoSpecialAreas
    ): GeoMapRecord[] {

        var records;

        if (isArray(rawGeoJson)) {
            records = rawGeoJson;
        }
        else if ((rawGeoJson as GeoMapSVGDefinition).svg) {
            records = [{
                type: 'svg',
                source: (rawGeoJson as GeoMapSVGDefinition).svg,
                specialAreas: (rawGeoJson as GeoMapSVGDefinition).specialAreas
            }];
        }
        else {
            // Backward compatibility.
            var geoSource = (rawGeoJson as GeoMapGeoJSONDefinition).geoJson
                || (rawGeoJson as GeoMapGeoJSONDefinition).geoJSON;
            if (geoSource && !(rawGeoJson as any).features) {
                rawSpecialAreas = (rawGeoJson as GeoMapGeoJSONDefinition).specialAreas;
                rawGeoJson = geoSource;
            }
            records = [{
                type: 'geoJSON',
                source: rawGeoJson,
                specialAreas: rawSpecialAreas
            }];
        }

        each(records, function (record) {
            var type = record.type;
            type === 'geoJson' && (type = record.type = 'geoJSON');

            var parse = parsers[type];

            if (__DEV__) {
                assert(parse, 'Illegal map type: ' + type);
            }

            parse(record);
        });

        return storage.set(mapName, records);
    },

    retrieveMap: function (mapName: string): GeoMapRecord[] {
        return storage.get(mapName);
    }

};

var parsers = {

    geoJSON: function (record: GeoMapRecord): void {
        var source = record.source;
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
    svg: function (record: GeoMapRecord): void {
        record.svgXML = parseXML(record.source as GeoMapSVGSource);
    }

};
