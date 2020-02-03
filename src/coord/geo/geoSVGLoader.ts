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
import Group from 'zrender/src/container/Group';
import Rect from 'zrender/src/graphic/shape/Rect';
import {assert, createHashMap} from 'zrender/src/core/util';
import BoundingRect from 'zrender/src/core/BoundingRect';
import {makeInner} from '../../util/model';

var inner = makeInner();

export default {

    /**
     * @param {string} mapName
     * @param {Object} mapRecord {specialAreas, geoJSON}
     * @return {Object} {root, boundingRect}
     */
    load: function (mapName, mapRecord) {
        var originRoot = inner(mapRecord).originRoot;
        if (originRoot) {
            return {
                root: originRoot,
                boundingRect: inner(mapRecord).boundingRect
            };
        }

        var graphic = buildGraphic(mapRecord);

        inner(mapRecord).originRoot = graphic.root;
        inner(mapRecord).boundingRect = graphic.boundingRect;

        return graphic;
    },

    makeGraphic: function (mapName, mapRecord, hostKey) {
        // For performance consideration (in large SVG), graphic only maked
        // when necessary and reuse them according to hostKey.
        var field = inner(mapRecord);
        var rootMap = field.rootMap || (field.rootMap = createHashMap());

        var root = rootMap.get(hostKey);
        if (root) {
            return root;
        }

        var originRoot = field.originRoot;
        var boundingRect = field.boundingRect;

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

    removeGraphic: function (mapName, mapRecord, hostKey) {
        var field = inner(mapRecord);
        var rootMap = field.rootMap;
        rootMap && rootMap.removeKey(hostKey);
        if (hostKey === field.originRootHostKey) {
            field.originRootHostKey = null;
        }
    }
};

function buildGraphic(mapRecord, boundingRect) {
    var svgXML = mapRecord.svgXML;
    var result;
    var root;

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

    var svgWidth = result.width;
    var svgHeight = result.height;
    var viewBoxRect = result.viewBoxRect;

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
        var viewBoxTransform = makeViewBoxTransform(viewBoxRect, boundingRect.width, boundingRect.height);
        var elRoot = root;
        root = new Group();
        root.add(elRoot);
        elRoot.scale = viewBoxTransform.scale;
        elRoot.position = viewBoxTransform.position;
    }

    root.setClipPath(new Rect({
        shape: boundingRect.plain()
    }));

    return {
        root: root,
        boundingRect: boundingRect
    };
}
