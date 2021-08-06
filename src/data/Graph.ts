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

import * as zrUtil from 'zrender/src/core/util';
import { Dictionary } from 'zrender/src/core/types';
import List from './List';
import Model from '../model/Model';
import Element from 'zrender/src/Element';
import { DimensionLoose, ParsedValue } from '../util/types';

// id may be function name of Object, add a prefix to avoid this problem.
function generateNodeKey(id: string): string {
    return '_EC_' + id;
}

class Graph {
    type: 'graph' = 'graph';

    readonly nodes: GraphNode[] = [];

    readonly edges: GraphEdge[] = [];

    data: List;

    edgeData: List;

    /**
     * Whether directed graph.
     */
    private _directed: boolean;

    private _nodesMap: Dictionary<GraphNode> = {};
    /**
     * @type {Object.<string, module:echarts/data/Graph.Edge>}
     * @private
     */
    private _edgesMap: Dictionary<GraphEdge> = {};


    constructor(directed?: boolean) {
        this._directed = directed || false;
    }

    /**
     * If is directed graph
     */
    isDirected(): boolean {
        return this._directed;
    };

    /**
     * Add a new node
     */
    addNode(id: string | number, dataIndex?: number): GraphNode {
        id = id == null ? ('' + dataIndex) : ('' + id);

        const nodesMap = this._nodesMap;

        if (nodesMap[generateNodeKey(id)]) {
            if (__DEV__) {
                console.error('Graph nodes have duplicate name or id');
            }
            return;
        }

        const node = new GraphNode(id, dataIndex);
        node.hostGraph = this;

        this.nodes.push(node);

        nodesMap[generateNodeKey(id)] = node;
        return node;
    };

    /**
     * Get node by data index
     */
    getNodeByIndex(dataIndex: number): GraphNode {
        const rawIdx = this.data.getRawIndex(dataIndex);
        return this.nodes[rawIdx];
    };
    /**
     * Get node by id
     */
    getNodeById(id: string): GraphNode {
        return this._nodesMap[generateNodeKey(id)];
    };

    /**
     * Add a new edge
     */
    addEdge(n1: GraphNode | number | string, n2: GraphNode | number | string, dataIndex?: number) {
        const nodesMap = this._nodesMap;
        const edgesMap = this._edgesMap;

        // PNEDING
        if (typeof n1 === 'number') {
            n1 = this.nodes[n1];
        }
        if (typeof n2 === 'number') {
            n2 = this.nodes[n2];
        }

        if (!(n1 instanceof GraphNode)) {
            n1 = nodesMap[generateNodeKey(n1)];
        }
        if (!(n2 instanceof GraphNode)) {
            n2 = nodesMap[generateNodeKey(n2)];
        }
        if (!n1 || !n2) {
            return;
        }

        const key = n1.id + '-' + n2.id;

        const edge = new GraphEdge(n1, n2, dataIndex);
        edge.hostGraph = this;

        if (this._directed) {
            n1.outEdges.push(edge);
            n2.inEdges.push(edge);
        }
        n1.edges.push(edge);
        if (n1 !== n2) {
            n2.edges.push(edge);
        }

        this.edges.push(edge);
        edgesMap[key] = edge;

        return edge;
    };

    /**
     * Get edge by data index
     */
    getEdgeByIndex(dataIndex: number): GraphEdge {
        const rawIdx = this.edgeData.getRawIndex(dataIndex);
        return this.edges[rawIdx];
    };
    /**
     * Get edge by two linked nodes
     */
    getEdge(n1: string | GraphNode, n2: string | GraphNode): GraphEdge {
        if (n1 instanceof GraphNode) {
            n1 = n1.id;
        }
        if (n2 instanceof GraphNode) {
            n2 = n2.id;
        }

        const edgesMap = this._edgesMap;

        if (this._directed) {
            return edgesMap[n1 + '-' + n2];
        }
        else {
            return edgesMap[n1 + '-' + n2]
                || edgesMap[n2 + '-' + n1];
        }
    };

    /**
     * Iterate all nodes
     */
    eachNode<Ctx>(
        cb: (this: Ctx, node: GraphNode, idx: number) => void,
        context?: Ctx
    ) {
        const nodes = this.nodes;
        const len = nodes.length;
        for (let i = 0; i < len; i++) {
            if (nodes[i].dataIndex >= 0) {
                cb.call(context, nodes[i], i);
            }
        }
    };

    /**
     * Iterate all edges
     */
    eachEdge<Ctx>(
        cb: (this: Ctx, edge: GraphEdge, idx: number) => void,
        context?: Ctx
    ) {
        const edges = this.edges;
        const len = edges.length;
        for (let i = 0; i < len; i++) {
            if (edges[i].dataIndex >= 0
                && edges[i].node1.dataIndex >= 0
                && edges[i].node2.dataIndex >= 0
            ) {
                cb.call(context, edges[i], i);
            }
        }
    };

    /**
     * Breadth first traverse
     * Return true to stop traversing
     */
    breadthFirstTraverse<Ctx>(
        cb: (this: Ctx, node: GraphNode, fromNode: GraphNode) => boolean | void,
        startNode: GraphNode | string,
        direction: 'none' | 'in' | 'out',
        context?: Ctx
    ) {
        if (!(startNode instanceof GraphNode)) {
            startNode = this._nodesMap[generateNodeKey(startNode)];
        }
        if (!startNode) {
            return;
        }

        const edgeType: 'inEdges' | 'outEdges' | 'edges' = direction === 'out'
            ? 'outEdges' : (direction === 'in' ? 'inEdges' : 'edges');

        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].__visited = false;
        }

        if (cb.call(context, startNode, null)) {
            return;
        }

        const queue = [startNode];
        while (queue.length) {
            const currentNode = queue.shift();
            const edges = currentNode[edgeType];

            for (let i = 0; i < edges.length; i++) {
                const e = edges[i];
                const otherNode = e.node1 === currentNode
                    ? e.node2 : e.node1;
                if (!otherNode.__visited) {
                    if (cb.call(context, otherNode, currentNode)) {
                        // Stop traversing
                        return;
                    }
                    queue.push(otherNode);
                    otherNode.__visited = true;
                }
            }
        }
    };

    // TODO
    // depthFirstTraverse(
    //     cb, startNode, direction, context
    // ) {

    // };

    // Filter update
    update() {
        const data = this.data;
        const edgeData = this.edgeData;
        const nodes = this.nodes;
        const edges = this.edges;

        for (let i = 0, len = nodes.length; i < len; i++) {
            nodes[i].dataIndex = -1;
        }
        for (let i = 0, len = data.count(); i < len; i++) {
            nodes[data.getRawIndex(i)].dataIndex = i;
        }

        edgeData.filterSelf(function (idx) {
            const edge = edges[edgeData.getRawIndex(idx)];
            return edge.node1.dataIndex >= 0 && edge.node2.dataIndex >= 0;
        });

        // Update edge
        for (let i = 0, len = edges.length; i < len; i++) {
            edges[i].dataIndex = -1;
        }
        for (let i = 0, len = edgeData.count(); i < len; i++) {
            edges[edgeData.getRawIndex(i)].dataIndex = i;
        }
    };

    /**
     * @return {module:echarts/data/Graph}
     */
    clone() {
        const graph = new Graph(this._directed);
        const nodes = this.nodes;
        const edges = this.edges;
        for (let i = 0; i < nodes.length; i++) {
            graph.addNode(nodes[i].id, nodes[i].dataIndex);
        }
        for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            graph.addEdge(e.node1.id, e.node2.id, e.dataIndex);
        }
        return graph;
    };


}


class GraphNode {

    id: string;

    inEdges: GraphEdge[] = [];

    outEdges: GraphEdge[] = [];

    edges: GraphEdge[] = [];

    hostGraph: Graph;

    dataIndex: number = -1;

    // Used in traverse of Graph
    __visited: boolean;

    constructor(id?: string, dataIndex?: number) {
        this.id = id == null ? '' : id;
        this.dataIndex = dataIndex == null ? -1 : dataIndex;
    }

    /**
     * @return {number}
     */
    degree() {
        return this.edges.length;
    }

    /**
     * @return {number}
     */
    inDegree() {
        return this.inEdges.length;
    }

    /**
    * @return {number}
    */
    outDegree() {
        return this.outEdges.length;
    }

    // TODO: TYPE Same type with Model#getModel
    getModel<T = unknown>(): Model<T>
    getModel<T = unknown, S extends keyof T= keyof T>(path: S): Model<T[S]>
    getModel<T = unknown>(path?: string): Model {
        if (this.dataIndex < 0) {
            return;
        }
        const graph = this.hostGraph;
        const itemModel = graph.data.getItemModel<T>(this.dataIndex);

        return itemModel.getModel(path as any);
    }

    getAdjacentDataIndices(): {node: number[], edge: number[]} {
        const dataIndices = {
            edge: [] as number[],
            node: [] as number[]
        };
        for (let i = 0; i < this.edges.length; i++) {
            const adjacentEdge = this.edges[i];
            if (adjacentEdge.dataIndex < 0) {
                continue;
            }
            dataIndices.edge.push(adjacentEdge.dataIndex);
            dataIndices.node.push(adjacentEdge.node1.dataIndex, adjacentEdge.node2.dataIndex);
        }
        return dataIndices;
    }
}


class GraphEdge {
    /**
     * The first node. If directed graph, it represents the source node.
     */
    node1: GraphNode;
    /**
     * The second node. If directed graph, it represents the target node.
     */
    node2: GraphNode;

    dataIndex: number = -1;

    hostGraph: Graph;

    constructor(n1: GraphNode, n2: GraphNode, dataIndex?: number) {
        this.node1 = n1;
        this.node2 = n2;
        this.dataIndex = dataIndex == null ? -1 : dataIndex;
    }

    getModel<T = unknown>(): Model<T>
    getModel<T = unknown, S extends keyof T= keyof T>(path: S): Model<T[S]>
    getModel<T = unknown>(path?: string): Model {
        if (this.dataIndex < 0) {
            return;
        }
        const graph = this.hostGraph;
        const itemModel = graph.edgeData.getItemModel(this.dataIndex);

        return itemModel.getModel(path as any);
    }

    getAdjacentDataIndices(): {node: number[], edge: number[]} {
        return {
            edge: [this.dataIndex],
            node: [this.node1.dataIndex, this.node2.dataIndex]
        };
    }
}

type GetDataName<Host> = Host extends GraphEdge ? 'edgeData' : 'data';

interface GraphDataProxyMixin {
    getValue(dimension?: DimensionLoose): ParsedValue;
    // TODO: TYPE stricter type.
    setVisual(key: string | Dictionary<any>, value?: any): void;

    getVisual(key: string): any,

    setLayout(layout: any, merge?: boolean): void;

    getLayout(): any

    getGraphicEl(): Element

    getRawIndex(): number
}

function createGraphDataProxyMixin<Host extends GraphEdge | GraphNode>(
    hostName: 'hostGraph',
    dataName: GetDataName<Host>
): GraphDataProxyMixin {
    return {
        /**
         * @param Default 'value'. can be 'a', 'b', 'c', 'd', 'e'.
         */
        getValue(this: Host, dimension?: DimensionLoose): ParsedValue {
            const data = this[hostName][dataName];
            return data.get(data.getDimension(dimension || 'value'), this.dataIndex);
        },
        // TODO: TYPE stricter type.
        setVisual(this: Host, key: string | Dictionary<any>, value?: any) {
            this.dataIndex >= 0
                && this[hostName][dataName].setItemVisual(this.dataIndex, key as any, value);
        },

        getVisual(this: Host, key: string) {
            return this[hostName][dataName].getItemVisual(this.dataIndex, key as any);
        },

        setLayout(this: Host, layout: any, merge?: boolean) {
            this.dataIndex >= 0
                && this[hostName][dataName].setItemLayout(this.dataIndex, layout, merge);
        },

        getLayout(this: Host) {
            return this[hostName][dataName].getItemLayout(this.dataIndex);
        },

        getGraphicEl(this: Host): Element {
            return this[hostName][dataName].getItemGraphicEl(this.dataIndex);
        },

        getRawIndex(this: Host) {
            return this[hostName][dataName].getRawIndex(this.dataIndex);
        }
    };
};


interface GraphEdge extends GraphDataProxyMixin {};
interface GraphNode extends GraphDataProxyMixin {};

zrUtil.mixin(GraphNode, createGraphDataProxyMixin('hostGraph', 'data'));
zrUtil.mixin(GraphEdge, createGraphDataProxyMixin('hostGraph', 'edgeData'));

export default Graph;

export {GraphNode, GraphEdge};