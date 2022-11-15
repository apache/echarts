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


import { EventProcessor, EventQuery } from 'zrender/src/core/Eventful';
import { ECActionEvent, NormalizedEventQuery, EventQueryItem, ECElementEvent } from './types';
import ComponentModel from '../model/Component';
import ComponentView from '../view/Component';
import ChartView from '../view/Chart';
import * as zrUtil from 'zrender/src/core/util';
import { parseClassType } from './clazz';
import Element from 'zrender/src/Element';

/**
 * Usage of query:
 * `chart.on('click', query, handler);`
 * The `query` can be:
 * + The component type query string, only `mainType` or `mainType.subType`,
 *   like: 'xAxis', 'series', 'xAxis.category' or 'series.line'.
 * + The component query object, like:
 *   `{seriesIndex: 2}`, `{seriesName: 'xx'}`, `{seriesId: 'some'}`,
 *   `{xAxisIndex: 2}`, `{xAxisName: 'xx'}`, `{xAxisId: 'some'}`.
 * + The data query object, like:
 *   `{dataIndex: 123}`, `{dataType: 'link'}`, `{name: 'some'}`.
 * + The other query object (cmponent customized query), like:
 *   `{element: 'some'}` (only available in custom series).
 *
 * Caveat: If a prop in the `query` object is `null/undefined`, it is the
 * same as there is no such prop in the `query` object.
 */
export class ECEventProcessor implements EventProcessor {

    // These info required: targetEl, packedEvent, model, view
    eventInfo: {
        targetEl: Element;
        packedEvent: ECActionEvent | ECElementEvent;
        model: ComponentModel;
        view: ComponentView | ChartView;
    };

    normalizeQuery(query: EventQuery): NormalizedEventQuery {
        const cptQuery: EventQueryItem = {};
        const dataQuery: EventQueryItem = {};
        const otherQuery: EventQueryItem = {};

        // `query` is `mainType` or `mainType.subType` of component.
        if (zrUtil.isString(query)) {
            const condCptType = parseClassType(query);
            // `.main` and `.sub` may be ''.
            cptQuery.mainType = condCptType.main || null;
            cptQuery.subType = condCptType.sub || null;
        }
        // `query` is an object, convert to {mainType, index, name, id}.
        else {
            // `xxxIndex`, `xxxName`, `xxxId`, `name`, `dataIndex`, `dataType` is reserved,
            // can not be used in `compomentModel.filterForExposedEvent`.
            const suffixes = ['Index', 'Name', 'Id'];
            const dataKeys = {name: 1, dataIndex: 1, dataType: 1};
            zrUtil.each(query, function (val, key) {
                let reserved = false;
                for (let i = 0; i < suffixes.length; i++) {
                    const propSuffix = suffixes[i];
                    const suffixPos = key.lastIndexOf(propSuffix);
                    if (suffixPos > 0 && suffixPos === key.length - propSuffix.length) {
                        const mainType = key.slice(0, suffixPos);
                        // Consider `dataIndex`.
                        if (mainType !== 'data') {
                            cptQuery.mainType = mainType;
                            cptQuery[propSuffix.toLowerCase()] = val;
                            reserved = true;
                        }
                    }
                }
                if (dataKeys.hasOwnProperty(key)) {
                    dataQuery[key] = val;
                    reserved = true;
                }
                if (!reserved) {
                    otherQuery[key] = val;
                }
            });
        }

        return {
            cptQuery: cptQuery,
            dataQuery: dataQuery,
            otherQuery: otherQuery
        };
    }

    filter(eventType: string, query: NormalizedEventQuery): boolean {
        // They should be assigned before each trigger call.
        const eventInfo = this.eventInfo;

        if (!eventInfo) {
            return true;
        }

        const targetEl = eventInfo.targetEl;
        const packedEvent = eventInfo.packedEvent;
        const model = eventInfo.model;
        const view = eventInfo.view;

        // For event like 'globalout'.
        if (!model || !view) {
            return true;
        }

        const cptQuery = query.cptQuery;
        const dataQuery = query.dataQuery;

        return check(cptQuery, model, 'mainType')
            && check(cptQuery, model, 'subType')
            && check(cptQuery, model, 'index', 'componentIndex')
            && check(cptQuery, model, 'name')
            && check(cptQuery, model, 'id')
            && check(dataQuery, packedEvent, 'name')
            && check(dataQuery, packedEvent, 'dataIndex')
            && check(dataQuery, packedEvent, 'dataType')
            && (!view.filterForExposedEvent || view.filterForExposedEvent(
                eventType, query.otherQuery, targetEl, packedEvent
            ));

        function check(
            query: EventQueryItem, host: any, prop: string, propOnHost?: string
        ): boolean {
            return query[prop] == null || host[propOnHost || prop] === query[prop];
        }
    }

    afterTrigger() {
        // Make sure the eventInfo won't be used in next trigger.
        this.eventInfo = null;
    }
};
