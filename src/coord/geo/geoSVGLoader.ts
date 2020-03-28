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

import {parseSVG, makeViewBoxTransform} from 'zrender/src/tool/parseSVG';
import Group from 'zrender/src/graphic/Group';
import Rect from 'zrender/src/graphic/shape/Rect';
import {assert, createHashMap, HashMap} from 'zrender/src/core/util';
import BoundingRect from 'zrender/src/core/BoundingRect';
import {makeInner} from '../../util/model';
import { SVGMapRecord } from './mapDataStorage';

type MapRecordInner = {
    originRoot: Group;
    boundingRect: BoundingRect;
    // key: hostKey, value: root
    rootMap: HashMap<Group>;
    originRootHostKey: string;
};

const inner = makeInner<MapRecordInner, SVGMapRecord>();

export default {

    load(mapName: string, mapRecord: SVGMapRecord): ReturnType<typeof buildGraphic> {
        const originRoot = inner(mapRecord).originRoot;
        if (originRoot) {
            return {
                root: originRoot,
                boundingRect: inner(mapRecord).boundingRect
            };
        }

        const graphic = buildGraphic(mapRecord);

        inner(mapRecord).originRoot = graphic.root;
        inner(mapRecord).boundingRect = graphic.boundingRect;

        return graphic;
    },

    makeGraphic(mapName: string, mapRecord: SVGMapRecord, hostKey: string): Group {
        // For performance consideration (in large SVG), graphic only maked
        // when necessary and reuse them according to hostKey.
        const field = inner(mapRecord);
        const rootMap = field.rootMap || (field.rootMap = createHashMap());

        let root = rootMap.get(hostKey);
        if (root) {
            return root;
        }

        const originRoot = field.originRoot;
        const boundingRect = field.boundingRect;

        // For performance, if originRoot is not used by a view,
        // assign it to a view, but not reproduce graphic elements.
        if (!field.originRootHostKey) {
            field.originRootHostKey = hostKey;
            root = originRoot;
        }
        else {
            root = buildGraphic(mapRecord, boundingRect).root;
        }

        return rootMap.set(hostKey, root);
    },

    removeGraphic(mapName: string, mapRecord: SVGMapRecord, hostKey: string): void {
        const field = inner(mapRecord);
        const rootMap = field.rootMap;
        rootMap && rootMap.removeKey(hostKey);
        if (hostKey === field.originRootHostKey) {
            field.originRootHostKey = null;
        }
    }
};

function buildGraphic(
    mapRecord: SVGMapRecord, boundingRect?: BoundingRect
): {
    root: Group;
    boundingRect: BoundingRect;
} {
    const svgXML = mapRecord.svgXML;
    let result;
    let root;

    try {
        result = svgXML && parseSVG(svgXML, {
            ignoreViewBox: true,
            ignoreRootClip: true
        }) || {};
        root = result.root;
        assert(root != null);
    }
    catch (e) {
        throw new Error('Invalid svg format\n' + e.message);
    }

    const svgWidth = result.width;
    const svgHeight = result.height;
    const viewBoxRect = result.viewBoxRect;

    if (!boundingRect) {
        boundingRect = (svgWidth == null || svgHeight == null)
            // If svg width / height not specified, calculate
            // bounding rect as the width / height
            ? root.getBoundingRect()
            : new BoundingRect(0, 0, 0, 0);

        if (svgWidth != null) {
            boundingRect.width = svgWidth;
        }
        if (svgHeight != null) {
            boundingRect.height = svgHeight;
        }
    }

    if (viewBoxRect) {
        const viewBoxTransform = makeViewBoxTransform(viewBoxRect, boundingRect.width, boundingRect.height);
        const elRoot = root;
        root = new Group();
        root.add(elRoot);
        elRoot.scaleX = elRoot.scaleY = viewBoxTransform.scale;
        elRoot.x = viewBoxTransform.x;
        elRoot.y = viewBoxTransform.y;
    }

    root.setClipPath(new Rect({
        shape: boundingRect.plain()
    }));

    return {
        root: root,
        boundingRect: boundingRect
    };
}
