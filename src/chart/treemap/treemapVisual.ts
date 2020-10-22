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

import VisualMapping, { VisualMappingOption } from '../../visual/VisualMapping';
import { each, extend, isArray } from 'zrender/src/core/util';
import TreemapSeriesModel, { TreemapSeriesNodeItemOption, TreemapSeriesOption } from './TreemapSeries';
import { TreemapLayoutNode, TreemapItemLayout } from './treemapLayout';
import Model from '../../model/Model';
import { ColorString, ZRColor } from '../../util/types';
import { modifyHSL, modifyAlpha } from 'zrender/src/tool/color';
import { makeInner } from '../../util/model';
import {DecalObject} from 'zrender/src/graphic/Decal';

type NodeModel = Model<TreemapSeriesNodeItemOption>;
type NodeItemStyleModel = Model<TreemapSeriesNodeItemOption['itemStyle']>;

const ITEM_STYLE_NORMAL = 'itemStyle';

const inner = makeInner<{
    drColorMappingBy: TreemapSeriesNodeItemOption['colorMappingBy']
}, VisualMapping>();

interface TreemapVisual {
    color?: ZRColor
    colorAlpha?: number
    colorSaturation?: number,
    decal?: DecalObject
}

type TreemapLevelItemStyleOption = TreemapSeriesOption['levels'][number]['itemStyle'];

export default {
    seriesType: 'treemap',
    reset(seriesModel: TreemapSeriesModel) {
        const tree = seriesModel.getData().tree;
        const root = tree.root;

        if (root.isRemoved()) {
            return;
        }

        travelTree(
            root, // Visual should calculate from tree root but not view root.
            {},
            seriesModel.getViewRoot().getAncestors(),
            seriesModel
        );
    }
};

function travelTree(
    node: TreemapLayoutNode,
    designatedVisual: TreemapVisual,
    viewRootAncestors: TreemapLayoutNode[],
    seriesModel: TreemapSeriesModel
) {
    const nodeModel = node.getModel<TreemapSeriesNodeItemOption>();
    const nodeLayout = node.getLayout();
    const data = node.hostTree.data;

    // Optimize
    if (!nodeLayout || nodeLayout.invisible || !nodeLayout.isInView) {
        return;
    }
    const nodeItemStyleModel = nodeModel.getModel(ITEM_STYLE_NORMAL);
    const visuals = buildVisuals(nodeItemStyleModel, designatedVisual, seriesModel);

    const existsStyle = data.ensureUniqueItemVisual(node.dataIndex, 'style');
    // calculate border color
    let borderColor = nodeItemStyleModel.get('borderColor');
    const borderColorSaturation = nodeItemStyleModel.get('borderColorSaturation');
    let thisNodeColor;
    if (borderColorSaturation != null) {
        // For performance, do not always execute 'calculateColor'.
        thisNodeColor = calculateColor(visuals);
        borderColor = calculateBorderColor(borderColorSaturation, thisNodeColor);
    }
    existsStyle.stroke = borderColor;

    const viewChildren = node.viewChildren;
    if (!viewChildren || !viewChildren.length) {
        thisNodeColor = calculateColor(visuals);
        // Apply visual to this node.
        existsStyle.fill = thisNodeColor;
        data.setItemVisual(node.dataIndex, 'decal', visuals.decal);
    }
    else {
        const mapping = buildVisualMapping(
            node, nodeModel, nodeLayout, nodeItemStyleModel, visuals, viewChildren
        );

        // Designate visual to children.
        each(viewChildren, function (child, index) {
            // If higher than viewRoot, only ancestors of viewRoot is needed to visit.
            if (child.depth >= viewRootAncestors.length
                || child === viewRootAncestors[child.depth]
            ) {
                const childVisual = mapVisual(
                    nodeModel, visuals, child, index, mapping, seriesModel
                );
                travelTree(child, childVisual, viewRootAncestors, seriesModel);
            }
        });
    }
}

function buildVisuals(
    nodeItemStyleModel: Model<TreemapSeriesNodeItemOption['itemStyle']>,
    designatedVisual: TreemapVisual,
    seriesModel: TreemapSeriesModel
) {
    const visuals = extend({}, designatedVisual);
    const designatedVisualItemStyle = seriesModel.designatedVisualItemStyle;

    each(['color', 'colorAlpha', 'colorSaturation', 'decal'] as const, function (visualName) {
        // Priority: thisNode > thisLevel > parentNodeDesignated > seriesModel
        (designatedVisualItemStyle as any)[visualName] = designatedVisual[visualName];
        const val = nodeItemStyleModel.get(visualName);
        designatedVisualItemStyle[visualName] = null;

        val != null && ((visuals as any)[visualName] = val);
    });

    return visuals;
}

function calculateColor(visuals: TreemapVisual) {
    let color = getValueVisualDefine(visuals, 'color') as ColorString;

    if (color) {
        const colorAlpha = getValueVisualDefine(visuals, 'colorAlpha') as number;
        const colorSaturation = getValueVisualDefine(visuals, 'colorSaturation') as number;
        if (colorSaturation) {
            color = modifyHSL(color, null, null, colorSaturation);
        }
        if (colorAlpha) {
            color = modifyAlpha(color, colorAlpha);
        }

        return color;
    }
}

function calculateBorderColor(
    borderColorSaturation: number,
    thisNodeColor: ColorString
) {
    return thisNodeColor != null
            // Can only be string
            ? modifyHSL(thisNodeColor, null, null, borderColorSaturation)
            : null;
}

function getValueVisualDefine(visuals: TreemapVisual, name: keyof TreemapVisual) {
    const value = visuals[name];
    if (value != null && value !== 'none') {
        return value;
    }
}

type TreemapMapping = {
    color: VisualMapping,
    decal?: VisualMapping
};

function buildVisualMapping(
    node: TreemapLayoutNode,
    nodeModel: NodeModel,
    nodeLayout: TreemapItemLayout,
    nodeItemStyleModel: NodeItemStyleModel,
    visuals: TreemapVisual,
    viewChildren: TreemapLayoutNode[]
): TreemapMapping {
    if (!viewChildren || !viewChildren.length) {
        return;
    }

    const colorRangeVisual = getRangeVisual(nodeModel, 'color')
        || (
            visuals.color != null
            && visuals.color !== 'none'
            && (
                getRangeVisual(nodeModel, 'colorAlpha')
                || getRangeVisual(nodeModel, 'colorSaturation')
            )
        );
    if (!colorRangeVisual) {
        return;
    }

    const decalRangeValue = getRangeVisual(nodeModel, 'decal');

    const visualMin = nodeModel.get('visualMin');
    const visualMax = nodeModel.get('visualMax');
    const dataExtent = nodeLayout.dataExtent.slice() as [number, number];
    visualMin != null && visualMin < dataExtent[0] && (dataExtent[0] = visualMin);
    visualMax != null && visualMax > dataExtent[1] && (dataExtent[1] = visualMax);

    const colorMappingBy = nodeModel.get('colorMappingBy');
    const colorOpt: VisualMappingOption = {
        type: colorRangeVisual.name,
        dataExtent: dataExtent,
        visual: colorRangeVisual.range
    };
    if (colorOpt.type === 'color'
        && (colorMappingBy === 'index' || colorMappingBy === 'id')
    ) {
        colorOpt.mappingMethod = 'category';
        colorOpt.loop = true;
        // categories is ordinal, so do not set opt.categories.
    }
    else {
        colorOpt.mappingMethod = 'linear';
    }

    const decalOpt: VisualMappingOption = {
        type: 'decal',
        dataExtent: dataExtent,
        visual: decalRangeValue ? decalRangeValue.range : [visuals.decal],
        mappingMethod: 'category',
        loop: true
    };

    const colorMapping = new VisualMapping(colorOpt);
    inner(colorMapping).drColorMappingBy = colorMappingBy;

    const decalMapping = new VisualMapping(decalOpt);

    return {
        color: colorMapping,
        decal: decalMapping
    };
}

// Notice: If we dont have the attribute 'colorRange', but only use
// attribute 'color' to represent both concepts of 'colorRange' and 'color',
// (It means 'colorRange' when 'color' is Array, means 'color' when not array),
// this problem will be encountered:
// If a level-1 node dont have children, and its siblings has children,
// and colorRange is set on level-1, then the node can not be colored.
// So we separate 'colorRange' and 'color' to different attributes.
function getRangeVisual(nodeModel: NodeModel, name: keyof TreemapVisual) {
    // 'colorRange', 'colorARange', 'colorSRange'.
    // If not exsits on this node, fetch from levels and series.
    const range = nodeModel.get(name);
    return (isArray(range) && range.length) ? {
        name: name,
        range: range
    } : null;
}

function mapVisual(
    nodeModel: NodeModel,
    visuals: TreemapVisual,
    child: TreemapLayoutNode,
    index: number,
    mapping: TreemapMapping,
    seriesModel: TreemapSeriesModel
) {
    const childVisuals = extend({}, visuals);

    if (mapping) {
        let value;
        if (mapping.color) {
            // Only support color, colorAlpha, colorSaturation.
            const colorMappingType = mapping.color.type as keyof TreemapVisual;
            const colorMappingBy = colorMappingType === 'color' && inner(mapping.color).drColorMappingBy;
            value = colorMappingBy === 'index'
                ? index
                : colorMappingBy === 'id'
                ? seriesModel.mapIdToIndex(child.getId())
                : child.getValue(nodeModel.get('visualDimension'));
            (childVisuals as any)[colorMappingType] = mapping.color.mapValueToVisual(value);
        }

        if (mapping.decal && value != null) {
            (childVisuals as any).decal = mapping.decal.mapValueToVisual(value);
        }
    }

    return childVisuals;
}
