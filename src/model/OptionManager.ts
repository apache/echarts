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
 * ECharts option manager
 */


import ComponentModel, { ComponentModelConstructor } from './Component';
import ExtensionAPI from '../ExtensionAPI';
import {
    OptionPreprocessor, MediaQuery, ECUnitOption, MediaUnit, ECOption, SeriesOption, ComponentOption
} from '../util/types';
import GlobalModel, { InnerSetOptionOpts } from './Global';
import {
    MappingExistingItem, normalizeToArray, setComponentTypeToKeyInfo, mappingToExists
} from '../util/model';
import {
    each, clone, map, merge, isTypedArray, setAsPrimitive, HashMap, createHashMap, extend
} from 'zrender/src/core/util';

const QUERY_REG = /^(min|max)?(.+)$/;

interface ParsedRawOption {
    baseOption: ECUnitOption;
    timelineOptions: ECUnitOption[];
    mediaDefault: MediaUnit;
    mediaList: MediaUnit[];
}

// Key: mainType
type FakeComponentsMap = HashMap<(MappingExistingItem & { subType: string })[]>;

/**
 * TERM EXPLANATIONS:
 * See `ECOption` and `ECUnitOption` in `src/util/types.ts`.
 */
class OptionManager {

    private _api: ExtensionAPI;

    private _timelineOptions: ECUnitOption[] = [];

    private _mediaList: MediaUnit[] = [];

    private _mediaDefault: MediaUnit;

    /**
     * -1, means default.
     * empty means no media.
     */
    private _currentMediaIndices: number[] = [];

    private _optionBackup: ParsedRawOption;

    // private _fakeCmptsMap: FakeComponentsMap;

    private _newBaseOption: ECUnitOption;

    // timeline.notMerge is not supported in ec3. Firstly there is rearly
    // case that notMerge is needed. Secondly supporting 'notMerge' requires
    // rawOption cloned and backuped when timeline changed, which does no
    // good to performance. What's more, that both timeline and setOption
    // method supply 'notMerge' brings complex and some problems.
    // Consider this case:
    // (step1) chart.setOption({timeline: {notMerge: false}, ...}, false);
    // (step2) chart.setOption({timeline: {notMerge: true}, ...}, false);

    constructor(api: ExtensionAPI) {
        this._api = api;
    }

    setOption(
        rawOption: ECOption,
        optionPreprocessorFuncs: OptionPreprocessor[],
        opt: InnerSetOptionOpts
    ): void {
        if (rawOption) {
            // That set dat primitive is dangerous if user reuse the data when setOption again.
            each(normalizeToArray((rawOption as ECUnitOption).series), function (series: SeriesOption) {
                series && series.data && isTypedArray(series.data) && setAsPrimitive(series.data);
            });
        }

        // Caution: some series modify option data, if do not clone,
        // it should ensure that the repeat modify correctly
        // (create a new object when modify itself).
        rawOption = clone(rawOption);

        // FIXME
        // If some property is set in timeline options or media option but
        // not set in baseOption, a warning should be given.

        const optionBackup = this._optionBackup;
        const newParsedOption = parseRawOption(
            rawOption, optionPreprocessorFuncs, !optionBackup
        );
        this._newBaseOption = newParsedOption.baseOption;

        // For setOption at second time (using merge mode);
        if (optionBackup) {
            // FIXME
            // the restore merge solution is essentially incorrect.
            // the mapping can not be 100% consistent with ecModel, which probably brings
            // potential bug!

            // The first merge is delayed, becuase in most cases, users do not call `setOption` twice.
            // let fakeCmptsMap = this._fakeCmptsMap;
            // if (!fakeCmptsMap) {
            //     fakeCmptsMap = this._fakeCmptsMap = createHashMap();
            //     mergeToBackupOption(fakeCmptsMap, null, optionBackup.baseOption, null);
            // }

            // mergeToBackupOption(
            //     fakeCmptsMap, optionBackup.baseOption, newParsedOption.baseOption, opt
            // );

            // For simplicity, timeline options and media options do not support merge,
            // that is, if you `setOption` twice and both has timeline options, the latter
            // timeline opitons will not be merged to the formers, but just substitude them.
            if (newParsedOption.timelineOptions.length) {
                optionBackup.timelineOptions = newParsedOption.timelineOptions;
            }
            if (newParsedOption.mediaList.length) {
                optionBackup.mediaList = newParsedOption.mediaList;
            }
            if (newParsedOption.mediaDefault) {
                optionBackup.mediaDefault = newParsedOption.mediaDefault;
            }
        }
        else {
            this._optionBackup = newParsedOption;
        }
    }

    mountOption(isRecreate: boolean): ECUnitOption {
        const optionBackup = this._optionBackup;

        this._timelineOptions = optionBackup.timelineOptions;
        this._mediaList = optionBackup.mediaList;
        this._mediaDefault = optionBackup.mediaDefault;
        this._currentMediaIndices = [];

        return clone(isRecreate
            // this._optionBackup.baseOption, which is created at the first `setOption`
            // called, and is merged into every new option by inner method `mergeToBackupOption`
            // each time `setOption` called, can be only used in `isRecreate`, because
            // its reliability is under suspicion. In other cases option merge is
            // performed by `model.mergeOption`.
            ? optionBackup.baseOption : this._newBaseOption
        );
    }

    getTimelineOption(ecModel: GlobalModel): ECUnitOption {
        let option;
        const timelineOptions = this._timelineOptions;

        if (timelineOptions.length) {
            // getTimelineOption can only be called after ecModel inited,
            // so we can get currentIndex from timelineModel.
            const timelineModel = ecModel.getComponent('timeline');
            if (timelineModel) {
                option = clone(
                    // FIXME:TS as TimelineModel or quivlant interface
                    timelineOptions[(timelineModel as any).getCurrentIndex()]
                );
            }
        }

        return option;
    }

    getMediaOption(ecModel: GlobalModel): ECUnitOption[] {
        const ecWidth = this._api.getWidth();
        const ecHeight = this._api.getHeight();
        const mediaList = this._mediaList;
        const mediaDefault = this._mediaDefault;
        let indices = [];
        let result: ECUnitOption[] = [];

        // No media defined.
        if (!mediaList.length && !mediaDefault) {
            return result;
        }

        // Multi media may be applied, the latter defined media has higher priority.
        for (let i = 0, len = mediaList.length; i < len; i++) {
            if (applyMediaQuery(mediaList[i].query, ecWidth, ecHeight)) {
                indices.push(i);
            }
        }

        // FIXME
        // Whether mediaDefault should force users to provide? Otherwise
        // the change by media query can not be recorvered.
        if (!indices.length && mediaDefault) {
            indices = [-1];
        }

        if (indices.length && !indicesEquals(indices, this._currentMediaIndices)) {
            result = map(indices, function (index) {
                return clone(
                    index === -1 ? mediaDefault.option : mediaList[index].option
                );
            });
        }
        // Otherwise return nothing.

        this._currentMediaIndices = indices;

        return result;
    }

}

function parseRawOption(
    rawOption: ECOption,
    optionPreprocessorFuncs: OptionPreprocessor[],
    isNew: boolean
): ParsedRawOption {
    let timelineOptions: ECUnitOption[] = [];
    const mediaList: MediaUnit[] = [];
    let mediaDefault: MediaUnit;
    let baseOption: ECUnitOption;

    // Compatible with ec2.
    const timelineOpt = rawOption.timeline;

    if (rawOption.baseOption) {
        baseOption = rawOption.baseOption;
    }

    // For timeline
    if (timelineOpt || rawOption.options) {
        baseOption = baseOption || {} as ECUnitOption;
        timelineOptions = (rawOption.options || []).slice();
    }

    // For media query
    if (rawOption.media) {
        baseOption = baseOption || {} as ECUnitOption;
        const media = rawOption.media;
        each(media, function (singleMedia) {
            if (singleMedia && singleMedia.option) {
                if (singleMedia.query) {
                    mediaList.push(singleMedia);
                }
                else if (!mediaDefault) {
                    // Use the first media default.
                    mediaDefault = singleMedia;
                }
            }
        });
    }

    // For normal option
    if (!baseOption) {
        baseOption = rawOption as ECUnitOption;
    }

    // Set timelineOpt to baseOption in ec3,
    // which is convenient for merge option.
    if (!baseOption.timeline) {
        baseOption.timeline = timelineOpt;
    }

    // Preprocess.
    each([baseOption].concat(timelineOptions)
        .concat(map(mediaList, function (media) {
            return media.option;
        })),
        function (option) {
            each(optionPreprocessorFuncs, function (preProcess) {
                preProcess(option, isNew);
            });
        }
    );

    return {
        baseOption: baseOption,
        timelineOptions: timelineOptions,
        mediaDefault: mediaDefault,
        mediaList: mediaList
    };
}

/**
 * @see <http://www.w3.org/TR/css3-mediaqueries/#media1>
 * Support: width, height, aspectRatio
 * Can use max or min as prefix.
 */
function applyMediaQuery(query: MediaQuery, ecWidth: number, ecHeight: number): boolean {
    const realMap = {
        width: ecWidth,
        height: ecHeight,
        aspectratio: ecWidth / ecHeight // lowser case for convenientce.
    };

    let applicatable = true;

    each(query, function (value: number, attr) {
        const matched = attr.match(QUERY_REG);

        if (!matched || !matched[1] || !matched[2]) {
            return;
        }

        const operator = matched[1];
        const realAttr = matched[2].toLowerCase();

        if (!compare(realMap[realAttr as keyof typeof realMap], value, operator)) {
            applicatable = false;
        }
    });

    return applicatable;
}

function compare(real: number, expect: number, operator: string): boolean {
    if (operator === 'min') {
        return real >= expect;
    }
    else if (operator === 'max') {
        return real <= expect;
    }
    else { // Equals
        return real === expect;
    }
}

function indicesEquals(indices1: number[], indices2: number[]): boolean {
    // indices is always order by asc and has only finite number.
    return indices1.join(',') === indices2.join(',');
}

/**
 * Consider case:
 * `chart.setOption(opt1);`
 * Then user do some interaction like dataZoom, dataView changing.
 * `chart.setOption(opt2);`
 * Then user press 'reset button' in toolbox.
 *
 * After doing that all of the interaction effects should be reset, the
 * chart should be the same as the result of invoke
 * `chart.setOption(opt1); chart.setOption(opt2);`.
 *
 * Although it is not able ensure that
 * `chart.setOption(opt1); chart.setOption(opt2);` is equivalents to
 * `chart.setOption(merge(opt1, opt2));` exactly,
 * this might be the only simple way to implement that feature.
 *
 * MEMO: We've considered some other approaches:
 * 1. Each model handle its self restoration but not uniform treatment.
 *     (Too complex in logic and error-prone)
 * 2. Use a shadow ecModel. (Performace expensive)
 *
 * FIXME: A possible solution:
 * Add a extra level of model for each component model. The inheritance chain would be:
 * ecModel <- componentModel <- componentActionModel <- dataItemModel
 * And all of the actions can only modify the `componentActionModel` rather than
 * `componentModel`. `setOption` will only modify the `ecModel` and `componentModel`.
 * When "resotre" action triggered, model from `componentActionModel` will be discarded
 * instead of recreating the "ecModel" from the "_optionBackup".
 */
// function mergeToBackupOption(
//     fakeCmptsMap: FakeComponentsMap,
//     // `tarOption` Can be null/undefined, means init
//     tarOption: ECUnitOption,
//     newOption: ECUnitOption,
//     // Can be null/undefined
//     opt: InnerSetOptionOpts
// ): void {
//     newOption = newOption || {} as ECUnitOption;
//     const notInit = !!tarOption;

//     each(newOption, function (newOptsInMainType, mainType) {
//         if (newOptsInMainType == null) {
//             return;
//         }

//         if (!ComponentModel.hasClass(mainType)) {
//             if (tarOption) {
//                 tarOption[mainType] = merge(tarOption[mainType], newOptsInMainType, true);
//             }
//         }
//         else {
//             const oldTarOptsInMainType = notInit ? normalizeToArray(tarOption[mainType]) : null;
//             const oldFakeCmptsInMainType = fakeCmptsMap.get(mainType) || [];
//             const resultTarOptsInMainType = notInit ? (tarOption[mainType] = [] as ComponentOption[]) : null;
//             const resultFakeCmptsInMainType = fakeCmptsMap.set(mainType, []);

//             const mappingResult = mappingToExists(
//                 oldFakeCmptsInMainType,
//                 normalizeToArray(newOptsInMainType),
//                 (opt && opt.replaceMergeMainTypeMap.get(mainType)) ? 'replaceMerge' : 'normalMerge'
//             );
//             setComponentTypeToKeyInfo(mappingResult, mainType, ComponentModel as ComponentModelConstructor);

//             each(mappingResult, function (resultItem, index) {
//                 // The same logic as `Global.ts#_mergeOption`.
//                 let fakeCmpt = resultItem.existing;
//                 const newOption = resultItem.newOption;
//                 const keyInfo = resultItem.keyInfo;
//                 let fakeCmptOpt;

//                 if (!newOption) {
//                     fakeCmptOpt = oldTarOptsInMainType[index];
//                 }
//                 else {
//                     if (fakeCmpt && fakeCmpt.subType === keyInfo.subType) {
//                         fakeCmpt.name = keyInfo.name;
//                         if (notInit) {
//                             fakeCmptOpt = merge(oldTarOptsInMainType[index], newOption, true);
//                         }
//                     }
//                     else {
//                         fakeCmpt = extend({}, keyInfo);
//                         if (notInit) {
//                             fakeCmptOpt = clone(newOption);
//                         }
//                     }
//                 }

//                 if (fakeCmpt) {
//                     notInit && resultTarOptsInMainType.push(fakeCmptOpt);
//                     resultFakeCmptsInMainType.push(fakeCmpt);
//                 }
//                 else {
//                     notInit && resultTarOptsInMainType.push(void 0);
//                     resultFakeCmptsInMainType.push(void 0);
//                 }
//             });
//         }
//     });
// }

export default OptionManager;
