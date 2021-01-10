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

import { Dictionary } from '../util/types';
import Model from '../model/Model';
import env from 'zrender/src/core/env';
// default import ZH and EN lang
import langEN from '../i18n/langEN';
import langZH from '../i18n/langZH';
import { isString, clone, merge } from 'zrender/src/core/util';

export type LocaleOption = typeof langEN;

const LOCALE_ZH = 'ZH';
const LOCALE_EN = 'EN';
const DEFAULT_LOCALE = LOCALE_EN;

const localeStorage: Dictionary<LocaleOption> = {};
const localeModels: Dictionary<Model> = {};

export const SYSTEM_LANG = !env.domSupported ? DEFAULT_LOCALE : (function () {
    const langStr = (
        /* eslint-disable-next-line */
        document.documentElement.lang || navigator.language || (navigator as any).browserLanguage
    ).toUpperCase();
    return langStr.indexOf(LOCALE_ZH) > -1 ? LOCALE_ZH : DEFAULT_LOCALE;
})();

export function registerLocale(locale: string, localeObj: LocaleOption) {
    locale = locale.toUpperCase();
    localeModels[locale] = new Model(localeObj);
    localeStorage[locale] = localeObj;
}

// export function getLocale(locale: string) {
//     return localeStorage[locale];
// }

export function createLocaleObject(locale: string | LocaleOption): LocaleOption {
    if (isString(locale)) {
        const localeObj = localeStorage[locale.toUpperCase()] || {} as LocaleOption;
        if (locale === LOCALE_ZH || locale === LOCALE_EN) {
            return clone(localeObj);
        }
        else {
            return merge(clone(localeObj), clone(localeStorage[DEFAULT_LOCALE]), false);
        }
    }
    else {
        return merge(clone(locale), clone(localeStorage[DEFAULT_LOCALE]), false);
    }
}

export function getLocaleModel(lang: string): Model<LocaleOption> {
    return localeModels[lang];
}

export function getDefaultLocaleModel(): Model<LocaleOption> {
    return localeModels[DEFAULT_LOCALE];
}

// Default locale
registerLocale(LOCALE_EN, langEN);
registerLocale(LOCALE_ZH, langZH);
