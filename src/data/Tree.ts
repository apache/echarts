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
 * Tree data structure
 */

import * as zrUtil from 'zrender/src/core/util';
import Model from '../model/Model';
import linkList from './helper/linkList';
import List from './List';
import createDimensions from './helper/createDimensions';
import { DimensionLoose, ParsedValue } from '../util/types';
import { Dictionary } from 'zrender/src/core/types';

type TreeTraverseOrder = 'preorder' | 'postorder';
type TreeTraverseCallback<Ctx> = (this: Ctx, node: TreeNode) => boolean;
type TreeTraverseOption = {
    order?: TreeTraverseOrder
    attr?: 'children' | 'viewChildren'
};

interface TreeNodeData {
    name?: string
    value?: any
    children?: TreeNodeData[]
}

class TreeNode {
    name: string

    depth: number = 0

    height: number = 0

    parentNode: TreeNode
    /**
     * Reference to list item.
     * Do not persistent dataIndex outside,
     * besause it may be changed by list.
     * If dataIndex -1,
     * this node is logical deleted (filtered) in list.
     */
    dataIndex: number = -1

    children: TreeNode[] = []

    viewChildren: TreeNode[] = []

    isExpand: boolean = false

    readonly hostTree: Tree<Model, any, any>    // TODO: TYPE TreeNode use generic?

    constructor(name: string, hostTree: Tree<Model, any, any>) {
        this.name = name || '';

        this.hostTree = hostTree;
    }
    /**
     * The node is removed.
     */
    isRemoved(): boolean {
        return this.dataIndex < 0;
    }

    /**
     * Travel this subtree (include this node).
     * Usage:
     *    node.eachNode(function () { ... }); // preorder
     *    node.eachNode('preorder', function () { ... }); // preorder
     *    node.eachNode('postorder', function () { ... }); // postorder
     *    node.eachNode(
     *        {order: 'postorder', attr: 'viewChildren'},
     *        function () { ... }
     *    ); // postorder
     *
     * @param options If string, means order.
     * @param options.order 'preorder' or 'postorder'
     * @param options.attr 'children' or 'viewChildren'
     * @param cb If in preorder and return false,
     *                      its subtree will not be visited.
     */
    eachNode<Ctx>(options: TreeTraverseOrder, cb: TreeTraverseCallback<Ctx>, context?: Ctx): void
    eachNode<Ctx>(options: TreeTraverseOption, cb: TreeTraverseCallback<Ctx>, context?: Ctx): void
    eachNode<Ctx>(cb: TreeTraverseCallback<Ctx>, context?: Ctx): void
    eachNode<Ctx>(
        options: TreeTraverseOrder | TreeTraverseOption | TreeTraverseCallback<Ctx>,
        cb?: TreeTraverseCallback<Ctx> | Ctx,
        context?: Ctx
    ) {
        if (typeof options === 'function') {
            context = cb as Ctx;
            cb = options;
            options = null;
        }

        options = options || {};
        if (zrUtil.isString(options)) {
            options = {order: options};
        }

        var order = (options as TreeTraverseOption).order || 'preorder';
        var children = this[(options as TreeTraverseOption).attr || 'children'];

        var suppressVisitSub;
        order === 'preorder' && (suppressVisitSub = (cb as TreeTraverseCallback<Ctx>).call(context as Ctx, this));

        for (var i = 0; !suppressVisitSub && i < children.length; i++) {
            children[i].eachNode(
                options as TreeTraverseOption,
                cb as TreeTraverseCallback<Ctx>,
                context
            );
        }

        order === 'postorder' && (cb as TreeTraverseCallback<Ctx>).call(context, this);
    }

    /**
     * Update depth and height of this subtree.
     */
    updateDepthAndHeight(depth: number) {
        var height = 0;
        this.depth = depth;
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            child.updateDepthAndHeight(depth + 1);
            if (child.height > height) {
                height = child.height;
            }
        }
        this.height = height + 1;
    }

    getNodeById(id: string): TreeNode {
        if (this.getId() === id) {
            return this;
        }
        for (var i = 0, children = this.children, len = children.length; i < len; i++) {
            var res = children[i].getNodeById(id);
            if (res) {
                return res;
            }
        }
    }

    contains(node: TreeNode): boolean {
        if (node === this) {
            return true;
        }
        for (var i = 0, children = this.children, len = children.length; i < len; i++) {
            var res = children[i].contains(node);
            if (res) {
                return res;
            }
        }
    }

    /**
     * @param includeSelf Default false.
     * @return order: [root, child, grandchild, ...]
     */
    getAncestors(includeSelf?: boolean): TreeNode[] {
        var ancestors = [];
        var node = includeSelf ? this : this.parentNode;
        while (node) {
            ancestors.push(node);
            node = node.parentNode;
        }
        ancestors.reverse();
        return ancestors;
    }

    getValue(dimension: DimensionLoose): ParsedValue {
        var data = this.hostTree.data;
        return data.get(data.getDimension(dimension || 'value'), this.dataIndex);
    }

    setLayout(layout: any, merge?: boolean) {
        this.dataIndex >= 0
            && this.hostTree.data.setItemLayout(this.dataIndex, layout, merge);
    }

    /**
     * @return {Object} layout
     */
    getLayout(): any {
        return this.hostTree.data.getItemLayout(this.dataIndex);
    }

    // TODO: TYPE Same type with Model#getModel
    getModel(path: readonly string[] | string) {
        if (this.dataIndex < 0) {
            return;
        }
        var hostTree = this.hostTree;
        var itemModel = hostTree.data.getItemModel(this.dataIndex);
        var levelModel = this.getLevelModel();
        var leavesModel;
        if (!levelModel && (this.children.length === 0 || (this.children.length !== 0 && this.isExpand === false))) {
            leavesModel = this.getLeavesModel();
        }
        return itemModel.getModel(
            path as [string],
            (levelModel || leavesModel || hostTree.hostModel).getModel(path as [string])
        );
    }
    // TODO: TYPE More specific model
    getLevelModel(): Model {
        return (this.hostTree.levelModels || [])[this.depth];
    }

    getLeavesModel(): Model {
        return this.hostTree.leavesModel;
    }

    /**
     * @example
     *  setItemVisual('color', color);
     *  setItemVisual({
     *      'color': color
     *  });
     */
    setVisual(key: string, value: any): void
    setVisual(obj: Dictionary<any>): void
    setVisual(key: string | Dictionary<any>, value?: any) {
        this.dataIndex >= 0
            && this.hostTree.data.setItemVisual(this.dataIndex, key as string, value);
    }

    /**
     * Get item visual
     */
    getVisual(key: string, ignoreParent?: boolean): any {
        return this.hostTree.data.getItemVisual(this.dataIndex, key, ignoreParent);
    }

    getRawIndex(): number {
        return this.hostTree.data.getRawIndex(this.dataIndex);
    }

    getId(): string {
        return this.hostTree.data.getId(this.dataIndex);
    }

    /**
     * if this is an ancestor of another node
     *
     * @param node another node
     * @return if is ancestor
     */
    isAncestorOf(node: TreeNode): boolean {
        var parent = node.parentNode;
        while (parent) {
            if (parent === this) {
                return true;
            }
            parent = parent.parentNode;
        }
        return false;
    }

    /**
     * if this is an descendant of another node
     *
     * @param node another node
     * @return if is descendant
     */
    isDescendantOf(node: TreeNode): boolean {
        return node !== this && node.isAncestorOf(this);
    }
};

class Tree<HostModel extends Model, LevelOption, LeavesOption> {

    type: 'tree' = 'tree'

    root: TreeNode

    data: List

    hostModel: HostModel

    levelModels: Model<LevelOption>[]

    leavesModel: Model<LeavesOption>

    private _nodes: TreeNode[] = []

    constructor(hostModel: HostModel, levelOptions: LevelOption[], leavesOption: LeavesOption) {

        this.hostModel = hostModel;

        this.levelModels = zrUtil.map(levelOptions || [], function (levelDefine) {
            return new Model(levelDefine, hostModel, hostModel.ecModel);
        });

        this.leavesModel = new Model<LeavesOption>(
            leavesOption || {} as LeavesOption,
            hostModel,
            hostModel.ecModel
        );
    }
    /**
     * Travel this subtree (include this node).
     * Usage:
     *    node.eachNode(function () { ... }); // preorder
     *    node.eachNode('preorder', function () { ... }); // preorder
     *    node.eachNode('postorder', function () { ... }); // postorder
     *    node.eachNode(
     *        {order: 'postorder', attr: 'viewChildren'},
     *        function () { ... }
     *    ); // postorder
     *
     * @param options If string, means order.
     * @param options.order 'preorder' or 'postorder'
     * @param options.attr 'children' or 'viewChildren'
     * @param cb
     * @param context
     */
    eachNode<Ctx>(options: TreeTraverseOrder, cb: TreeTraverseCallback<Ctx>, context?: Ctx): void
    eachNode<Ctx>(options: TreeTraverseOption, cb: TreeTraverseCallback<Ctx>, context?: Ctx): void
    eachNode<Ctx>(cb: TreeTraverseCallback<Ctx>, context?: Ctx): void
    eachNode<Ctx>(
        options: TreeTraverseOrder | TreeTraverseOption | TreeTraverseCallback<Ctx>,
        cb?: TreeTraverseCallback<Ctx> | Ctx,
        context?: Ctx
    ) {
        this.root.eachNode(options as TreeTraverseOption, cb as TreeTraverseCallback<Ctx>, context);
    }

    getNodeByDataIndex(dataIndex: number): TreeNode {
        var rawIndex = this.data.getRawIndex(dataIndex);
        return this._nodes[rawIndex];
    }

    getNodeById(name: string): TreeNode {
        return this.root.getNodeById(name);
    }

    /**
     * Update item available by list,
     * when list has been performed options like 'filterSelf' or 'map'.
     */
    update() {
        var data = this.data;
        var nodes = this._nodes;

        for (var i = 0, len = nodes.length; i < len; i++) {
            nodes[i].dataIndex = -1;
        }

        for (var i = 0, len = data.count(); i < len; i++) {
            nodes[data.getRawIndex(i)].dataIndex = i;
        }
    }

    /**
     * Clear all layouts
     */
    clearLayouts() {
        this.data.clearItemLayouts();
    }


    /**
     * data node format:
     * {
     *     name: ...
     *     value: ...
     *     children: [
     *         {
     *             name: ...
     *             value: ...
     *             children: ...
     *         },
     *         ...
     *     ]
     * }
     */
    static createTree<T extends TreeNodeData, HostModel extends Model, LevelOption, LeavesOption>(
        dataRoot: T,
        hostModel: HostModel,
        treeOptions?: {levels: LevelOption[], leaves: LeavesOption},
        beforeLink?: (data: List) => void
    ) {

        var tree = new Tree(hostModel, treeOptions.levels, treeOptions.leaves);
        var listData: TreeNodeData[] = [];
        var dimMax = 1;

        buildHierarchy(dataRoot);

        function buildHierarchy(dataNode: TreeNodeData, parentNode?: TreeNode) {
            var value = dataNode.value;
            dimMax = Math.max(dimMax, zrUtil.isArray(value) ? value.length : 1);

            listData.push(dataNode);

            var node = new TreeNode(dataNode.name, tree);
            parentNode
                ? addChild(node, parentNode)
                : (tree.root = node);

            tree._nodes.push(node);

            var children = dataNode.children;
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    buildHierarchy(children[i], node);
                }
            }
        }

        tree.root.updateDepthAndHeight(0);

        var dimensionsInfo = createDimensions(listData, {
            coordDimensions: ['value'],
            dimensionsCount: dimMax
        });

        var list = new List(dimensionsInfo, hostModel);
        list.initData(listData);

        linkList({
            mainData: list,
            struct: tree,
            structAttr: 'tree'
        });

        tree.update();

        beforeLink && beforeLink(list);

        return tree;
    }

}

/**
 * It is needed to consider the mess of 'list', 'hostModel' when creating a TreeNote,
 * so this function is not ready and not necessary to be public.
 */
function addChild(child: TreeNode, node: TreeNode) {
    var children = node.children;
    if (child.parentNode === node) {
        return;
    }

    children.push(child);
    child.parentNode = node;
}

export default Tree;