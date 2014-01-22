/**
 * Numpy like n-dimensional array proccessing class
 * http://docs.scipy.org/doc/numpy/reference/arrays.ndarray.html
 * 
 * @author pissang (https://github.com/pissang/)
 */
define(function(require) {

'use strict';

var kwargs = require('./kwargs');

var ArraySlice = Array.prototype.slice;

// Polyfill of Typed Array
this.Int32Array = window.Int32Array || Array;
this.Int16Array = window.Int16Array || Array;
this.Int8Array = window.Int8Array || Array;
this.Uint32Array = window.Uint32Array || Array;
this.Uint16Array = window.Uint16Array || Array;
this.Uint8Array = window.Uint8Array || Array;
this.Float32Array = window.Float32Array || Array;
this.Float64Array = window.Float64Array || Array;

// Map of numpy dtype and typed array
// http://docs.scipy.org/doc/numpy/reference/arrays.dtypes.html#arrays-dtypes
// http://www.khronos.org/registry/typedarray/specs/latest/
var ArrayConstructor = {
    'int32' : this.Int32Array,
    'int16' : this.Int16Array,
    'int8' : this.Int8Array,
    'uint32' : this.Uint32Array,
    'uint16' : this.Uint16Array,
    'uint8' : this.Uint8Array,
    // 'uint8c' is not existed in numpy
    'uint8c' : this.Uint8ClampedArray,
    'float32' : this.Float32Array,
    'float64' : this.Float64Array,
    'number' : Array
};

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
};

var E_ADD = 0;
var E_SUB = 1;
var E_MUL = 2;
var E_DIV = 3;
var E_MOD = 4;
var E_AND = 5;
var E_OR = 6;
var E_XOR = 7;
var E_EQL = 8;

function guessDataType(arr) {
    if (typeof(arr) === 'undefined') {
        return 'number';
    }
    switch(Object.prototype.toString.call(arr)) {
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

/**
 * NDArray
 * @param {Array|NDArray}  array
 * @param {String} dtype
 */
var NDArray = function(array) {
    // Last argument describe the data type of ndarray
    var dtype = arguments[arguments.length-1];
    if (typeof(dtype) == 'string') {
        this._dtype = dtype;
    } else {
        // Normal array
        this._dtype = guessDataType(array);
    }

    if (array && typeof(array) !== 'string') {
        if (array instanceof NDArray) {
            array._dtype = this._dtype;
            return array;
        } else if (typeof(array.length) !== 'undefined') {
            // Init from array
            this.initFromArray(array);
        } else if(typeof(array) === 'number') {
            // Init from shape
            this.initFromShape.apply(this, arguments);
        }
    } else {
        /**
         * _array
         * Initialized with an empty array
         * Data is continuous one-dimensional array, row-major
         * A [2, 2] dim empty array is stored like
         * [0,0,  0,0]
         * TODO : Consider column majors ?
         * @type {ArrayConstructor}
         */
        this._array = new ArrayConstructor[this._dtype]();
        /**
         * _shape
         * a tuple array describe the dimension and size of each dimension
         * [10, 10] means a 10x10 array
         * @type {Array}
         */
        this._shape = [0];
        /**
         * _size
         * size of the storage array length
         * @type {Number}
         */
        this._size = 0;
    }
};

NDArray.prototype = {
    /**
     * Initialize from a normal js array.
     * 
     * @param  {Array} input
     * @return {NDArray} this
     */
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
        this._shape = shape;
        this._size = size;

        return this;
    },

    /**
     * Initialize from the given shape description.
     * @param  {Array} shape 
     * @return {NDArray} this
     */
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
        this._size = getSize(shape);

        return this;
    },
    /**
     * Fill the array with the given value.
     * @param  {Number} value
     * @return {NDArray} this
     */
    fill : function(value) {
        var data = this._array;
        for (var i = 0; i < data.length; i++) {
            data[i] = value;
        }
        return this;
    },

    /**
     * Get ndarray shape copy.
     * @return {Array}
     */
    shape : function() {
        // Create a copy
        return this._shape.slice();
    },

    /**
     * Get array size
     * @return {Number}
     */
    size : function() {
        return this._size;
    },

    /**
     * Get array data type.
     * 'int32'
     * 'int16'
     * 'int8'
     * 'uint32'
     * 'uint16'
     * 'uint8'
     * 'float32'
     * 'float64'
     * @return {String}
     */
    dtype : function() {
        return this._dtype;
    },

    /**
     * Get array dimension.
     * @return {[type]} [description]
     */
    dimension : function() {
        return this._shape.length;
    },

    /**
     * Tuple of bytes to step in each dimension when traversing an array.
     * @return {Array}
     */
    strides : function() {
        var strides = calculateDimStrides(this._shape);
        var dTypeStride = dTypeStrideMap[this._dtype];
        for (var i = 0; i < strides.length; i++) {
            strides[i] *= dTypeStride;
        }
        return strides;
    },
    /**
     * Gives a new shape to an array without changing its data.
     * @param  {Array} shape
     * @return {NDArray}
     */
    reshape : function(shape) {
        if (typeof(shape) == 'number') {
            shape = Array.prototype.slice.call(arguments);
        }
        if (this._isShapeValid(shape)) {
            this._shape = shape;
        } else {
            throw new Error('Total size of new array must be unchanged');
        }
        return this;
    },

    _isShapeValid : function(shape) {
        return getSize(shape) === this._size;
    },

    /**
     * Change shape and size of array in-place.
     * @param  {Array} shape
     * @return {NDArray}
     */
    resize : function(shape) {
        if (typeof(shape) == 'number') {
            shape = Array.prototype.slice.call(arguments);
        }

        var len = getSize(shape);
        if (len < this._size) {
            if (this._dtype === 'number') {
                this._array.length = len;
            }
        } else {
            if (this._dtype === 'number') {
                for (var i = this._array.length; i < len; i++) {
                    // Fill the rest with zero
                    this._array[i] = 0;
                }
            } else {
                // Reallocate new buffer
                var newArr = new ArrayConstructor[this._dtype](len);
                var originArr = this._array;

                // Copy data
                for (var i = 0; i < originArr.length; i++) {
                    newArr[i] = originArr[i];
                }
                this._array = newArr;
            }
        }
        this._shape = shape;
        this._size = len;

        return this;

    },

    /**
     * Returns a new array with axes transposed.    
     * @param  {Array} [axes]
     * @param  {NDArray} [out]
     * @return {NDArray}
     */
    transpose : kwargs(function(axes, out) {
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
                throw new Error(axisOutofBoundsErrorMsg(axes[i]));
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

    }),

    /**
     * Return a new array with axis1 and axis2 interchanged.
     * @param  {Number} axis1
     * @param  {Number} axis2
     * @param  {NDArray} out
     * @return {NDArray}
     */
    swapaxes : kwargs(function(axis1, axis2, out) {
        return this.transpose([axis1, axis2], out);
    }),

    /**
     * Roll the specified axis backwards, until it lies in a given position.
     * @param  {Number} axis
     * @param  {Number} [start=0]
     * @param  {NDArray} out
     * @return {NDArray}
     */
    rollaxis : kwargs(function(axis, start, out) {
        if (axis >= this._shape.length) {
            throw new Error(axisOutofBoundsErrorMsg(axis));
        }

        var axes = [];
        for (var i = 0; i < this._shape.length; i++) {
            axes.push(i);
        }
        axes.splice(axis, 1);
        axes.splice(start, 0, axis);

        return this._transposelike(axes, out);

    }, { start : 0}),

    // Base function for transpose-like operations
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
            out._shape = this._shape.slice();
            out._dtype = this._dtype;
            out._size = this._size;
        }
        // FIXME in-place transpose?
        var transposedData = new ArrayConstructor[this._dtype](this._size);
        out._array = transposedData;
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
                    transpose(
                        axis+1, 
                        offset + stride * i, 
                        transposedOffset + transposedStride * i
                    );
                }
            } else {
                for (var i = 0; i < size; i++) {
                    // offset + stride * i is the index of the original array
                    // transposedOffset + i is the index of the transposed array
                    transposedData[transposedOffset + i]
                        = source[offset + stride * i];
                }
            }
        }

        transpose(0, 0, 0);

        return out;
    },

    /**
     * Repeat elements of an array along axis
     * @param {Number} repeats
     *        The number of repetitions for each element.
     *        repeats is broadcasted to fit the shape of the given axis.
     * @param {Number} [axis]
     *        The axis along which to repeat values.
     *        By default, use the flattened input array,
     *        and return a flat output array. 
     * @param {NDArray} [out]
     * @return {NDArray}
     */
    repeat : kwargs(function(repeats, axis, out) {
        var shape;
        // flattened input array
        if (typeof(axis) === 'undefined') {
            shape = [this._size];
            axis = 0;
        } else {
            shape = this._shape.slice();
        }
        var originShape = shape.slice();

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

        var stride = calculateDimStride(originShape, axis);
        var axisSize = originShape[axis];
        var source = this._array;

        var offsetStride = stride * axisSize;

        for (var offset = 0; offset < this._size; offset+=offsetStride) {
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
    }),

    choose : function() {
        console.warn('TODO');
    },

    take : function() {
        console.warn('TODO');
    },

    tile : function() {
        console.warn('TODO');
    },

    /**
     * Preprocess for array calculation 
     * max, min, argmax, argmin, sum, ptp, val, mean
     * Which will reduce one axis if the axis is given
     * 
     * @param  {Number} axis
     * @param  {NDArray} out
     * @param  {Function} funcWithAxis
     * @param  {Function} funcFlatten
     * @return {Number|NDArray}
     */
    _withPreprocess1 : function(axis, out, funcWithAxis, funcFlatten) {
        var source = this._array;
        if (!this._size) {
            return;
        }

        if (typeof(axis)!=='undefined') {
            if (axis < 0) {
                axis = this._shape.length + axis;
            }
            if (axis >= this._shape.length || axis < 0) {
                throw new Error(axisOutofBoundsErrorMsg(axis));
            }

            var shape = this._shape.slice();
            shape.splice(axis, 1);
            if (out && !arrayEqual(shape, out._shape)) {
                throw new Error(broadcastErrorMsg(shape, out._shape));
            }

            if (!out) {
                out = new NDArray(this._dtype);
                out.initFromShape(shape);   
            }
            var data = out._array;

            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var offsetStride = stride * axisSize;

            funcWithAxis.call(
                this, data, source, offsetStride, axisSize, stride
            );

            return out;
        } else {
            return funcFlatten.call(this, source);
        }
    },

    /**
     * Preprocess for array calculation cumsum, cumprod
     * Which will keep the shape if axis is given
     * and flatten if axis is undefined
     * @param  {Number} axis
     * @param  {NDArray} out
     * @param  {Function} funcWithAxis
     * @param  {Function} funcFlatten
     * @return {NDArray}
     */
    _withPreprocess2 : function(axis, out, funcWithAxis, funcFlatten) {
        var source = this._array;
        if (!this._size) {
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
            if (axis < 0) {
                axis = this._shape.length + axis;
            }
            if (axis >= this._shape.length || axis < 0) {
                throw new Error(axisOutofBoundsErrorMsg(axis));
            }

            if (axis >= this._shape.length) {
                throw new Error(axisOutofBoundsErrorMsg(axis));
            }

            var stride = calculateDimStride(this._shape, axis);
            var axisSize = this._shape[axis];
            var offsetStride = stride * axisSize;

            funcWithAxis.call(
                this, data, source, offsetStride, axisSize, stride
            );
        } else {
            out.reshape([this._size]);
            funcFlatten.call(this, data, source);
        }

        return out;
    },

    /**
     * Get the max value of ndarray
     * If the axis is given, the max is only calculate in this dimension
     * Example, for the given ndarray
     *     [[3, 9],
     *      [4, 8]]
     * >>> max(0)
     *     [4, 9]
     * >>> max(1)
     *     [9, 8]
     *     
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    max : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            var cursor = 0;
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
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
        }
        function withFlatten(source) {
            var max = source[0];
            for (var i = 1; i < this._size; i++) {
                if (source[i] > max) {
                    max = source[i];
                }
            }
            return max;
        }
        return function(axis, out) {
            return this._withPreprocess1(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),
    

    /**
     * Return the minimum of an array or minimum along an axis.
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    min : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            var cursor = 0;
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var idx =  i + offset;
                    var min = source[idx];
                    for (var j = 0; j < axisSize; j++) {
                        var d = source[idx];
                        if (d < min) {
                            min = d;
                        }
                        idx += stride;
                    }
                    data[cursor++] = min;
                }
            }
        }
        function withFlatten(source) {
            var min = source[0];
            for (var i = 1; i < this._size; i++) {
                if (source[i] < min) {
                    min = source[i];
                }
            }
            return min;
        }
        return function(axis, out) {
            return this._withPreprocess1(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),

    /**
     * Return indices of the maximum values along an axis.
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    argmax : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            var cursor = 0;
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var dataIdx = 0;
                    var idx =  i + offset;
                    var max = source[idx];
                    for (var j = 0; j < axisSize; j++) {
                        var d = source[idx];
                        if (d > max) {
                            max = d;
                            dataIdx = j;
                        }
                        idx += stride;
                    }
                    data[cursor++] = dataIdx;
                }
            }
        }
        function withFlatten(source) {
            var max = source[0];
            var idx = 0;
            for (var i = 1; i < this._size; i++) {
                if (source[i] > max) {
                    idx = i;
                    max = source[i];
                }
            }
            return idx;
        }
        return function(axis, out) {
            return this._withPreprocess1(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),

    /**
     * Indices of the minimum values along an axis.
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    argmin : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            var cursor = 0;
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var dataIdx = 0;
                    var idx =  i + offset;
                    var min = source[idx];
                    for (var j = 0; j < axisSize; j++) {
                        var d = source[idx];
                        if (d < min) {
                            min = d;
                            dataIdx = j;
                        }
                        idx += stride;
                    }
                    data[cursor++] = dataIdx;
                }
            }
        }
        function withFlatten(source) {
            var min = source[0];
            var idx = 0;
            for (var i = 1; i < this._size; i++) {
                if (source[i] < min) {
                    idx = i;
                    min = source[i];
                }
            }
            return idx;
        }
        return function(axis, out) {
            return this._withPreprocess1(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),

    /**
     * Return the sum of the array elements over the given axis.
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    sum : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            var cursor = 0;
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var sum = 0;
                    var idx =  i + offset;
                    for (var j = 0; j < axisSize; j++) {
                        sum += source[idx];
                        idx += stride;
                    }
                    data[cursor++] = sum;
                }
            }
        }
        function withFlatten(source) {
            var sum = 0;
            for (var i = 0; i < this._size; i++) {
                sum += source[i];
            }
            return sum;
        }
        return function(axis, out) {
            return this._withPreprocess1(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),

    /**
     * Return the product of the array elements over the given axis.
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    prod : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            var cursor = 0;
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var prod = 1;
                    var idx =  i + offset;
                    for (var j = 0; j < axisSize; j++) {
                        prod *= source[idx];
                        idx += stride;
                    }
                    data[cursor++] = prod;
                }
            }
        }
        function withFlatten(source) {
            var prod = 1;
            for (var i = 0; i < this._size; i++) {
                prod *= source[i];
            }
            return prod;
        }
        return function(axis, out) {
            return this._withPreprocess1(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),

    /**
     * Returns the average of the array elements along given axis.
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    mean : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            var cursor = 0;
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var sum = 0;
                    var idx =  i + offset;
                    for (var j = 0; j < axisSize; j++) {
                        sum += source[idx];
                        idx += stride;
                    }
                    var mean = sum / axisSize;
                    data[cursor++] = mean;
                }
            }
        }
        function withFlatten(source) {
            var sum = 0;
            var len = source.length;
            for (var i = 0; i < len; i++) {
                sum += source[i];
            }
            var mean = sum / len;
            return mean;
        }
        return function(axis, out) {
            return this._withPreprocess1(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),

    /**
     * Return the variance of the array elements over the given axis.
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    'var' : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            var cursor = 0;
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var sum = 0;
                    var idx =  i + offset;
                    for (var j = 0; j < axisSize; j++) {
                        sum += source[idx];
                        idx += stride;
                    }
                    var mean = sum / axisSize;
                    var moments = 0;
                    idx =  i + offset;
                    for (var j = 0; j < axisSize; j++) {
                        var diff = source[idx] - mean;
                        moments += diff * diff;
                        idx += stride;
                    }
                    data[cursor++] = moments / axisSize;
                }
            }
        }
        function withFlatten(source) {
            var sum = 0;
            var len = source.length;
            for (var i = 0; i < len; i++) {
                sum += source[i];
            }
            var mean = sum / len;
            var moments = 0;
            for (var i = 0; i < len; i++) {
                var diff = source[i] - mean;
                moments += diff * diff;
            }
            return moments / len;
        }
        return function(axis, out) {
            return this._withPreprocess1(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),
    
    /**
     * Return the standard derivatione of the array elements
     * over the given axis.
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    std : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            var cursor = 0;
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var sum = 0;
                    var idx =  i + offset;
                    for (var j = 0; j < axisSize; j++) {
                        sum += source[idx];
                        idx += stride;
                    }
                    var mean = sum / axisSize;
                    var moments = 0;
                    idx =  i + offset;
                    for (var j = 0; j < axisSize; j++) {
                        var diff = source[idx] - mean;
                        moments += diff * diff;
                        idx += stride;
                    }
                    data[cursor++] = Math.sqrt(moments / axisSize);
                }
            }
        }
        function withFlatten(source) {
            var sum = 0;
            var len = source.length;
            for (var i = 0; i < len; i++) {
                sum += source[i];
            }
            var mean = sum / len;
            var moments = 0;
            for (var i = 0; i < len; i++) {
                var diff = source[i] - mean;
                moments += diff * diff;
            }
            return Math.sqrt(moments / len);
        }
        return function(axis, out) {
            return this._withPreprocess1(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),
    
    /**
     * Peak to peak (maximum - minimum) value along a given axis.
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    ptp : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            var cursor = 0;
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
                for (var i = 0; i < stride; i++) {
                    var idx = offset + i;
                    var min = source[idx];
                    var max = source[idx];
                    for (var j = 0; j < axisSize; j++) {
                        var d = source[idx];
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
        }
        function withFlatten(source) {
            var min = source[0];
            var max = source[0];
            for (var i = 1; i < this._size; i++) {
                if (source[i] < min) {
                    min = source[i];
                }
                if (source[i] > max) {
                    max = source[i];
                }
            }
            return max - min;
        }
        return function(axis, out) {
            return this._withPreprocess1(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),

    /**
     * 
     * @param {Number} [axis=-1]
     * @param {string} [order='ascending']
     *        'ascending' | 'descending'
     * @return {NDArray}
     */
    // FIXME : V8 is quick sort, firefox and safari is merge sort
    // order : ascending or desc
    sort : kwargs(function(axis, order) {
        if (axis < 0) {
            axis = this._shape.length + axis;
        }
        var compareFunc;
        if (order === 'ascending') {
            compareFunc = function(a, b) {
                return a - b;
            };
        } else if( order === 'descending') {
            compareFunc = function(a, b) {
                return b - a;
            };
        }

        var source = this._array;
        var stride = calculateDimStride(this._shape, axis);
        var axisSize = this._shape[axis];

        var offsetStride = stride * axisSize;

        var tmp = new Array(axisSize);

        for (var offset = 0; offset < this._size; offset+=offsetStride) {

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

    }, {axis : -1, order : 'ascending'}),

    /**
     * 
     * @param {Number} [axis=-1]
     * @param {string} [order='ascending']
     *        'ascending' | 'descending'
     * @param {NDArray} [out]
     * @return {NDArray}
     */
    argsort : kwargs(function(axis, order, out) {
        if (axis < 0) {
            axis = this._shape.length + axis;
        }
        if (!this._size) {
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

        var compareFunc;
        if (order === 'ascending') {
            compareFunc = function(a, b) {
                return tmp[a] - tmp[b];
            };
        } else if( order === 'descending') {
            compareFunc = function(a, b) {
                return tmp[b] - tmp[a];
            };
        }

        var source = this._array;
        var stride = calculateDimStride(this._shape, axis);
        var axisSize = this._shape[axis];
        var offsetStride = stride * axisSize;

        var tmp = new Array(axisSize);
        var indexList = new Array(axisSize);

        for (var offset = 0; offset < this._size; offset+=offsetStride) {
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

    }, {axis : -1, order : 'ascending'}),

    /**
     * Return the cumulative sum of the elements along the given axis.
     * @param  {Number} [axis] 
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    cumsum : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
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
        }
        function withFlatten(data, source) {
            data[0] = source[0];
            for (var i = 1; i < data.length; i++) {
                data[i] = data[i-1] + source[i];
            }
        }
        return function(axis, out) {
            return this._withPreprocess2(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),

    /**
     * Return the cumulative product of the elements along the given axis.
     * @param  {Number} [axis]
     * @param  {NDArray} out  
     * @return {NDArray}
     */
    cumprod : kwargs((function() {
        function withAxis(data, source, offsetStride, axisSize, stride) {
            for (var offset = 0; offset < this._size; offset+=offsetStride) {
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
        }
        function withFlatten(data, source) {
            data[0] = source[0];
            for (var i = 1; i < data.length; i++) {
                data[i] = data[i-1] * source[i];
            }
        }
        return function(axis, out) {
            return this._withPreprocess2(
                axis, out,
                withAxis, withFlatten
            );
        };
    })()),

    /**
     * Dot product of two arrays.
     * 
     * @param  {NDArray|Number} b
     * @param  {NDArray}        [out]
     * @return {NDArray|Number}
     */
    dot : function() {
        console.warn('TODO');
    },

    /**
     * Mapped to region [min, max]
     * @param {Number} mappedMin
     * @param {Number} mappedMax
     */
    map : function(mappedMin, mappedMax) {
        var input = this._array;
        var output = this._array;

        var min = input[0];
        var max = input[0];
        var l = this._size;
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
        return this.binaryOperation(
            this, rightOperand, E_ADD, out 
        );
    },

    /**
     * Substract
     */
    sub : function(rightOperand, out) {
        return this.binaryOperation(
            this, rightOperand, E_SUB, out
        );
    },

    /**
     * Multiply
     */
    mul : function(rightOperand, out) {
        return this.binaryOperation(
            this, rightOperand, E_MUL, out
        );
    },

    /**
     * Divide
     */
    div : function(rightOperand, out) {
        return this.binaryOperation(
            this, rightOperand, E_DIV, out
        );
    },
    /**
     * mod
     */
    mod : function(rightOperand, out) {
        return this.binaryOperation(
            this, rightOperand, E_MOD, out
        );
    },
    /**
     * and
     */
    and : function(rightOperand, out) {
        return this.binaryOperation(
            this, rightOperand, E_AND, out
        );
    },
    /**
     * or
     */
    or : function(rightOperand, out) {
        return this.binaryOperation(
            this, rightOperand, E_OR, out
        );
    },
    /**
     * xor
     */
    xor : function(rightOperand, out) {
        return this.binaryOperation(
            this, rightOperand, E_XOR, out
        );
    },
    /**
     * equal
     */
    equal : function(rightOperand) {
        return this.binaryOperation(
            this, rightOperand, E_EQL, out
        );
    },

    binaryOperation : function(lo, ro, op, out) {
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
                    loBroadCasted = lo.repeat(ro._shape[cr], cl);
                } else if(ro._shape[cr] == 1) {
                    shape.unshift(lo._shape[cl]);
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
                throw new Error(broadcastErrorMsg(shape, out._shape));
            }
        }
        var outData = out._array;
        
        var diffAxis;
        var isLoLarger;
        var loData;
        var roData;
        if (isLoScalar) {
            diffAxis = ro._shape.length-1;
            isLoLarger = false;
            loData = lo;
            roData = ro._array;
        } else if(isRoScalar) {
            diffAxis = lo._shape.length-1;
            isLoLarger = true;
            roData = ro;
            loData = lo._array;
        } else {
            diffAxis = Math.abs(lo._shape.length - ro._shape.length);
            isLoLarger = lo._shape.length >= ro._shape.length;
            loData = lo._array;
            roData = ro._array;
        }
        var stride = calculateDimStride(shape, diffAxis);
        var axisSize = shape[diffAxis];

        var offsetStride = stride * axisSize;
        var offsetRepeats = out._size / offsetStride;

        var _a, _b, res;
        var idx = 0;
        if (isLoLarger) {
            if(isRoScalar) {
                for (var c = 0; c < offsetRepeats; c++) {
                    for (var i = 0; i < offsetStride; i++) {
                        _a = loData[idx]; _b = roData;
                        switch (op) {
                            case E_ADD: res = _a + _b; break;
                            case E_SUB: res = _a - _b; break;
                            case E_MUL: res = _a * _b; break;
                            case E_DIV: res = _a / _b; break;
                            case E_MOD: res = _a % _b; break;
                            case E_AND: res = _a & _b; break;
                            case E_OR: res = _a | _b; break;
                            case E_XOR: res = _a ^ _b; break;
                            case E_EQL: res = _a == _b; break;
                            default: throw new Error('Unkown operation ' + op);
                        }
                        outData[idx] = res;
                        idx ++;
                    }
                }
            } else {
                for (var c = 0; c < offsetRepeats; c++) {
                    for (var i = 0; i < offsetStride; i++) {
                        _a = loData[idx]; _b = roData[i];
                        switch (op) {
                            case E_ADD: res = _a + _b; break;
                            case E_SUB: res = _a - _b; break;
                            case E_MUL: res = _a * _b; break;
                            case E_DIV: res = _a / _b; break;
                            case E_MOD: res = _a % _b; break;
                            case E_AND: res = _a & _b; break;
                            case E_OR: res = _a | _b; break;
                            case E_XOR: res = _a ^ _b; break;
                            case E_EQL: res = _a == _b; break;
                            default: throw new Error('Unkown operation ' + op);
                        }
                        outData[idx] = res;
                        idx ++;
                    }
                }
            }
        } else {
            if (isLoScalar) {
                for (var c = 0; c < offsetRepeats; c++) {
                    for (var i = 0; i < offsetStride; i++) {
                        _a = loData; _b = roData[idx];
                        switch (op) {
                            case E_ADD: res = _a + _b; break;
                            case E_SUB: res = _a - _b; break;
                            case E_MUL: res = _a * _b; break;
                            case E_DIV: res = _a / _b; break;
                            case E_MOD: res = _a % _b; break;
                            case E_AND: res = _a & _b; break;
                            case E_OR: res = _a | _b; break;
                            case E_XOR: res = _a ^ _b; break;
                            case E_EQL: res = _a == _b; break;
                            default: throw new Error('Unkown operation ' + op);
                        }
                        outData[idx] = res;
                        idx ++;
                    }
                }
            } else {
                for (var c = 0; c < offsetRepeats; c++) {
                    for (var i = 0; i < offsetStride; i++) {
                        _a = loData[idx]; _b = roData[i];
                        switch (op) {
                            case E_ADD: res = _a + _b; break;
                            case E_SUB: res = _a - _b; break;
                            case E_MUL: res = _a * _b; break;
                            case E_DIV: res = _a / _b; break;
                            case E_MOD: res = _a % _b; break;
                            case E_AND: res = _a & _b; break;
                            case E_OR: res = _a | _b; break;
                            case E_XOR: res = _a ^ _b; break;
                            case E_EQL: res = _a == _b; break;
                            default: throw new Error('Unkown operation ' + op);
                        }
                        outData[idx] = res;
                        idx ++;
                    }
                }
            }
        }
        return out;
    },

    /**
     * negtive
     */
    neg : function() {
        var data = this._array;
        for (var i = 0; i < this._size; i++) {
            data[i] = -data[i];
        }
        return this;
    },

    /**
     * @return {NDArray} this
     */
    sin : function() {
        return this._mathAdapter(Math.sin);
    },

    /**
     * @return {NDArray} this
     */
    cos : function() {
        return this._mathAdapter(Math.cos);
    },

    /**
     * @return {NDArray} this
     */
    tan : function() {
        return this._mathAdapter(Math.tan);
    },

    /**
     * @return {NDArray} this
     */
    abs : function() {
        return this._mathAdapter(Math.abs);
    },

    /**
     * @return {NDArray} this
     */
    log : function() {
        return this._mathAdapter(Math.log);
    },

    /**
     * @return {NDArray} this
     */
    sqrt : function() {
        return this._mathAdapter(Math.sqrt);
    },

    /**
     * @return {NDArray} this
     */
    ceil : function() {
        return this._mathAdapter(Math.ceil);
    },

    /**
     * @return {NDArray} this
     */
    floor : function() {
        return this._mathAdapter(Math.floor);
    },
    
    /**
     * @return {NDArray} this
     */
    pow : function(exp) {
        var data = this._array;
        for (var i = 0; i < this._size; i++) {
            data[i] = Math.pow(data[i], exp);
        }
        return this;
    },

    _mathAdapter : function(mathFunc) {
        var data = this._array;
        for (var i = 0; i < this._size; i++) {
            data[i] = mathFunc(data[i]);
        }
        return this;
    },

    /**
     * @param   {Number} decimals
     * @return  {NDArray} this
     */
    round : function(decimals) {
        decimals = Math.floor(decimals || 0);
        var offset = Math.pow(10, decimals);
        var data = this._array;
        if (decimals === 0) {
            for (var i = 0; i < this._size; i++) {
                data[i] = Math.round(data[i]);
            }
        } else {
            for (var i = 0; i < this._size; i++) {
                data[i] = Math.round(data[i] * offset) / offset;
            }
        }
        return this;
    },
    /**
     * @param {Number} min
     * @param {Number} max
     * Clip to [min, max]
     */
    clip : function(min, max) {
        // TODO : Support array_like param
        var data = this._array;
        for (var i = 0; i < this._size; i++) {
            data[i] = Math.max(Math.min(data[i], max), min);
        }
        return this;
    },

    /**
     * Indexing array, support range indexing
     * @param {string} index
     *        Index syntax can be an integer 1, 2, 3
     *        Or more complex range indexing
     *        '1:2'
     *        '1:2, 1:2'
     *        '1:2, :'
     *        More about the indexing syntax can check the doc of numpy ndarray
     * @param {NDArray} [out]
     * @return {NDArray} New created sub array, or out if given
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
        var data;
        if (shape.length) {
            out = new NDArray(this._dtype);
            out.initFromShape(shape);
            data = out._array;
        } else {
            data = [];
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
            
    },

    /**
     * 
     * @param {string} index
     *        index syntax can be an integer 1, 2, 3
     *        Or more complex range indexing
     *        '1:2'
     *        '1:2, 1:2'
     *        '1:2, :'
     *        More about the indexing syntax can check the doc of numpy ndarray
     * @param {NDArray} ndarray Ndarray data source
     * @return {NDArray} this
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
        };

        setPiece(0, 0);

        return this;
    },

    /**
     * Insert values along the given axis before the given indices.
     * @param  {Number|Array} obj
     *         Object that defines the index or indices before 
     *         which values is inserted.
     * @param  {Number|Array|NDArray} values
     *         Values to insert
     * @param  {Number} [axis]
     * @return {NDArray} this
     */
    insert : kwargs(function(obj, values, axis) {
        var data = this._array;
        var isObjScalar = false;
        if (typeof(obj) === 'number') {
            obj = [obj];
            isObjScalar = true;
        }
        if (typeof(values) === 'number') {
            values = new NDArray([values]);
        } else if (values instanceof Array) {
            values = new NDArray(values);
        }

        if (typeof(axis) === 'undefined') {
            this._shape = [this._size];
            axis = 0;
        }
        // Checking if indices is valid
        var prev = obj[0];
        var axisSize = this._shape[axis];
        for (var i = 0; i < obj.length; i++) {
            if (obj[i] < 0) {
                obj[i] = axisSize + obj[i];
            }
            if (obj[i] > axisSize) {
                throw new Error(indexOutofBoundsErrorMsg(obj[i]));   
            }
            if (obj[i] < prev) {
                throw new Error('Index must be in ascending order');
            }
            prev = obj[i];
        }
        // Broadcasting
        var targetShape = this._shape.slice();
        if (isObjScalar) {
            targetShape.splice(axis, 1);
        } else {
            targetShape[axis] = obj.length;
        }

        var sourceShape = values._shape;
        var cs = sourceShape.length - 1;
        var ct = targetShape.length - 1;

        var valueBroadcasted = values;
        while (cs >= 0 && ct >= 0) {
            if (sourceShape[cs] === 1) {
                valueBroadcasted = values.repeat(targetShape[ct], cs);
            } else if(sourceShape[cs] !== targetShape[ct]) {
                throw new Error(broadcastErrorMsg(sourceShape, targetShape));
            }
            cs --;
            ct --;
        }
        values = valueBroadcasted;

        // Calculate indices to insert
        var stride = calculateDimStride(this._shape, axis);
        var axisSize = this._shape[axis];
        var offsetStride = axisSize * stride;
        var offsetRepeats = this._size / offsetStride;

        var objLen = obj.length;
        var indices = new Uint32Array(offsetRepeats * objLen);

        var cursor = 0;
        for (var offset = 0; offset < this._size; offset += offsetStride) {
            for (var i = 0; i < objLen; i++) {
                var objIdx = obj[i];
                indices[cursor++] = offset + objIdx * stride;
            }
        }

        var resShape = this._shape.slice();
        resShape[axis] += obj.length;
        var resSize = getSize(resShape);
        if (this._array.length < resSize) {
            var data = new ArrayConstructor[this._dtype](resSize);
        } else {
            var data = this._array;
        }
        var source = this._array;
        var valuesArr = values._array;

        var idxCursor = indices.length - 1;
        var end = this._size;
        var start = indices[idxCursor];
        var dataCursor = resSize - 1;
        var valueCursor = values._size - 1;
        while (idxCursor >= 0) {
            // Copy source data;
            for (var i = end - 1; i >= start; i--) {
                data[dataCursor--] = source[i];
            }
            end = start;
            start = indices[--idxCursor];
            // Copy inserted data;
            for (var i = 0; i < stride; i++) {
                if (valueCursor < 0) {
                    valueCursor = values._size - 1;
                }
                data[dataCursor--] = valuesArr[valueCursor--];
            }
        }
        // Copy the rest
        for (var i = end - 1; i >= 0; i--) {
            data[dataCursor--] = source[i];
        }

        this._array = data;
        this._shape = resShape;
        this._size = resSize;

        return this;
    }),

    append : function() {
        console.warn('TODO');
    },

    /**
     * Delete values along the axis
     * @param  {Array|Number} obj
     * @param  {Number} [axis]
     * @return {NDArray} this
     */
    'delete' : kwargs(function(obj, axis) {
        var data = this._array;
        if (typeof(obj) === 'number') {
            obj = [obj];
        }
        var size = this._size;

        if (typeof(axis) === 'undefined') {
            this._shape = [size];
            axis = 0;
        }

        var stride = calculateDimStride(this._shape, axis);
        var axisSize = this._shape[axis];

        var offsetStride = stride * axisSize;
        var cursor = 0;
        for (var offset = 0; offset < size; offset += offsetStride) {
            var start = 0;
            var end = obj[0];
            var objCursor = 0;
            while(objCursor < obj.length) {
                if (end < 0) {
                    end = end + axisSize;
                }
                if (end > axisSize) {
                    throw new Error(indexOutofBoundsErrorMsg(end));
                }
                if (end < start) {
                    throw new Error('Index must be in ascending order');
                }
                for (var i = start; i < end; i++) {
                    for (var j = 0; j < stride; j++) {
                        data[cursor++] = data[i * stride + j + offset];
                    }
                }
                start = end + 1;
                end = obj[++objCursor];
            }
            // Copy the rest
            for (var i = start; i < axisSize; i++) {
                for (var j = 0; j < stride; j++) {
                    data[cursor++] = data[i * stride + j + offset];
                }
            }
        }
        this._shape[axis] -= obj.length;
        this._size = getSize(this._shape);

        return this;
    }),

    _parseRanges : function(index) {
        var rangesStr = index.split(/\s*,\s*/);
        
        // Parse range of each axis
        var ranges = [];
        var shape = [];
        var j = 0;
        for (var i = 0; i < rangesStr.length; i++) {
            if (rangesStr[i] === '...') {
                var end = this._shape.length - (rangesStr.length - i);
                while (j <= end) {
                    ranges.push([0, this._shape[j], 1]);
                    shape.push(this._shape[j]);
                    j++;
                }
            } else {
                var range = parseRange(rangesStr[i], this._shape[j]);
                ranges.push(range);
                if(rangesStr[i].indexOf(':') >= 0) {
                    var size = Math.floor((range[1] - range[0]) / range[2]);
                    size = size < 0 ? 0 : size;
                    // Get a range not a item
                    shape.push(size);
                }
                j++;
            }
        }
        // Copy the lower dimension size
        for (; j < this._shape.length; j++) {
            shape.push(this._shape[j]);
        }

        return [ranges, shape];
    },

    /**
     * Export normal js array
     * @return {Array}
     */
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

        var output = [];
        create(0, output);

        return output;
    },

    /**
     * Create a copy of self
     * @return {NDArray}
     */
    copy : function() {
        var numArr = new NDArray();
        numArr._array = ArraySlice.call(this._array);
        numArr._shape = this._shape.slice();
        numArr._dtype = this._dtype;
        numArr._size = this._size;

        return numArr;
    },

    constructor : NDArray
};

/**
 * 
 * @param  {Number} [min=0]
 * @param  {Number} max
 * @param  {Number} [step=1]
 * @param  {string} [dtype]
 * @return {NDArray}
 */
NDArray.range = kwargs(function(min, max, step, dtype) {
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
    dtype = dtype || 'number';

    var array = new ArrayConstructor[dtype](Math.ceil((max - min)/step));
    var cursor = 0;
    for (var i = min; i < max; i+=step) {
        array[cursor++] = i;
    }
    var ndarray = new NDArray();
    ndarray._array = array;
    ndarray._shape = [array.length];
    ndarray._dtype = dtype;
    ndarray._size = array.length;

    return ndarray;

});

/**
 * 
 * @param  {Array}  shape 
 * @param  {String} [dtype] 
 * @return {NDArray}       
 */
NDArray.zeros = kwargs(function(shape, dtype) {
    var ret = new NDArray(dtype);
    ret.initFromShape(shape);
    return ret;
});

/**
 * Python like array indexing
 * http://www.python.org/dev/peps/pep-0204/
 * 
 * @param   {string} index
 *          index can be a simple integer 1,2,3,
 *          or a range 2:10, 2:10:1
 *          example :
 *              2:10    =>  [2, 10, 1],
 *              10:2:-2 =>  [10, 2, -2],
 *              :       =>  [0, dimSize, 1],
 *              ::-1    =>  [dimSize-1, -1, -1],
 * @param   {number} dimSize
 * @return  {Array} a tuple array [startOffset, endOffset, sliceStep]
 */
function parseRange(index, dimSize) {
    if (index.indexOf(':') >= 0) {
        // Range indexing;
        var res = index.split(/\s*:\s*/);

        var step = parseInt(res[2] || 1, 10);
        var start, end;
        if (step === 0) {
            throw new Error('Slice step cannot be zero');
        }
        else if (step > 0) {
            start = parseInt(res[0] || 0, 10);
            end = parseInt(res[1] || dimSize, 10);
        }
        else {
            start = parseInt(res[0] || dimSize - 1, 10);
            end = parseInt(res[1] || -1, 10);
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
        var start = parseInt(index, 10);
        // Negtive offset
        if (start < 0) {
            start = dimSize + start;
        }
        if (start < 0 || start > dimSize) {
            throw new Error(indexOutofBoundsErrorMsg(index));
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
    return dim;
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

function broadcastErrorMsg(shape1, shape2) {
    return 'Shape (' 
            + shape1.toString() + ') (' + shape2.toString()
            +') could not be broadcast together';
}

function axisOutofBoundsErrorMsg(axis) {
    return 'Axis ' + axis + ' out of bounds';
}

function indexOutofBoundsErrorMsg(idx) {
    return 'Index ' + idx + ' out of bounds';
}

return NDArray;

});