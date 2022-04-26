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

/* global Uint8Array, document */

import env from 'zrender/src/core/env';
import { ToolboxFeature, ToolboxFeatureOption } from '../featureManager';
import { ZRColor } from '../../../util/types';
import GlobalModel from '../../../model/Global';
import ExtensionAPI from '../../../core/ExtensionAPI';
import { isFunction } from 'zrender/src/core/util';

export interface ToolboxSaveAsImageFeatureOption extends ToolboxFeatureOption {
    icon?: string
    title?: string
    type?: 'png' | 'jpeg'

    backgroundColor?: ZRColor
    connectedBackgroundColor?: ZRColor

    name?: string
    excludeComponents?: string[]

    pixelRatio?: number

    lang?: string[]
}

/* global window, document */

class SaveAsImage extends ToolboxFeature<ToolboxSaveAsImageFeatureOption> {

    onclick(ecModel: GlobalModel, api: ExtensionAPI) {
        const model = this.model;
        const title = model.get('name') || ecModel.get('title.0.text') || 'echarts';
        const isSvg = api.getZr().painter.getType() === 'svg';
        const type = isSvg ? 'svg' : model.get('type', true) || 'png';
        const url = api.getConnectedDataURL({
            type: type,
            backgroundColor: model.get('backgroundColor', true)
                || ecModel.get('backgroundColor') || '#fff',
            connectedBackgroundColor: model.get('connectedBackgroundColor'),
            excludeComponents: model.get('excludeComponents'),
            pixelRatio: model.get('pixelRatio')
        });
        const browser = env.browser;
        // Chrome, Firefox, New Edge
        if (isFunction(MouseEvent) && (browser.newEdge || (!browser.ie && !browser.edge))) {
            const $a = document.createElement('a');
            $a.download = title + '.' + type;
            $a.target = '_blank';
            $a.href = url;
            const evt = new MouseEvent('click', {
                // some micro front-end framework， window maybe is a Proxy
                view: document.defaultView,
                bubbles: true,
                cancelable: false
            });
            $a.dispatchEvent(evt);
        }
        // IE or old Edge
        else {
            // @ts-ignore
            if (window.navigator.msSaveOrOpenBlob || isSvg) {
                const parts = url.split(',');
                // data:[<mime type>][;charset=<charset>][;base64],<encoded data>
                const base64Encoded = parts[0].indexOf('base64') > -1;
                let bstr = isSvg
                    // should decode the svg data uri first
                    ? decodeURIComponent(parts[1])
                    : parts[1];
                // only `atob` when the data uri is encoded with base64
                // otherwise, like `svg` data uri exported by zrender,
                // there will be an error, for it's not encoded with base64.
                // (just a url-encoded string through `encodeURIComponent`)
                base64Encoded && (bstr = window.atob(bstr));
                const filename = title + '.' + type;
                // @ts-ignore
                if (window.navigator.msSaveOrOpenBlob) {
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    const blob = new Blob([u8arr]);// @ts-ignore
                    window.navigator.msSaveOrOpenBlob(blob, filename);
                }
                else {
                    const frame = document.createElement('iframe');
                    document.body.appendChild(frame);
                    const cw = frame.contentWindow;
                    const doc = cw.document;
                    doc.open('image/svg+xml', 'replace');
                    doc.write(bstr);
                    doc.close();
                    cw.focus();
                    doc.execCommand('SaveAs', true, filename);
                    document.body.removeChild(frame);
                }
            }
            else {
                const lang = model.get('lang');
                const html = ''
                    + '<body style="margin:0;">'
                    + '<img src="' + url + '" style="max-width:100%;" title="' + ((lang && lang[0]) || '') + '" />'
                    + '</body>';
                const tab = window.open();
                tab.document.write(html);
                tab.document.title = title as string;
            }
        }
    }

    static getDefaultOption(ecModel: GlobalModel) {
         const defaultOption: ToolboxSaveAsImageFeatureOption = {
            show: true,
            icon: 'M4.7,22.9L29.3,45.5L54.7,23.4M4.6,43.6L4.6,58L53.8,58L53.8,43.6M29.2,45.1L29.2,0',
            title: ecModel.getLocaleModel().get(['toolbox', 'saveAsImage', 'title']),
            type: 'png',
            // Default use option.backgroundColor
            // backgroundColor: '#fff',
            connectedBackgroundColor: '#fff',
            name: '',
            excludeComponents: ['toolbox'],
            // use current pixel ratio of device by default
            // pixelRatio: 1,
            lang: ecModel.getLocaleModel().get(['toolbox', 'saveAsImage', 'lang'])
        };

        return defaultOption;
    }
}

export default SaveAsImage;
