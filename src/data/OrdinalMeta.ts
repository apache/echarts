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

import {createHashMap, isObject, map, HashMap, isString} from 'zrender/src/core/util';
import Model from '../model/Model';
import { OrdinalNumber, OrdinalRawValue } from '../util/types';

let uidBase = 0;

class OrdinalMeta {

    readonly categories: OrdinalRawValue[];

    private _needCollect: boolean;

    private _deduplication: boolean;

    private _map: HashMap<OrdinalNumber>;

    private _onCollect: (category: OrdinalRawValue, index: number) => void;

    readonly uid: number;

    /**
     * PENDING - Regarding forcibly converting to string:
     *  In the early days, the underlying hash map impl used JS plain object and converted the key to
     *  string; later in https://github.com/ecomfe/zrender/pull/966 it was changed to a JS Map (in supported
     *  platforms), which does not require string keys. But consider any input that `scale/Ordinal['parse']`
     *  is involved, a number input represents an `OrdinalNumber` (i.e., an index), and affect the query
     *  behavior:
     *    - If forcbily converting to string:
     *      pros: users can use numeric string (such as, '123') to query the raw data (123), tho it's probably
     *      still confusing.
     *      cons: NaN/null/undefined in data will be equals to 'NaN'/'null'/'undefined', if simply using
     *      `val + ''` to convert them, like currently `getName` does.
     *    - Otherwise:
     *      pros: see NaN/null/undefined case above.
     *      cons: users cannot query the raw data (123) any more.
     *  There are two inconsistent behaviors in the current impl:
     *    - Force conversion is applied on the case `xAxis{data: ['aaa', 'bbb', ...]}`,
     *      but no conversion applied to the case `xAxis{data: [{value: 'aaa'}, ...]}` and
     *      the case `dataset: {source: [['aaa', 123], ['bbb', 234], ...]}`.
     *    - behaves differently according to whether JS Map is supported (the polyfill is simply using JS
     *      plain object) (tho it seems rare platform that do not support it).
     *  Since there's no sufficient good solution to offset cost of the breaking change, we preserve the
     *  current behavior, until real issues is reported.
     */
    constructor(opt: {
        categories?: OrdinalRawValue[],
        needCollect?: boolean
        deduplication?: boolean
        // Called only on `needCollect` is true and collect happens.
        onCollect?: OrdinalMeta['_onCollect']
    }) {
        this.categories = opt.categories || [];
        this._needCollect = opt.needCollect;
        this._deduplication = opt.deduplication;
        this.uid = ++uidBase;
        this._onCollect = opt.onCollect;
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
        if (!isString(category) && !needCollect) {
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
            this._onCollect && this._onCollect(category, index);
            return index;
        }

        const map = this._getOrCreateMap();
        index = map.get(category);

        if (index == null) {
            if (needCollect) {
                index = this.categories.length;
                this.categories[index] = category;
                map.set(category, index);
                this._onCollect && this._onCollect(category, index);
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
            this._map = createHashMap<OrdinalNumber>(this.categories)
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
