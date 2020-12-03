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

import {createHashMap, isObject, map, HashMap} from 'zrender/src/core/util';
import Model from '../model/Model';
import { OrdinalNumber, OrdinalRawValue } from '../util/types';


class OrdinalMeta {

    readonly categories: OrdinalRawValue[];

    private _needCollect: boolean;

    private _deduplication: boolean;

    private _map: HashMap<OrdinalNumber>;


    constructor(opt: {
        categories?: OrdinalRawValue[],
        needCollect?: boolean
        deduplication?: boolean
    }) {
        this.categories = opt.categories || [];
        this._needCollect = opt.needCollect;
        this._deduplication = opt.deduplication;
    }

    static createByAxisModel(axisModel: Model): OrdinalMeta {
        const option = axisModel.option;
        const data = option.data;
        const categories = data && map(data, getName);

        return new OrdinalMeta({
            categories: categories,
            needCollect: !categories,
            // deduplication is default in axis.
            deduplication: option.dedplication !== false
        });
    };

    getOrdinal(category: OrdinalRawValue): OrdinalNumber {
        // @ts-ignore
        return this._getOrCreateMap().get(category);
    }

    /**
     * @return The ordinal. If not found, return NaN.
     */
    parseAndCollect(category: OrdinalRawValue | OrdinalNumber): OrdinalNumber {
        let index;
        const needCollect = this._needCollect;

        // The value of category dim can be the index of the given category set.
        // This feature is only supported when !needCollect, because we should
        // consider a common case: a value is 2017, which is a number but is
        // expected to be tread as a category. This case usually happen in dataset,
        // where it happent to be no need of the index feature.
        if (typeof category !== 'string' && !needCollect) {
            return category;
        }

        // Optimize for the scenario:
        // category is ['2012-01-01', '2012-01-02', ...], where the input
        // data has been ensured not duplicate and is large data.
        // Notice, if a dataset dimension provide categroies, usually echarts
        // should remove duplication except user tell echarts dont do that
        // (set axis.deduplication = false), because echarts do not know whether
        // the values in the category dimension has duplication (consider the
        // parallel-aqi example)
        if (needCollect && !this._deduplication) {
            index = this.categories.length;
            this.categories[index] = category;
            return index;
        }

        const map = this._getOrCreateMap();
        // @ts-ignore
        index = map.get(category);

        if (index == null) {
            if (needCollect) {
                index = this.categories.length;
                this.categories[index] = category;
                // @ts-ignore
                map.set(category, index);
            }
            else {
                index = NaN;
            }
        }

        return index;
    }

    // Consider big data, do not create map until needed.
    private _getOrCreateMap(): HashMap<OrdinalNumber> {
        return this._map || (
            this._map = createHashMap(this.categories)
        );
    }
}

function getName(obj: any): string {
    if (isObject(obj) && obj.value != null) {
        return obj.value;
    }
    else {
        return obj + '';
    }
}

export default OrdinalMeta;
