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


/**
 * Link lists and struct (graph or tree)
 */

import { curry, each, assert, extend, map, keys } from 'zrender/src/core/util';
import List from '../List';
import { makeInner } from '../../util/model';
import { SeriesDataType } from '../../util/types';

// That is: { dataType: data },
// like: { node: nodeList, edge: edgeList }.
// Should contain mainData.
type Datas = { [key in SeriesDataType]?: List };
type StructReferDataAttr = 'data' | 'edgeData';
type StructAttr = 'tree' | 'graph';

const inner = makeInner<{
    datas: Datas;
    mainData: List;
}, List>();


// Caution:
// In most case, either list or its shallow clones (see list.cloneShallow)
// is active in echarts process. So considering heap memory consumption,
// we do not clone tree or graph, but share them among list and its shallow clones.
// But in some rare case, we have to keep old list (like do animation in chart). So
// please take care that both the old list and the new list share the same tree/graph.

type LinkListOpt = {
    mainData: List;
    // For example, instance of Graph or Tree.
    struct: {
        update: () => void;
    } & {
        [key in StructReferDataAttr]?: List
    };
    // Will designate: `mainData[structAttr] = struct;`
    structAttr: StructAttr;
    datas?: Datas;
    // { dataType: attr },
    // Will designate: `struct[datasAttr[dataType]] = list;`
    datasAttr?: { [key in SeriesDataType]?: StructReferDataAttr };
};

function linkList(opt: LinkListOpt): void {
    const mainData = opt.mainData;
    let datas = opt.datas;

    if (!datas) {
        datas = { main: mainData };
        opt.datasAttr = { main: 'data' };
    }
    opt.datas = opt.mainData = null;

    linkAll(mainData, datas, opt);

    // Porxy data original methods.
    each(datas, function (data: List) {
        each(mainData.TRANSFERABLE_METHODS, function (methodName) {
            data.wrapMethod(methodName, curry(transferInjection, opt));
        });
    });

    // Beyond transfer, additional features should be added to `cloneShallow`.
    mainData.wrapMethod('cloneShallow', curry(cloneShallowInjection, opt));

    // Only mainData trigger change, because struct.update may trigger
    // another changable methods, which may bring about dead lock.
    each(mainData.CHANGABLE_METHODS, function (methodName) {
        mainData.wrapMethod(methodName, curry(changeInjection, opt));
    });

    // Make sure datas contains mainData.
    assert(datas[mainData.dataType] === mainData);
}

function transferInjection(this: List, opt: LinkListOpt, res: List): unknown {
    if (isMainData(this)) {
        // Transfer datas to new main data.
        const datas = extend({}, inner(this).datas);
        datas[this.dataType] = res;
        linkAll(res, datas, opt);
    }
    else {
        // Modify the reference in main data to point newData.
        linkSingle(res, this.dataType, inner(this).mainData, opt);
    }
    return res;
}

function changeInjection(opt: LinkListOpt, res: unknown): unknown {
    opt.struct && opt.struct.update();
    return res;
}

function cloneShallowInjection(opt: LinkListOpt, res: List): List {
    // cloneShallow, which brings about some fragilities, may be inappropriate
    // to be exposed as an API. So for implementation simplicity we can make
    // the restriction that cloneShallow of not-mainData should not be invoked
    // outside, but only be invoked here.
    each(inner(res).datas, function (data: List, dataType) {
        data !== res && linkSingle(data.cloneShallow(), dataType, res, opt);
    });
    return res;
}

/**
 * Supplement method to List.
 *
 * @public
 * @param [dataType] If not specified, return mainData.
 */
function getLinkedData(this: List, dataType?: SeriesDataType): List {
    const mainData = inner(this).mainData;
    return (dataType == null || mainData == null)
        ? mainData
        : inner(mainData).datas[dataType];
}

/**
 * Get list of all linked data
 */
function getLinkedDataAll(this: List): {
    data: List,
    type?: SeriesDataType
}[] {
    const mainData = inner(this).mainData;
    return (mainData == null)
        ? [{ data: mainData }]
        : map(keys(inner(mainData).datas), function (type) {
            return {
                type,
                data: inner(mainData).datas[type]
            };
        });
}

function isMainData(data: List): boolean {
    return inner(data).mainData === data;
}

function linkAll(mainData: List, datas: Datas, opt: LinkListOpt): void {
    inner(mainData).datas = {};
    each(datas, function (data: List, dataType) {
        linkSingle(data, dataType, mainData, opt);
    });
}

function linkSingle(data: List, dataType: SeriesDataType, mainData: List, opt: LinkListOpt): void {
    inner(mainData).datas[dataType] = data;
    inner(data).mainData = mainData;

    data.dataType = dataType;

    if (opt.struct) {
        data[opt.structAttr] = opt.struct as any;
        opt.struct[opt.datasAttr[dataType]] = data;
    }

    // Supplement method.
    data.getLinkedData = getLinkedData;
    data.getLinkedDataAll = getLinkedDataAll;
}

export default linkList;
