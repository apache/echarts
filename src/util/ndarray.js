/**
 * Numpy like n-dimensional array proccessing class
 * http://docs.scipy.org/doc/numpy/reference/arrays.ndarray.html
 * 
 * @author pissang (https://github.com/pissang/)
 */
define(function(require) {

'use strict';

if (typeof(require) !== 'undefined') {
    var kwargs = require('./kwargs');
}

var ArraySlice = Array.prototype.slice;

// Polyfill of Typed Array
var Int32Array = Int32Array || Array;
var Int16Array = Int16Array || Array;
var Int8Array = Int8Array || Array;
var Uint32Array = Uint32Array || Array;
var Uint16Array = Uint16Array || Array;
var Uint8Array = Uint8Array || Array;
var Float32Array = Float32Array || Array;
var Float64Array = Float64Array || Array;

// Map of numpy dtype and typed array
// http://docs.scipy.org/doc/numpy/reference/arrays.dtypes.html#arrays-dtypes
// http://www.khronos.org/registry/typedarray/specs/latest/
var ArrayConstructor = {
    'int32' : Int32Array,
    'int16' : Int16Array,
    'int8' : Int8Array,
    'uint32' : Uint32Array,
    'uint16' : Uint16Array,
    'uint8' : Uint8Array,
    // 'uint8c' is not existed in numpy
    'uint8c' : Uint8ClampedArray,
    'float32' : Float32Array,
    'float64' : Float64Array,
    'number' : Array
}

var dTypeStrideMap = {
    'int32' : 4,
    'int16' : 2,
    'int8' : 1,
    'uint32' : 4,
    'uint16' : 2,
    'uint8' : 1,
    'uint8c' : 1,
    'float32' : 4,
    'float64' : 8,
    // Consider array stride is 1
    'number' : 1
}

function guessDataType(arr) {
    if (typeof(arr) === 'undefined') {
        return 'number';
    }
    switch(toString.call(arr)) {
        case '[object Int32Array]':
            return 'int32';
        case '[object Int16Array]':
            return 'int16';
        case '[object Int8Array]':
            return 'int8';
        case '[object Uint32Array]':
            return 'uint32';
        case '[object Uint16Array]':
            return 'uint16';
        case '[object Uint8Array]':
            return 'uint8';
        case '[object Uint8ClampedArray]':
            return 'uint8c';
        case '[object Float32Array]':
            return 'float32';
        case '[object Float64Array]':
            return 'float64';
        default:
            return 'number';
    }
}

var NDArray = function(array) {
    // Last argument describe the data type of ndarray
    // 'int32', 'int16', 'int8', 'uint32', 'uint16', 'uint8', 'float32', 'float64'
    var dtype = arguments[arguments.length-1]
    if (typeof(dtype) == 'string') {
        this._dtype = dtype;
    } else {
        // Normal array
        this._dtype = guessDataType(array);
    }

    if (array && typeof(array) !== 'string') {
        if (array.length) {
            // Init from array
            this.initFromArray(array);
        } else if(typeof(array) === 'number') {
            // Init from shape
            this.initFromShape.apply(this, arguments);
        }
    } else {
        // Initialized with an empty array
        // Data is continuous one-dimensional array, row-major
        // TODO : Consider column majors ?
        // A [2, 2] dim empty array is stored like
        // [0,0,  0,0]
        this._array = new ArrayConstructor[this._dtype]();
        // shape, a tuple array describe the dimension and size of each dimension
        // [10, 10] means a 10x10 array
        this._shape = [0];
    }
}

NDArray.prototype = {
    initFromArray : function(input) {
        var dim = getDimension(input);
        var cursor = 0;
        function flatten(axis, _out, _in) {
            var len = _in.length;
            for (var i = 0; i < len; i++) {
                if (axis < dim-1) {
                    flatten(axis+1, _out, _in[i]);
                } else {
                    _out[cursor++] = _in[i];
                }
            }
        }
        var shape = getShape(input);
        var size = getSize(shape);
        this._array = new ArrayConstructor[this._dtype](size);

        flatten(0, this._array, input);
        this._shape = getShape(input);

        return this;
    },
    initFromShape : function(shape) {
        if (typeof(shape) == 'number') {
            shape = Array.prototype.slice.call(arguments);
        }
        if(shape) {
            var size = getSize(shape);
            if (this._dtype === 'number') {
                this._array = [];
                var data = this._array;
                for (var i = 0; i < size; i++) {
                    data[i] = 0;
                }   
            } else {
                this._array = new ArrayConstructor[this._dtype](size);
            }
        }
        this._shape = shape;

        return this;
    },
    fill : function(val) {
        var data = this._array;
        for (var i = 0; i < data.length; i++) {
            data[i] = val;
        }
        return this;
    },

    shape : function() {
        // Create a copy
        return this._shape.slice();
    },

    dtype : function() {
        return this._dtype;
    },

    dimension : function() {
        return this._shape.length;
    },

    strides : function() {
        var strides = calculateDimStrides(this._shape);
        var dTypeStride = dTypeStrideMap[this._dtype];
        for (var i = 0; i < strides.length; i++) {
            strides[i] *= dTypeStride;
        }
        return strides;
    },

    reshape : function(shape) {
        if (typeof(shape) == 'number') {
            shape = Array.prototype.slice.call(arguments);
        }
        if (this.isShapeValid(shape)) {
            this._shape = shape;
        } else {
            throw new Error('Shape ' + shape.toString() + ' is not valid');
        }
        return this;
    },

    isShapeValid : function(shape) {
        return getSize(shape) === this._array.length;
    },
    /**
     * Not like reshape, resize will change the size of stored data
     */
    resize : function(shape) {
        if (typeof(shape) == 'number') {
            shape = Array.prototype.slice.call(arguments);
        }

        var len = getSize(shape);
        if (len < this._array.length) {
            this._array.length = len;
        } else {
            for (var i = this._array.length; i < len; i++) {
                // Fill the rest with zero
                this._array[i] = 0;
            }
        }
        this._shape = shape;

        return this;

    },

    transpose : function(axes, out) {
        var originAxes = [];
        for (var i = 0; i < this._shape.length; i++) {
            originAxes.push(i);
        }
        if (typeof(axes) === 'undefined') {
            axes = originAxes.slice();
        }
        // Check if any axis is out of bounds
        for (var i = 0; i < axes.length; i++) {
            if (axes[i] >= this._shape.length) {
                throw new Error('Axis ' + axes[i] + ' out of bounds');
            }
        }
        // Has no effect on 1-D transpose
        if (axes.length <= 1) {
            return this;
        }

        var targetAxes = originAxes.slice();
        for (var i = 0; i < Math.floor(axes.length / 2); i++) {
            for (var j = axes.length-1; j >= Math.ceil(axes.length / 2) ; j--) {
                // Swap axes
                targetAxes[axes[i]] = axes[j];
                targetAxes[axes[j]] = axes[i];
            }
        }

        return this._transposelike(targetAxes, out);

    }.kwargs(),

    swapaxes : function(axis1, axis2, out) {
        return this.transpose(axis1, axis2, out);
    }.kwargs(),

    rollaxis : function(axis, start, out) {
        if (axis >= this._shape.length) {
            throw new Error('Axis ' + axis + ' out of bounds');
        }

        var axes = [];
        for (var i = 0; i < this._shape.length; i++) {
            axes.push(i);
        }
        axes.splice(axis, 1);
        axes.splice(start, 0, axis);

        return this._transposelike(axes, out);

    }.kwargs({ start : 0}),

    // Base function for transpose-like operations
    // Can swap any axes
    _transposelike : function(axes, out) {
        var source = this._array;
        var shape = this._shape.slice();
        var strides = calculateDimStrides(this._shape);
        var dim = shape.length;

        // Swap
        var tmpStrides = [];
        var tmpShape = [];
        for (var i = 0; i < axes.length; i++) {
            var axis = axes[i];
            // swap to target axis
            tmpShape[i] = shape[axis];
            tmpStrides[i] = strides[axis];
        }
        strides = tmpStrides;
        shape = tmpShape;

        this._shape = shape;
        var transposedStrides = calculateDimStrides(this._shape);

        if (!out) {
            out = new NDArray();
        }
        var transposedData = new ArrayConstructor[this._dtype](source.length);

        out._shape = this._shape.slice();
        out._array = transposedData;
        out._dtype = this._dtype;
        // @param Item offset in current axis offset of the original array
        // @param Item offset in current axis offset of the transposed array
        function transpose(axis, offset, transposedOffset) {
            var size = shape[axis];
            // strides in orginal array
            var stride = strides[axis];
            // strides in transposed array 
            var transposedStride = transposedStrides[axis];

            if (axis < dim-1) {
                for (var i = 0; i < size; i++) {
                    transpose(axis+1, offset + stride * i, transposedOffset + transposedStride * i);
                }
            } else {
                for (var i = 0; i < size; i++) {
                    // offset + stride * i is the index of the original array
                    // transposedOffset + i is the index of the transposed array
                    transposedData[transposedOffset + i] = source[offset + stride * i]
                }
            }
        }

        transpose(0, 0, 0);
        // Copy back;
        for (var i = 0; i < source.length; i++) {
            source[i] = transposedData[i];
        }
        return out;
    },

    /**
     * Repeat elements of an array.
     * @param {int} repeats The number of repetitions for each element. repeats is broadcasted to fit the shape of the given axis.
     * @param {int} axis(optional) The axis along which to repeat values. By default, use the flattened input array, and return a flat output array. 
     */
    repeat : function(repeats, axis, out) {
        if (typeof axis === 'undefined') {
            //Use the flattened input array
            var size = this._array.length * repeats;
            if (!out) {
                out = new NDArray(this._dtype);
                out.initFromShape([size]);
            } else {
                if (!arrayEqual([size], out._shape)) {
                    throw new Error(broadcastErrorMsg(shape, out._shape));
                }
            }
            var data = out._array;
            var source = this._array;
            for (var i = 0; i < this._array.length; i++) {
                for (j = 0; j < repeats; j++) {
                    data[i * repeats + j] = source[i];
                }
            }

            return out;
        } else {
            var shape = this._shape.slice();
            shape[axis] *= repeats;
            if (!out) {
                out = new NDArray(this._dtype);
                out.initFromShape(shape);
            } else {
                if (!arrayEqual(shape, out._shape)) {
                    throw new Error(broadcastErrorMsg(shape, out._shape));
                }
            }
            var data = out._array;

            var size = this._array.length * repeats;
            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var source = this._array;

            var offsetStride = stride * axisSize;
            var size = this._array.length;

            for (var offset = 0; offset < size; offset+=offsetStride) {
                for (var k = 0; k < stride; k++) {
                    var idx = offset + k;
                    var idxRepeated = offset * repeats + k;
                    for (var i = 0; i < axisSize; i++) {
                        for (var j = 0; j < repeats; j++) {
                            data[idxRepeated] = source[idx];
                            idxRepeated += stride;
                        }
                        idx += stride;
                    }
                }
            }

            return out;
        }
    }.kwargs(),

    tile : function() {
        console.warn("TODO");
    },

    // FIXME : V8 is quick sort, firefox and safari is merge sort
    // order : ascending or desc
    sort : function(axis, order) {
        if (axis < 0) {
            axis = this._shape.length + axis;
        }

        if (order === 'ascending') {
            var compareFunc = function(a, b) {
                return a - b;
            }
        } else if( order === 'descending') {
            var compareFunc = function(a, b) {
                return b - a;
            }
        }

        var source = this._array;
        var stride = calculateDimStride(this._shape, axis);
        var axisSize = this._shape[axis];

        var offsetStride = stride * axisSize;
        var offsetRepeats = this._array.length / offsetStride;

        var tmp = new Array(axisSize);

        for (var c = 0; c < offsetRepeats; c++) {
            var offset = c * offsetStride;

            for (var i = 0; i < stride; i++) {
                var idx = offset + i;
                for (var j = 0; j < axisSize; j++) {
                    tmp[j] = source[idx];
                    idx += stride;
                }
                tmp.sort(compareFunc);
                var idx = offset + i;
                // Copy back
                for (var j = 0; j < axisSize; j++) {
                    source[idx] = tmp[j];
                    idx += stride;
                }
            }
        }

        return this;

    }.kwargs({axis : -1, order : 'ascending'}),
    /**
     * @param {string} order, 'ascending' | 'descending'
     * @return {NDArray} a new array
     */
    argsort : function(axis, order, out) {
        if (axis < 0) {
            axis = this._shape.length + axis;
        }
        if (out && !arrayEqual(this._shape, out._shape)) {
            throw new Error(broadcastErrorMsg(this._shape, out._shape));
        }
        if (!out) {
            out = new NDArray(this._dtype);
            out.initFromShape(this._shape);   
        }
        var data = out._array;

        var source = this._array;
        var stride = calculateDimStride(this._shape, axis);
        var axisSize = this._shape[axis];

        var offsetStride = stride * axisSize;

        var tmp = new Array(axisSize);
        var indexList = new Array(axisSize);

        if (order === 'ascending') {
            var compareFunc = function(a, b) {
                return tmp[a] - tmp[b];
            }
        } else if( order === 'descending') {
            var compareFunc = function(a, b) {
                return tmp[b] - tmp[a];
            }
        }

        var size = this._array.length;

        for (var offset = 0; offset < size; offset+=offsetStride) {
            for (var i = 0; i < stride; i++) {
                var idx = offset + i;
                for (var j = 0; j < axisSize; j++) {
                    tmp[j] = source[idx];
                    indexList[j] = j;
                    idx += stride;
                }
                indexList.sort(compareFunc);
                // Copy back
                var idx = offset + i;
                for (var j = 0; j < axisSize; j++) {
                    data[idx] = indexList[j];
                    idx += stride;
                }
            }
        }

        return out;

    }.kwargs({axis : -1, order : 'ascending'}),

    choose : function() {
        console.warn('TODO')
    },

    /**
     * Get the max value of ndarray
     * If the axis is given, the max is only calculate in this dimension and result will
     * be one dimension less
     * Example, for the given ndarray
     * [[3, 9],
     *  [4, 8]]
     * >>> max(0)
     * [4, 9]
     * >>> max(1)
     * [9, 8]
     */
    max : function(axis, out) {
        var source = this._array;
        if (!source.length) {
            return;
        }

        if (typeof(axis)!=='undefined') {
            var shape = this._shape.slice();
            shape.splice(axis, 1);
            if (axis >= this._shape.length) {
                throw new Error('Axis ' + axis + ' out of bounds');
            }
            if (out && !arrayEqual(shape, out._shape)) {
                throw new Error(broadcastErrorMsg(shape, out._shape));
            }

            if (!out) {
                out = new NDArray(this._dtype);
                out.initFromShape(shape);
            }
            var data = out._array;
            var cursor = 0;

            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var offsetStride = stride * axisSize;
            var size = this._array.length;

            for (var offset = 0; offset < size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var idx =  i + offset;
                    var max = source[idx];
                    for (var j = 0; j < axisSize; j++) {
                        var d = source[idx];
                        if (d > max) {
                            max = d;
                        }
                        idx += stride;
                    }
                    data[cursor++] = max;
                }
            }

            return out;
        } else {
            var max = source[0];
            for (var i = 1; i < source.length; i++) {
                if (source[i] > max) {
                    max = source[i];
                }
            }
            return max;
        }
    }.kwargs(),

    min : function(axis, out) {
        var source = this._array;
        if (!source.length) {
            return;
        }

        if (typeof(axis)!=='undefined') {
            var shape = this._shape.slice();
            shape.splice(axis, 1);
            if (axis >= this._shape.length) {
                throw new Error('Axis ' + axis + ' out of bounds');
            }            
            if (out && !arrayEqual(shape, out._shape)) {
                throw new Error(broadcastErrorMsg(shape, out._shape));
            }

            if (!out) {
                out = new NDArray(this._dtype);
                out.initFromShape(shape);   
            }
            var data = out._array;
            var cursor = 0;

            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var offsetStride = stride * axisSize;
            var size = this._array.length;

            for (var offset = 0; offset < size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var idx =  i + offset;
                    var min = source[idx];
                    for (var j = 0; j < axisSize; j++) {
                        var d = source[idx]
                        if (d < min) {
                            min = d;
                        }
                        idx += stride;
                    }
                    data[cursor++] = min;
                }
            }

            return out;
        } else {
            var min = source[0];
            for (var i = 1; i < source.length; i++) {
                if (source[i] < min) {
                    min = source[i];
                }
            }
            return min;
        }
    }.kwargs(),

    argmax : function(axis, out) {
        var source = this._array;
        if (!source.length) {
            return;
        }

        if (typeof(axis)!=='undefined') {
            var shape = this._shape.slice();
            shape.splice(axis, 1);
            if (axis >= this._shape.length) {
                throw new Error('Axis ' + axis + ' out of bounds');
            }
            if (out && !arrayEqual(shape, out._shape)) {
                throw new Error(broadcastErrorMsg(shape, out._shape));
            }

            if (!out) {
                out = new NDArray(this._dtype);
                out.initFromShape(shape);   
            }
            var data = out._array;
            var cursor = 0;

            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var offsetStride = stride * axisSize;
            var size = this._array.length;

            for (var offset = 0; offset < size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var dataIdx = 0;
                    var idx =  i + offset;
                    var max = source[idx];
                    for (var j = 0; j < axisSize; j++) {
                        var d = source[idx]
                        if (d > max) {
                            max = d;
                            dataIdx = j;
                        }
                        idx += stride;
                    }
                    data[cursor++] = dataIdx;
                }
            }

            return out;
        } else {
            var max = source[0];
            var idx = 0;
            for (var i = 1; i < source.length; i++) {
                if (source[i] > max) {
                    idx = i;
                    max = source[i];
                }
            }
            return idx;
        }
    }.kwargs(),

    argmin : function(axis, out) {
        var source = this._array;
        if (!source.length) {
            return;
        }

        if (typeof(axis)!=='undefined') {
            var shape = this._shape.slice();
            shape.splice(axis, 1);
            if (axis >= this._shape.length) {
                throw new Error('Axis ' + axis + ' out of bounds');
            }
            if (out && !arrayEqual(shape, out._shape)) {
                throw new Error(broadcastErrorMsg(shape, out._shape));
            }

            if (!out) {
                out = new NDArray(this._dtype);
                out.initFromShape(shape);   
            }
            var data = out._array;
            var cursor = 0;

            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var offsetStride = stride * axisSize;
            var size = this._array.length;

            for (var offset = 0; offset < size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var dataIdx = 0;
                    var idx =  i + offset;
                    var min = source[idx];
                    for (var j = 0; j < axisSize; j++) {
                        var d = source[idx]
                        if (d < min) {
                            min = d;
                            dataIdx = j;
                        }
                        idx += stride;
                    }
                    data[cursor++] = dataIdx;
                }
            }

            return out;
        } else {
            var min = source[0];
            var idx = 0;
            for (var i = 1; i < source.length; i++) {
                if (source[i] < min) {
                    idx = i;
                    min = source[i];
                }
            }
            return idx;
        }
    }.kwargs(),

    sum : function(axis, out) {
        var source = this._array;
        if (!source.length) {
            return;
        }

        if (typeof(axis)!=='undefined') {
            var shape = this._shape.slice();
            shape.splice(axis, 1);
            if (axis >= this._shape.length) {
                throw new Error('Axis ' + axis + ' out of bounds');
            }
            if (out && !arrayEqual(shape, out._shape)) {
                throw new Error(broadcastErrorMsg(shape, out._shape));
            }

            if (!out) {
                out = new NDArray(this._dtype);
                out.initFromShape(shape);   
            }
            var data = out._array;
            var cursor = 0;

            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var offsetStride = stride * axisSize;
            var size = this._array.length;

            for (var offset = 0; offset < size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var sum = 0;
                    var idx =  i + offset;
                    for (var j = 0; j < axisSize; j++) {
                        var d = source[idx]
                        sum += d
                        idx += stride;
                    }
                    data[cursor++] = sum;
                }
            }

            return out;
        } else {
            var sum = 0;
            for (var i = 0; i < source.length; i++) {
                sum += source[i];
            }
            return sum;
        }
    }.kwargs(),

    ptp : function(axis, out) {
        var source = this._array;
        if (!source.length) {
            return;
        }

        if (typeof(axis)!=='undefined') {
            var shape = this._shape.slice();
            shape.splice(axis, 1);
            if (axis >= this._shape.length) {
                throw new Error('Axis ' + axis + ' out of bounds');
            }
            if (out && !arrayEqual(shape, out._shape)) {
                throw new Error(broadcastErrorMsg(shape, out._shape));
            }

            if (!out) {
                out = new NDArray(this._dtype);
                out.initFromShape(shape);   
            }
            var data = out._array;
            var cursor = 0;

            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var offsetStride = stride * axisSize;
            var size = this._array.length;

            for (var offset = 0; offset < size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var idx = offset + i;
                    var min = source[idx];
                    var max = source[idx];
                    for (var j = 0; j < axisSize; j++) {
                        var d = source[idx]
                        if (d < min) {
                            min = d;
                        }
                        if (d > max) {
                            max = d;
                        }
                        idx += stride;
                    }
                    data[cursor++] = max - min;
                }
            }

            return out;
        } else {
            var min = source[0];
            var max = source[0];
            for (var i = 1; i < source.length; i++) {
                if (source[i] < min) {
                    min = source[i];
                }
                if (source[i] > max) {
                    max = source[i];
                }
            }
            return max - min;
        }

    }.kwargs(),

    mean : function(axis, out) {
        var sum = this.sum(axis, out);
        if (sum instanceof NDArray) {
            sum.mul(1 / this._shape[axis], out);
            return sum;
        } else {
            return sum / this._array.length;
        }
    }.kwargs(),

    cumsum : function(axis, out) {
        var source = this._array;
        if (!source.length) {
            return;
        }
        if (out && !arrayEqual(this._shape, out._shape)) {
            throw new Error(broadcastErrorMsg(this._shape, out._shape));
        }
        if (!out) {
            out = new NDArray(this._dtype);
            out.initFromShape(this._shape);
        }
        var data = out._array;

        if (typeof(axis)!=='undefined') {
            if (axis >= this._shape.length) {
                throw new Error('Axis ' + axis + ' out of bounds');
            }

            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var offsetStride = stride * axisSize;
            var size = this._array.length;

            for (var offset = 0; offset < size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var idx = offset + i;
                    var prevIdx = idx;
                    data[idx] = source[idx];
                    for (var j = 1; j < axisSize; j++) {
                        prevIdx = idx;
                        idx += stride;
                        data[idx] = data[prevIdx] + source[idx];
                    }

                }
            }

            return out;
        } else {
            data[0] = source[0];
            for (var i = 1; i < source.length; i++) {
                data[i] = data[i-1] + source[i];
            }
            out._shape = [source.length];

            return out;
        }
    }.kwargs(),

    cumprod : function(axis, out) {
        var source = this._array;
        if (!source.length) {
            return;
        }
        if (out && !arrayEqual(this._shape, out._shape)) {
            throw new Error(broadcastErrorMsg(this._shape, out._shape));
        }
        if (!out) {
            out = new NDArray(this._dtype);
            out.initFromShape(this._shape);
        }
        var data = out._array;

        if (typeof(axis)!=='undefined') {
            if (axis >= this._shape.length) {
                throw new Error('Axis ' + axis + ' out of bounds');
            }

            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var offsetStride = stride * axisSize;
            var size = this._array.length;

            for (var offset = 0; offset < size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var idx = offset + i;
                    var prevIdx = idx;
                    data[idx] = source[idx];
                    for (var j = 1; j < axisSize; j++) {
                        prevIdx = idx;
                        idx += stride;
                        data[idx] = data[prevIdx] * source[idx];
                    }
                }
            }

            return out;
        } else {
            data[0] = source[0];
            for (var i = 1; i < source.length; i++) {
                data[i] = data[i-1] * source[i];
            }
            out._shape = [source.length];

            return out;
        }
    }.kwargs(),

    /**
     * Input data will be mapped to region [min, max]
     * @param {Number} mappedMin
     * @param {Number} mappedMax
     */
    map : function(mappedMin, mappedMax) {
        var input = this._array;
        var output = this._array;

        var min = input[0];
        var max = input[0];
        var l = input.length;
        for (var i = 1; i < l; i++) {
            var val = input[i];
            if (val < min) {
                min = val;
            }
            if (val > max) {
                max = val;
            }
        }
        var range = max - min;
        var mappedRange = mappedMax - mappedMin;
        for (var i = 0; i < l; i++) {
            if (range === 0) {
                output[i] = mappedMin;
            } else {
                var val = input[i];
                var percent = (val - min) / range;
                output[i] = mappedRange * percent + mappedMin;
            }
        }

        return this;
    },

    /**
     * Add
     */
    add : function(rightOperand, out) {
        return this._binaryOperation(
            this, rightOperand, 0, out 
        );
    },

    /**
     * Substract
     */
    sub : function(rightOperand, out) {
        return this._binaryOperation(
            this, rightOperand, 1, out
        );
    },

    /**
     * Multiply
     */
    mul : function(rightOperand, out) {
        return this._binaryOperation(
            this, rightOperand, 2, out
        );
    },

    /**
     * Divide
     */
    div : function(rightOperand, out) {
        return this._binaryOperation(
            this, rightOperand, 3, out
        );
    },
    /**
     * mod
     */
    mod : function(rightOperand, out) {
        return this._binaryOperation(
            this, rightOperand, 4, out
        );
    },
    /**
     * and
     */
    and : function(rightOperand, out) {
        return this._binaryOperation(
            this, rightOperand, 5, out
        );
    },
    /**
     * or
     */
    or : function(rightOperand, out) {
        return this._binaryOperation(
            this, rightOperand, 6, out
        );
    },
    /**
     * xor
     */
    xor : function(rightOperand, out) {
        return this._binaryOperation(
            this, rightOperand, 7, out
        );
    },

    _binaryOperation : function(lo, ro, op, out) {
        // Broadcasting
        // http://docs.scipy.org/doc/numpy/user/basics.broadcasting.html
        var shape = [];
        var isLoScalar = typeof(lo) === 'number';
        var isRoScalar = typeof(ro) === 'number';
        if (isLoScalar) {
            shape = ro._shape.slice();
        } else if (isRoScalar) {
            shape = lo._shape.slice();
        } else {
            // Starts with the trailing dimensions
            var cl = lo._shape.length-1;
            var cr = ro._shape.length-1;
            var loBroadCasted = lo;
            var roBroadCasted = ro;
            while (cl >= 0 && cr >= 0) {
                if (lo._shape[cl] == 1) {
                    shape.unshift(ro._shape[cr]);
                    // FIXME Extra cost
                    loBroadCasted = lo.repeat(ro._shape[cr], cl);
                } else if(ro._shape[cr] == 1) {
                    shape.unshift(lo._shape[cl]);
                    // FIXME Extra cost
                    roBroadCasted = ro.repeat(lo._shape[cl], cr);
                } else if(ro._shape[cr] == lo._shape[cl]) {
                    shape.unshift(lo._shape[cl]);
                } else {
                    throw new Error(broadcastErrorMsg(lo._shape, ro._shape));
                }
                cl --;
                cr --;
            }
            for (var i = cl; i >= 0; i--) {
                shape.unshift(lo._shape[i]);
            }
            for (var i = cr; i >= 0; i--) {
                shape.unshift(ro._shape[i]);
            }
            lo = loBroadCasted;
            ro = roBroadCasted;
        }
        if (!out) {
            out = new NDArray(this._dtype);
            out.initFromShape(shape);
        } else {
            if (! arrayEqual(shape, out._shape)) {
                throw new Error(broadcastErrorMsg(shape, out._shape))
            }
        }
        var outData = out._array;
        
        if (isLoScalar) {
            var diffAxis = ro._shape.length-1;
            var isLoLarger = false;
        } else if(isRoScalar) {
            var diffAxis = lo._shape.length-1;
            var isLoLarger = true;
        } else {
            var diffAxis = Math.abs(lo._shape.length - ro._shape.length);
            var isLoLarger = lo._shape.length >= ro._shape.length;
        }
        var stride = calculateDimStride(shape, diffAxis);
        var axisSize = shape[diffAxis];

        var offsetStride = stride * axisSize;

        var loData = isLoScalar ? lo : lo._array;
        var roData = isRoScalar ? ro : ro._array;
        var _a, _b, result;

        for (var offset = 0; offset < outData.length; offset+=offsetStride) {
            var idx = offset;
            for (var i = 0; i < offsetStride; i++) {
                if (isLoLarger) {
                    _a = isLoScalar ? loData : loData[idx];
                    _b = isRoScalar ? roData : roData[i];
                } else {
                    _a = isLoScalar ? loData : loData[i];
                    _b = isRoScalar ? roData : roData[idx];
                }
                switch (op) {
                    case 0:
                        result = _a + _b;
                        break;
                    case 1:
                        result = _a - _b;
                        break;
                    case 2:
                        result = _a * _b;
                        break;
                    case 3:
                        result = _a / _b;
                        break;
                    case 4:
                        result = _a % _b;
                        break;
                    case 5:
                        result = _a & _b;
                        break;
                    case 6:
                        result = _a | _b;
                        break;
                    case 7:
                        result = _a ^ _b;
                        break;
                    default:
                        throw new Error("Unkown operation " + op);
                }
                outData[idx] = result;

                idx ++;
            }
        }

        return out;
    },

    /**
     * negtive
     */
    neg : function() {
        var data = this._array;
        for (var i = 0; i < data.length; i++) {
            data[i] = -data[i];
        }
        return this;
    },

    sin : function() {
        return this._mathAdapter(Math.sin);
    },

    cos : function() {
        return this._mathAdapter(Math.cos);
    },

    tan : function() {
        return this._mathAdapter(Math.tan);
    },

    abs : function() {
        return this._mathAdapter(Math.abs);
    },

    log : function() {
        return this._mathAdapter(Math.log);
    },

    pow : function(exp) {
        var data = this._array;
        for (var i = 0; i < data.length; i++) {
            data[i] = Math.pow(data[i], exp);
        }
        return this;
    },

    _mathAdapter : function(mathFunc) {
        var data = this._array;
        for (var i = 0; i < data.length; i++) {
            data[i] = mathFunc(data[i]);
        }
        return this;
    },

    round : function(decimals) {
        decimals = Math.floor(decimals || 0);
        var offset = Math.pow(10, decimals);
        var data = this._array;
        if (decimals == 0) {
            for (var i = 0; i < data.length; i++) {
                data[i] = Math.round(data[i]);
            }
        } else {
            for (var i = 0; i < data.length; i++) {
                data[i] = Math.round(data[i] * offset) / offset;
            }
        }
        return this;
    },
    /**
     * Clip to [min, max]
     */
    clip : function(min, max) {
        var data = this._array;
        for (var i = 0; i < data.length; i++) {
            data[i] = Math.max(Math.min(data[i], max), min);
        }
        return this;
    },

    /**
     * Indexing array, support range indexing
     * @param {string} index
     * Index syntax can be an integer 1, 2, 3
     * Or more complex range indexing
     *  '1:2'
     *  '1:2, 1:2'
     *  '1:2, :'
     * More about the indexing syntax can check the doc of numpy ndarray
     */
    get : function(index, out) {
        if (typeof(index) == 'number') {
            index = index.toString();
        }
        var strides = calculateDimStrides(this._shape);
        var res = this._parseRanges(index);
        var ranges = res[0];
        var shape = res[1];

        if (ranges.length > this._shape.length) {
            throw new Error('Too many indices');
        }
        // Get data
        var len = ranges.length;
        if (shape.length) {
            if (!out) {
                out = new NDArray(this._dtype);
                out.initFromShape(shape);   
            }
            var data = out._array;
        } else {
            var data = [];
        }

        var source = this._array;
        var cursor = 0;
        function getPiece(axis, offset) {
            var range = ranges[axis];
            var stride = strides[axis];
            if (axis < len-1) {
                if (range[2] > 0) {
                    for (var i = range[0]; i < range[1]; i += range[2]) {
                        getPiece(axis+1,  offset + stride * i);
                    }
                } else {
                    for (var i = range[0]; i > range[1]; i += range[2]) {
                        getPiece(axis+1,  offset + stride * i);
                    }
                }
            } else {
                if (range[2] > 0) {
                    for (var i = range[0]; i < range[1]; i += range[2]) {
                        for (var j = 0; j < stride; j++) {
                            data[cursor++] = source[i*stride + j + offset];
                        }
                    }
                } else {
                    for (var i = range[0]; i > range[1]; i += range[2]) {
                        for (var j = 0; j < stride; j++) {
                            data[cursor++] = source[i*stride + j + offset];
                        }
                    }
                }
            }
        }

        getPiece(0, 0);

        if (shape.length) {
            // Return scalar
            return out;
        } else {
            return data[0];
        }
            
    }.kwargs(),

    /**
     * @param {string} index
     * index syntax can be an integer 1, 2, 3
     * Or more complex range indexing
     *  '1:2'
     *  '1:2, 1:2'
     *  '1:2, :'
     * More about the indexing syntax can check the doc of numpy ndarray
     * @param {ndarray} ndarray Ndarray data source
     */
    set : function(index, narray) {
        if (typeof(index) == 'number') {
            index = index.toString();
        }
        var strides = calculateDimStrides(this._shape);
        var res = this._parseRanges(index);
        var ranges = res[0];
        var shape = res[1];

        if (ranges.length > this._shape.length) {
            throw new Error('Too many indices');
        }
        var isScalar = typeof(narray) == 'number';
        var len = ranges.length;
        var data = this._array;
        if (isScalar) {
            // Set with a single scalar
            var source = narray;
        } else {
            if (!arrayEqual(shape, narray.shape())) {
                throw new Error(broadcastErrorMsg(shape, narray.shape()));
            }
            var source = narray._array;
        }
        var cursor = 0;
        var setPiece = function(axis, offset) {
            var range = ranges[axis];
            var stride = strides[axis];
            if (axis < len-1) {
                if (range[2] > 0) {
                    for (var i = range[0]; i < range[1]; i += range[2]) {
                        setPiece(axis+1,  offset + stride * i);
                    }
                } else {
                    for (var i = range[0]; i > range[1]; i += range[2]) {
                        setPiece(axis+1,  offset + stride * i);
                    }
                }
            } else {
                if (range[2] > 0) {
                    for (var i = range[0]; i < range[1]; i += range[2]) {
                        for (var j = 0; j < stride; j++) {
                            if (isScalar) {
                                data[i*stride + j + offset] = source;
                            } else {
                                data[i*stride + j + offset] = source[cursor++];
                            }
                        }
                    }
                } else {
                    for (var i = range[0]; i > range[1]; i += range[2]) {
                        for (var j = 0; j < stride; j++) {
                            if (isScalar) {
                                data[i*stride + j + offset] = source;
                            } else {
                                data[i*stride + j + offset] = source[cursor++];
                            }
                        }
                    }
                }
            }
        }

        setPiece(0, 0);

        return this;
    },

    _parseRanges : function(index) {
        var rangesStr = index.split(/\s*,\s*/);
        var axis = 0;
        
        // Parse range of each axis
        var ranges = [];
        for (var i = 0; i < rangesStr.length; i++) {
            ranges[i] = parseRange(rangesStr[i], this._shape[i]);
        }

        // Calculate shape size
        var shape = [];
        for (var i = 0; i < ranges.length; i++) {
            if(rangesStr[i].indexOf(':') >= 0) {
                var size = Math.floor((ranges[i][1] - ranges[i][0]) / ranges[i][2]);
                size = size < 0 ? 0 : size;
                // Get a range not a item
                shape.push(size);
            }
        }
        // Copy the lower dimension size
        for (; i < this._shape.length; i++) {
            shape.push(this._shape[i]);
        }

        return [ranges, shape];
    },

    toArray : function() {
        var data = this._array;
        var cursor = 0;

        var shape = this._shape;
        var dim = shape.length;

        function create(axis, out) {
            var len = shape[axis];
            for (var i = 0; i < len; i++) {
                if (axis < dim-1) {
                    create(axis+1, out[i] = []);
                } else {
                    out[i] = data[cursor++];
                }
            }
        }

        var output = []
        create(0, output);

        return output;
    },

    copy : function() {
        var numArr = new NDArray();
        numArr._array = ArraySlice.call(this._array);
        numArr._shape = this._shape.slice();
        numArr._dtype = this._dtype;

        return numArr;
    },

    constructor : NDArray
}

NDArray.range = function(min, max, step, dtype) {
    var args = ArraySlice.call(arguments);
    // Last argument describe the data type of ndarray
    var lastArg = args[args.length-1];
    if (typeof(lastArg) == 'string') {
        var dtype = lastArg;
        args.pop();
    }
    if (args.length === 1) {
        max = args[0];
        step = 1;
        min = 0;
    } else if(args.length == 2) {
        step = 1;
    }
    if (!dtype) {
        // Guess default data type
        if (Math.floor(step) !== step ||
            Math.floor(min) !== min ||
            Math.floor(max) !== max) {
            dtype = 'float32';
        } else {
            dtype = 'int32';
        }
    }

    var array = new ArrayConstructor[dtype](Math.ceil((max - min)/step));
    var cursor = 0;
    for (var i = min; i < max; i+=step) {
        array[cursor++] = i;
    }
    var ndarray = new NDArray();
    ndarray._array = array;
    ndarray._shape = [array.length];
    ndarray._dtype = dtype;

    return ndarray;

}.kwargs();

/**
 * Python like array indexing
 * http://www.python.org/dev/peps/pep-0204/
 * 
 * @param {string} index
 * index can be a simple integer 1,2,3,
 * or a range 2:10, 2:10:1
 * example :
 *      2:10 => [2, 10, 1],
 *      10:2:-2=>[10, 2, -2],
 *      :=>[0, dimSize, 1],
 *      ::-1=>[dimSize-1, -1, -1],
 * @return a tuple array [startOffset, endOffset, sliceStep]
 */
function parseRange(index, dimSize) {
    if (index.indexOf(':') >= 0) {
        // Range indexing;
        var res = index.split(/\s*:\s*/);

        var step = parseInt(res[2] || 1);
        if (step === 0) {
            throw new Error("Slice step cannot be zero");
        }
        else if (step > 0) {
            var start = parseInt(res[0] || 0);
            var end = parseInt(res[1] || dimSize);
        }
        else {
            var start = parseInt(res[0] || dimSize - 1);
            var end = parseInt(res[1] || -1);
        }
        // Negtive offset
        if (start < 0) {
            start = dimSize + start;
        }
        // Negtive offset
        if (end < 0 && res[1]) {
            end = dimSize + end;
        }
        if (step > 0) {
            // Clamp to [0-dimSize]
            start = Math.max(Math.min(dimSize, start), 0);
            // Clamp to [0-dimSize]
            end = Math.max(Math.min(dimSize, end), 0);
        } else {
            // Clamp to [0-dimSize)
            start = Math.max(Math.min(dimSize-1, start), -1);
            // Clamp to [0-dimSize)
            end = Math.max(Math.min(dimSize-1, end), -1);
        }
        return [start, end, step];
    } else {
        var start = parseInt(index);
        // Negtive offset
        if (start < 0) {
            start = dimSize + start;
        }
        if (start < 0 || start > dimSize) {
            throw new Error('Index ' + index + ' out of bounds');
        }
        // Clamp to [0-dimSize)
        start = Math.max(Math.min(dimSize-1, start), 0);
        return [start, start+1, 1];
    }
}

function getSize(shape) {
    var size = shape[0];
    for (var i = 1; i < shape.length; i++) {
        size *= shape[i];
    }
    return size;
}

function getDimension(array) {
    var dim = 1;
    var el = array[0];
    while (el instanceof Array) {
        el = el[0];
        dim ++;
    }
    return dim
}

function getShape(array) {
    var shape = [array.length];
    var el = array[0];
    while (el instanceof Array) {
        shape.push(el.length);
        el = el[0];
    }
    return shape;
}

function calculateDimStride(shape, axis) {
    if (axis == shape.length-1) {
        return 1;
    }
    var stride = shape[axis+1];
    for (var i = axis+2; i < shape.length; i++) {
        stride *= shape[i];
    }
    return stride;
}

function calculateDimStrides(shape) {
    // Calculate stride of each axis
    var strides = [];
    var tmp = 1;
    var len = getSize(shape);
    for (var i = 0; i < shape.length; i++) {
        tmp *= shape[i];
        strides.push(len / tmp);
    }

    return strides;
}

function arrayEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (var i = 0; i <arr1.length; i++) {
        if (arr1[i] !==  arr2[i]) {
            return false;
        }
    }
    return true;
}

function any(arr, item) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === item) {
            return true;
        }
    }
    return false;
}

function broadcastErrorMsg(shape1, shape2) {
    return 'Shape (' 
            + shape1.toString() + ') (' + shape2.toString()
            +') could not be broadcast together';
}

return NDArray;
});