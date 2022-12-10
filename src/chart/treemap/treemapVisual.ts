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

type NodeModel = Model<TreemapSeriesNodeItemOption>;
type NodeItemStyleModel = Model<TreemapSeriesNodeItemOption['itemStyle']>;

const ITEM_STYLE_NORMAL = 'itemStyle';

const inner = makeInner<{
    drColorMappingBy: TreemapSeriesNodeItemOption['colorMappingBy']
}, VisualMapping>();

interface TreemapVisual {
    color?: ZRColor
    colorAlpha?: number
    colorSaturation?: number
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

    each(['color', 'colorAlpha', 'colorSaturation'] as const, function (visualName) {
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

function buildVisualMapping(
    node: TreemapLayoutNode,
    nodeModel: NodeModel,
    nodeLayout: TreemapItemLayout,
    nodeItemStyleModel: NodeItemStyleModel,
    visuals: TreemapVisual,
    viewChildren: TreemapLayoutNode[]
) {
    if (!viewChildren || !viewChildren.length) {
        return;
    }

    const rangeVisual = getRangeVisual(nodeModel, 'color')
        || (
            visuals.color != null
            && visuals.color !== 'none'
            && (
                getRangeVisual(nodeModel, 'colorAlpha')
                || getRangeVisual(nodeModel, 'colorSaturation')
            )
        );

    if (!rangeVisual) {
        return;
    }

    const visualMin = nodeModel.get('visualMin');
    const visualMax = nodeModel.get('visualMax');
    const dataExtent = nodeLayout.dataExtent.slice() as [number, number];
    visualMin != null && visualMin < dataExtent[0] && (dataExtent[0] = visualMin);
    visualMax != null && visualMax > dataExtent[1] && (dataExtent[1] = visualMax);

    const colorMappingBy = nodeModel.get('colorMappingBy');
    const opt: VisualMappingOption = {
        type: rangeVisual.name,
        dataExtent: dataExtent,
        visual: rangeVisual.range
    };
    if (opt.type === 'color'
        && (colorMappingBy === 'index' || colorMappingBy === 'id')
    ) {
        opt.mappingMethod = 'category';
        opt.loop = true;
        // categories is ordinal, so do not set opt.categories.
    }
    else {
        opt.mappingMethod = 'linear';
    }

    const mapping = new VisualMapping(opt);
    inner(mapping).drColorMappingBy = colorMappingBy;

    return mapping;
}

// Notice: If we don't have the attribute 'colorRange', but only use
// attribute 'color' to represent both concepts of 'colorRange' and 'color',
// (It means 'colorRange' when 'color' is Array, means 'color' when not array),
// this problem will be encountered:
// If a level-1 node doesn't have children, and its siblings have children,
// and colorRange is set on level-1, then the node cannot be colored.
// So we separate 'colorRange' and 'color' to different attributes.
function getRangeVisual(nodeModel: NodeModel, name: keyof TreemapVisual) {
    // 'colorRange', 'colorARange', 'colorSRange'.
    // If not exists on this node, fetch from levels and series.
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
    mapping: VisualMapping,
    seriesModel: TreemapSeriesModel
) {
    const childVisuals = extend({}, visuals);

    if (mapping) {
        // Only support color, colorAlpha, colorSaturation.
        const mappingType = mapping.type as keyof TreemapVisual;
        const colorMappingBy = mappingType === 'color' && inner(mapping).drColorMappingBy;
        const value = colorMappingBy === 'index'
            ? index
            : colorMappingBy === 'id'
            ? seriesModel.mapIdToIndex(child.getId())
            : child.getValue(nodeModel.get('visualDimension'));

        (childVisuals as any)[mappingType] = mapping.mapValueToVisual(value);
    }

    return childVisuals;
}
