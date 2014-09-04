// 1. Graph Drawing by Force-directed Placement
// 2. http://webatlas.fr/tempshare/ForceAtlas2_Paper.pdf
define(function __echartsForceLayoutWorker(require) {

    'use strict';

    var vec2;
    // In web worker
    var inWorker = typeof(window) === 'undefined' && typeof(require) === 'undefined';
    if (inWorker) {
        vec2 = {
            create: function(x, y) {
                var out = new Float32Array(2);
                out[0] = x || 0;
                out[1] = y || 0;
                return out;
            },
            dist: function(a, b) {
                var x = b[0] - a[0];
                var y = b[1] - a[1];
                return Math.sqrt(x*x + y*y);
            },
            len: function(a) {
                var x = a[0];
                var y = a[1];
                return Math.sqrt(x*x + y*y);
            },
            scaleAndAdd: function(out, a, b, scale) {
                out[0] = a[0] + b[0] * scale;
                out[1] = a[1] + b[1] * scale;
                return out;
            },
            scale: function(out, a, b) {
                out[0] = a[0] * b;
                out[1] = a[1] * b;
                return out;
            },
            add: function(out, a, b) {
                out[0] = a[0] + b[0];
                out[1] = a[1] + b[1];
                return out;
            },
            sub: function(out, a, b) {
                out[0] = a[0] - b[0];
                out[1] = a[1] - b[1];
                return out;
            },
            normalize: function(out, a) {
                var x = a[0];
                var y = a[1];
                var len = x*x + y*y;
                if (len > 0) {
                    //TODO: evaluate use of glm_invsqrt here?
                    len = 1 / Math.sqrt(len);
                    out[0] = a[0] * len;
                    out[1] = a[1] * len;
                }
                return out;
            },
            negate: function(out, a) {
                out[0] = -a[0];
                out[1] = -a[1];
                return out;
            },
            copy: function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                return out;
            },
            set: function(out, x, y) {
                out[0] = x;
                out[1] = y;
                return out;
            }
        };
    } else {
        vec2 = require('zrender/tool/vector');
    }
    var ArrayCtor = typeof(Float32Array) == 'undefined' ? Array : Float32Array;

    /****************************
     * Class: Region
     ***************************/

    function Region() {

        this.subRegions = [];

        this.nSubRegions = 0;

        this.node = null;

        this.mass = 0;

        this.centerOfMass = null;

        this.bbox = new ArrayCtor(4);

        this.size = 0;
    }

    // Reset before update
    Region.prototype.beforeUpdate = function() {
        for (var i = 0; i < this.nSubRegions; i++) {
            this.subRegions[i].beforeUpdate();
        }
        this.mass = 0;
        if (this.centerOfMass) {
            this.centerOfMass[0] = 0;
            this.centerOfMass[1] = 0;
        }
        this.nSubRegions = 0;
        this.node = null;
    };
    // Clear after update
    Region.prototype.afterUpdate = function() {
        this.subRegions.length = this.nSubRegions;
        for (var i = 0; i < this.nSubRegions; i++) {
            this.subRegions[i].afterUpdate();
        }
    };

    Region.prototype.addNode = function(node) {
        if (this.nSubRegions === 0) {
            if (this.node == null) {
                this.node = node;
                return;
            } else {
                this._addNodeToSubRegion(this.node);
                this.node = null;
            }
        }
        this._addNodeToSubRegion(node);

        this._updateCenterOfMass(node);
    };

    Region.prototype.findSubRegion = function(x, y) {
        for (var i = 0; i < this.nSubRegions; i++) {
            var region = this.subRegions[i];
            if (region.contain(x, y)) {
                return region;
            }
        }
    };

    Region.prototype.contain = function(x, y) {
        return this.bbox[0] <= x
            && this.bbox[2] >= x
            && this.bbox[1] <= y
            && this.bbox[3] >= y;
    };

    Region.prototype.setBBox = function(minX, minY, maxX, maxY) {
        // Min
        this.bbox[0] = minX;
        this.bbox[1] = minY;
        // Max
        this.bbox[2] = maxX;
        this.bbox[3] = maxY;

        this.size = (maxX - minX + maxY - minY) / 2;
    };

    Region.prototype._newSubRegion = function() {
        var subRegion = this.subRegions[this.nSubRegions];
        if (!subRegion) {
            subRegion = new Region();
            this.subRegions[this.nSubRegions] = subRegion;
        }
        this.nSubRegions++;
        return subRegion;
    };

    Region.prototype._addNodeToSubRegion = function(node) {
        var subRegion = this.findSubRegion(node.position[0], node.position[1]);
        var bbox = this.bbox;
        if (!subRegion) {
            var cx = (bbox[0] + bbox[2]) / 2;
            var cy = (bbox[1] + bbox[3]) / 2;
            var w = (bbox[2] - bbox[0]) / 2;
            var h = (bbox[3] - bbox[1]) / 2;
            
            var xi = node.position[0] >= cx ? 1 : 0;
            var yi = node.position[1] >= cy ? 1 : 0;

            var subRegion = this._newSubRegion();
            // Min
            subRegion.setBBox(
                // Min
                xi * w + bbox[0],
                yi * h + bbox[1],
                // Max
                (xi + 1) * w + bbox[0],
                (yi + 1) * h + bbox[1]
            );
        }

        subRegion.addNode(node);
    };

    Region.prototype._updateCenterOfMass = function(node) {
        // Incrementally update
        if (this.centerOfMass == null) {
            this.centerOfMass = vec2.create();
        }
        var x = this.centerOfMass[0] * this.mass;
        var y = this.centerOfMass[1] * this.mass;
        x += node.position[0] * node.mass;
        y += node.position[1] * node.mass;
        this.mass += node.mass;
        this.centerOfMass[0] = x / this.mass;
        this.centerOfMass[1] = y / this.mass;
    };

    /****************************
     * Class: Graph Node
     ***************************/
    function GraphNode() {
        this.position = vec2.create();

        this.force = vec2.create();
        this.forcePrev = vec2.create();

        this.speed = vec2.create();
        this.speedPrev = vec2.create();

        // If repulsionByDegree is true
        //  mass = inDegree + outDegree + 1
        // Else
        //  mass is manually set
        this.mass = 1;

        this.inDegree = 0;
        this.outDegree = 0;
    }

    /****************************
     * Class: Graph Edge
     ***************************/
    function GraphEdge(source, target) {
        this.source = source;
        this.target = target;

        this.weight = 1;
    }

    /****************************
     * Class: ForceLayout
     ***************************/
    function ForceLayout() {

        this.barnesHutOptimize = false;
        this.barnesHutTheta = 1.5;

        this.repulsionByDegree = false;

        this.preventOverlap = false;
        this.strongGravity = true;

        this.gravity = 1.0;
        this.scaling = 1.0;

        this.edgeWeightInfluence = 1.0;

        this.center = [0, 0];
        this.width = 500;
        this.height = 500;

        this.maxSpeedIncrease = 1.0;

        this.nodes = [];
        this.edges = [];

        this.bbox = new ArrayCtor(4);

        this._rootRegion = new Region();
        this._rootRegion.centerOfMass = vec2.create();

        this._massArr = null;

        this._k = 0;
    }

    ForceLayout.prototype.initNodes = function(positionArr, massArr, sizeArr) {

        this.temperature = 1.0;

        var nNodes = positionArr.length / 2;
        this.nodes.length = 0;
        var haveSize = typeof(sizeArr) !== 'undefined';

        for (var i = 0; i < nNodes; i++) {
            var node = new GraphNode();
            node.position[0] = positionArr[i * 2];
            node.position[1] = positionArr[i * 2 + 1];
            node.mass = massArr[i];
            if (haveSize) {
                node.size = sizeArr[i];
            }
            this.nodes.push(node);
        }

        this._massArr = massArr;
        if (haveSize) {
            this._sizeArr = sizeArr;
        }
    };

    ForceLayout.prototype.initEdges = function(edgeArr, edgeWeightArr) {
        var nEdges = edgeArr.length / 2;
        this.edges.length = 0;
        var edgeHaveWeight = typeof(edgeWeightArr) !== 'undefined';

        for (var i = 0; i < nEdges; i++) {
            var sIdx = edgeArr[i * 2];
            var tIdx = edgeArr[i * 2 + 1];
            var sNode = this.nodes[sIdx];
            var tNode = this.nodes[tIdx];

            if (!sNode || !tNode) {
                continue;
            }
            sNode.outDegree++;
            tNode.inDegree++;
            var edge = new GraphEdge(sNode, tNode);

            if (edgeHaveWeight) {
                edge.weight = edgeWeightArr[i];
            }

            this.edges.push(edge);
        }
    };

    ForceLayout.prototype.update = function() {

        var nNodes = this.nodes.length;

        this.updateBBox();

        this._k = 0.4 * this.scaling * Math.sqrt(this.width * this.height / nNodes);

        if (this.barnesHutOptimize) {
            this._rootRegion.setBBox(
                this.bbox[0], this.bbox[1],
                this.bbox[2], this.bbox[3]
            );
            this._rootRegion.beforeUpdate();
            for (var i = 0; i < nNodes; i++) {
                this._rootRegion.addNode(this.nodes[i]);
            }
            this._rootRegion.afterUpdate();
        } else {
            // Update center of mass of whole graph
            var mass = 0;
            var centerOfMass = this._rootRegion.centerOfMass;
            vec2.set(centerOfMass, 0, 0);
            for (var i = 0; i < nNodes; i++) {
                var node = this.nodes[i];
                mass += node.mass;
                vec2.scaleAndAdd(centerOfMass, centerOfMass, node.position, node.mass);
            }
            vec2.scale(centerOfMass, centerOfMass, 1 / mass);
        }

        // Reset forces
        for (var i = 0; i < nNodes; i++) {
            var node = this.nodes[i];
            vec2.copy(node.forcePrev, node.force);
            vec2.copy(node.speedPrev, node.speed);
            vec2.set(node.force, 0, 0);
        }

        // Compute forces
        // Repulsion
        for (var i = 0; i < nNodes; i++) {
            var na = this.nodes[i];
            if (this.barnesHutOptimize) {
                this.applyRegionToNodeRepulsion(this._rootRegion, na);
            } else {
                for (var j = i + 1; j < nNodes; j++) {
                    var nb = this.nodes[j];
                    this.applyNodeToNodeRepulsion(na, nb, false);
                }
            }

            // Gravity
            if (this.gravity > 0) {
                this.applyNodeGravity(na);
            }
        }

        // Attraction
        for (var i = 0; i < this.edges.length; i++) {
            this.applyEdgeAttraction(this.edges[i]);
        }

        // Apply forces
        // var speed = vec2.create();
        var v = vec2.create();
        for (var i = 0; i < nNodes; i++) {
            var node = this.nodes[i];
            var speed = node.speed;

            // var swing = vec2.dist(node.force, node.forcePrev);
            // // var swing = 30;
            // vec2.scale(node.force, node.force, 1 / (1 + Math.sqrt(swing)));
            vec2.scale(node.force, node.force, 1 / 30);

            // contraint force
            var df = vec2.len(node.force) + 0.1;
            var scale = Math.min(df, 500.0) / df;
            vec2.scale(node.force, node.force, scale);

            vec2.add(speed, speed, node.force);

            vec2.scale(speed, speed, this.temperature);

            // Prevent swinging
            // Limited the increase of speed up to 100% each step
            // TODO adjust by nodes number
            vec2.sub(v, speed, node.speedPrev);
            var swing = vec2.len(v);
            if (swing > 0) {
                vec2.scale(v, v, 1 / swing);
                var base = vec2.len(node.speedPrev);
                if (base > 0) {
                    swing = Math.min(swing / base, this.maxSpeedIncrease) * base;
                    vec2.scaleAndAdd(speed, node.speedPrev, v, swing);
                }
            }

            // constraint speed
            var ds = vec2.len(speed);
            var scale = Math.min(ds, 100.0) / (ds + 0.1);
            vec2.scale(speed, speed, scale);

            vec2.add(node.position, node.position, speed);
        }
    };

    ForceLayout.prototype.applyRegionToNodeRepulsion = (function() {
        var v = vec2.create();
        return function applyRegionToNodeRepulsion(region, node) {
            if (region.node) { // Region is a leaf 
                this.applyNodeToNodeRepulsion(region.node, node, true);
            } else {
                vec2.sub(v, node.position, region.centerOfMass);
                var d2 = v[0] * v[0] + v[1] * v[1];
                if (d2 > this.barnesHutTheta * region.size * region.size) {
                    var factor = this._k * this._k * (node.mass + region.mass) / (d2 + 1);
                    vec2.scaleAndAdd(node.force, node.force, v, factor * 2);
                } else {
                    for (var i = 0; i < region.nSubRegions; i++) {
                        this.applyRegionToNodeRepulsion(region.subRegions[i], node);
                    }
                }
            }
        };
    })();

    ForceLayout.prototype.applyNodeToNodeRepulsion = (function() {
        var v = vec2.create();
        return function applyNodeToNodeRepulsion(na, nb, oneWay) {
            if (na == nb) {
                return;
            }
            vec2.sub(v, na.position, nb.position);
            var d2 = v[0] * v[0] + v[1] * v[1];

            // PENDING
            if (d2 === 0) {
                return;
            }

            var factor;
            var k2 = this._k * this._k;
            var mass = na.mass + nb.mass;

            if (this.preventOverlap) {
                var d = Math.sqrt(d2);
                d = d - na.size - nb.size;
                if (d > 0) {
                    factor = k2 * mass / (d * d);
                } else if (d <= 0) {
                    // A stronger repulsion if overlap
                    factor = k2 * 10 * mass;
                }
            } else {
                // Divide factor by an extra `d` to normalize the `v`
                factor = k2 * mass / d2;
            }

            if (!oneWay) {
                vec2.scaleAndAdd(na.force, na.force, v, factor * 2);
            }
            vec2.scaleAndAdd(nb.force, nb.force, v, -factor * 2);
        };
    })();

    ForceLayout.prototype.applyEdgeAttraction = (function() {
        var v = vec2.create();
        return function applyEdgeAttraction(edge) {
            var na = edge.source;
            var nb = edge.target;

            vec2.sub(v, na.position, nb.position);
            var d = vec2.len(v);

            var w;
            if (this.edgeWeightInfluence === 0) {
                w = 1;
            } else if (this.edgeWeightInfluence == 1) {
                w = edge.weight;
            } else {
                w = Math.pow(edge.weight, this.edgeWeightInfluence);
            }

            var factor;

            if (this.preventOverlap) {
                d = d - na.size - nb.size;
                if (d <= 0) {
                    // No attraction
                    return;
                }
            }

            var factor = -w * d / this._k;

            vec2.scaleAndAdd(na.force, na.force, v, factor);
            vec2.scaleAndAdd(nb.force, nb.force, v, -factor);
        };
    })();

    ForceLayout.prototype.applyNodeGravity = (function() {
        var v = vec2.create();
        return function(node) {
            // PENDING Move to centerOfMass or [0, 0] ?
            // vec2.sub(v, this._rootRegion.centerOfMass, node.position);
            // vec2.negate(v, node.position);
            vec2.sub(v, this.center, node.position);
            if (this.width > this.height) {
                // Stronger gravity on y axis
                v[1] *= this.width / this.height;
            } else {
                // Stronger gravity on x axis
                v[0] *= this.height / this.width;
            }
            var d = vec2.len(v) / 100;
            
            if (this.strongGravity) {
                vec2.scaleAndAdd(node.force, node.force, v, d * this.gravity * node.mass);
            } else {
                vec2.scaleAndAdd(node.force, node.force, v, this.gravity * node.mass / (d + 1));
            }
        };
    })();

    ForceLayout.prototype.updateBBox = function() {
        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        for (var i = 0; i < this.nodes.length; i++) {
            var pos = this.nodes[i].position;
            minX = Math.min(minX, pos[0]);
            minY = Math.min(minY, pos[1]);
            maxX = Math.max(maxX, pos[0]);
            maxY = Math.max(maxY, pos[1]);
        }
        this.bbox[0] = minX;
        this.bbox[1] = minY;
        this.bbox[2] = maxX;
        this.bbox[3] = maxY;
    };

    ForceLayout.getWorkerCode = function() {
        var str = __echartsForceLayoutWorker.toString();
        return str.slice(str.indexOf('{') + 1, str.lastIndexOf('return'));
    };

    /****************************
     * Main process
     ***************************/

    /* jshint ignore:start */
    if (inWorker) {
        var forceLayout = null;
        
        self.onmessage = function(e) {
            // Position read back
            if (e.data instanceof ArrayBuffer) {
                if (!forceLayout) {
                    return;
                }
                var positionArr = new Float32Array(e.data);
                var nNodes = (positionArr.length - 1) / 2;
                for (var i = 0; i < nNodes; i++) {
                    var node = forceLayout.nodes[i];
                    node.position[0] = positionArr[i * 2 + 1];
                    node.position[1] = positionArr[i * 2 + 2];
                }
                return;
            }

            switch(e.data.cmd) {
                case 'init':
                    if (!forceLayout) {
                        forceLayout = new ForceLayout();
                    }
                    forceLayout.initNodes(e.data.nodesPosition, e.data.nodesMass, e.data.nodesSize);
                    forceLayout.initEdges(e.data.edges, e.data.edgesWeight);
                    forceLayout._token = e.data.token;
                    break;
                case 'updateConfig':
                    if (forceLayout) {
                        for (var name in e.data.config) {
                            forceLayout[name] = e.data.config[name];
                        }
                    }
                    break;
                case 'update':
                    var steps = e.data.steps;

                    if (forceLayout) {
                        var nNodes = forceLayout.nodes.length;
                        var positionArr = new Float32Array(nNodes * 2 + 1);

                        forceLayout.temperature = e.data.temperature;

                        if (e.data.temperature > 0.01) {
                            for (var i = 0; i < steps; i++) {
                                forceLayout.update();
                                forceLayout.temperature *= e.data.coolDown;
                            }
                            // Callback
                            for (var i = 0; i < nNodes; i++) {
                                var node = forceLayout.nodes[i];
                                positionArr[i * 2 + 1] = node.position[0];
                                positionArr[i * 2 + 2] = node.position[1];
                            }

                            positionArr[0] = forceLayout._token;
                        }

                        self.postMessage(positionArr.buffer, [positionArr.buffer]);
                    } else {
                        // Not initialzied yet
                        var emptyArr = new Float32Array();
                        // Post transfer object
                        self.postMessage(emptyArr.buffer, [emptyArr.buffer]);
                    }
                    break;
            }
        };
    }
    /* jshint ignore:end */

    return ForceLayout;
});