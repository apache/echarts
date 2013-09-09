/**
 * Numpy like n-dimensional array proccessing class
 * http://docs.scipy.org/doc/numpy/reference/arrays.ndarray.html
 * 
 * @author pissang (https://github.com/pissang/)
 */
define(function(require) {

    'use strict';

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
        // Consider array strider is 1
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
            // shape, describe the dimension and size of each dimension
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
                this._array = new ArrayConstructor[this._dtype](size);

                if (this._dtype === 'number') {
                    for (var i = 0; i < size; i++) {
                        this._array[i] = 0;
                    }   
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
            var strides = this._calculateDimStrides();
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

        transpose : function(axes /*optional*/) {
            var originAxes = [];
            for (var i = 0; i < this._shape.length; i++) {
                originAxes.push(i);
            }
            if (typeof(axes) === 'undefined') {
                axes = originAxes.slice();
            }
            else if (typeof(axes) === 'number') {
                axes = Array.prototype.slice.call(arguments);
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

            return this._transposelike(targetAxes);
        },

        swapaxes : function(axis1, axis2) {
            return this.transpose(axis1, axis2);
        },

        rollaxis : function(axis, start /*optional*/) {
            if (axis >= this._shape.length) {
                throw new Error('Axis ' + axis + ' out of bounds');
            }
            start = start || 0;
            var axes = [];
            for (var i = 0; i < this._shape.length; i++) {
                axes.push(i);
            }
            axes.splice(axis, 1);
            axes.splice(start, 0, axis);

            return this._transposelike(axes);
        },

        // Base function for transpose-like operations
        // Can swap any axes
        _transposelike : function(axes) {
            var source = this._array;
            var shape = this._shape.slice();
            var strides = this._calculateDimStrides();
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
            var transposedStrides = this._calculateDimStrides();

            var transposedData = new ArrayConstructor[this._dtype](source.length);

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
            return this;
        },

        /**
         * Repeat elements of an array.
         * @param {int} repeats The number of repetitions for each element. repeats is broadcasted to fit the shape of the given axis.
         * @param {int} axis(optional) The axis along which to repeat values. By default, use the flattened input array, and return a flat output array. 
         */
        repeat : function(repeats, axis /*optional*/) {
            if (typeof axis === 'undefined') {
                //Use the flattened input array
                var size = this._array.length * repeats;
                var data = new ArrayConstructor[this._dtype]();
                var source = this._array;
                for (var i = 0; i < this._array.length; i++) {
                    for (j = 0; j < repeats; j++) {
                        data[i * repeats + j] = source[i];
                    }
                }
                this._array = data;
                // FLattened
                this._shape = [size];

                return this;
            } else {
                var size = this._array.length * repeats;
                var stride = this._calculateDimStride(axis);
                var axisSize = this._shape[axis];
                var source = this._array;

                var data = new ArrayConstructor[this._dtype]();
                for (var i = 0; i < axisSize; i++) {
                    for (var j = 0; j < repeats; j++) {
                        for (var k = 0; k < stride; k++) {
                            data[i * repeats * stride + j * stride + k] = source[i * stride + k];
                        }
                    }
                }

                this._array = data;
                this._shape[axis] *= repeats;

                return this;
            }
        },

        isShapeValid : function(shape) {
            return getSize(shape) === this._array.length;
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
        max : function(axis /*optional*/) {
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
                var strides = this._calculateDimStrides();

                var ret = new NDArray(this._dtype);
                ret.initFromShape(shape);
                var data = ret._array;
                var cursor = 0;

                var self = this;
                var calMax = function(cAxis, offset) {
                    var size = self._shape[cAxis];
                    var stride = strides[cAxis];
                    if (cAxis < axis) {
                        for (var i = 0; i < size; i++) {
                            calMax(cAxis+1, i * stride);
                        }
                    } else {
                        for (var i = 0; i < stride; i++) {
                            var max = source[offset + i];
                            for (var j = 0; j < size; j++) {
                                var d = source[j * stride + i + offset]
                                if (d > max) {
                                    max = d;
                                }
                            }
                            data[cursor++] = max;
                        }
                    }
                }

                calMax(0, 0);

                return ret;
            } else {

                var max = source[0];
                for (var i = 1; i < source.length; i++) {
                    if (source[i] > max) {
                        max = source[i];
                    }
                }
                return max;
            }

        },

        min : function(axis /*optional*/) {
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
                var strides = this._calculateDimStrides();

                var ret = new NDArray(this._dtype);
                ret.initFromShape(shape);
                var data = ret._array;
                var cursor = 0;

                var self = this;
                var calMin = function(cAxis, offset) {
                    var size = self._shape[cAxis];
                    var stride = strides[cAxis];
                    if (cAxis < axis) {
                        for (var i = 0; i < size; i++) {
                            calMin(cAxis+1, i * stride);
                        }
                    } else {
                        for (var i = 0; i < stride; i++) {
                            var min = source[offset + i];
                            for (var j = 0; j < size; j++) {
                                var d = source[j * stride + i + offset]
                                if (d < min) {
                                    min = d;
                                }
                            }
                            data[cursor++] = min;
                        }
                    }
                }

                calMin(0, 0);

                return ret;
            } else {

                var min = source[0];
                for (var i = 1; i < source.length; i++) {
                    if (source[i] < min) {
                        min = source[i];
                    }
                }
                return min;
            }
        },

        argmax : function(axis /*optional*/) {
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
                var strides = this._calculateDimStrides();

                var ret = new NDArray(this._dtype);
                ret.initFromShape(shape);
                var data = ret._array;
                var cursor = 0;

                var self = this;
                var calMax = function(cAxis, offset) {
                    var size = self._shape[cAxis];
                    var stride = strides[cAxis];
                    if (cAxis < axis) {
                        for (var i = 0; i < size; i++) {
                            calMax(cAxis+1, i * stride);
                        }
                    } else {
                        for (var i = 0; i < stride; i++) {
                            var max = source[offset + i];
                            var idx = 0;
                            for (var j = 0; j < size; j++) {
                                var d = source[j * stride + i + offset]
                                if (d > max) {
                                    max = d;
                                    idx = j;
                                }
                            }
                            data[cursor++] = idx;
                        }
                    }
                }

                calMax(0, 0);

                return ret;
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
        },

        argmin : function(axis /*optional*/) {
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
                var strides = this._calculateDimStrides();

                var ret = new NDArray(this._dtype);
                ret.initFromShape(shape);
                var data = ret._array;
                var cursor = 0;

                var self = this;
                var calMin = function(cAxis, offset) {
                    var size = self._shape[cAxis];
                    var stride = strides[cAxis];
                    if (cAxis < axis) {
                        for (var i = 0; i < size; i++) {
                            calMin(cAxis+1, i * stride);
                        }
                    } else {
                        for (var i = 0; i < stride; i++) {
                            var min = source[offset + i];
                            var idx = 0;
                            for (var j = 0; j < size; j++) {
                                var d = source[j * stride + i + offset]
                                if (d < min) {
                                    min = d;
                                    idx = j;
                                }
                            }
                            data[cursor++] = idx;
                        }
                    }
                }

                calMin(0, 0);

                return ret;
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
        },

        sum : function(axis /*optional*/) {
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
                var strides = this._calculateDimStrides();

                var ret = new NDArray(this._dtype);
                ret.initFromShape(shape);
                var data = ret._array;
                var cursor = 0;

                var self = this;
                var calSum = function(cAxis, offset) {
                    var size = self._shape[cAxis];
                    var stride = strides[cAxis];
                    if (cAxis < axis) {
                        for (var i = 0; i < size; i++) {
                            calSum(cAxis+1, i * stride);
                        }
                    } else {
                        for (var i = 0; i < stride; i++) {
                            var sum = 0;
                            for (var j = 0; j < size; j++) {
                                var d = source[j * stride + i + offset]
                                sum += d
                            }
                            data[cursor++] = sum;
                        }
                    }
                }

                calSum(0, 0);

                return ret;
            } else {
                var sum = 0;
                for (var i = 0; i < source.length; i++) {
                    sum += source[i];
                }
                return sum;
            }
        },

        cumsum : function(axis /*optional*/) {
            console.warn('TODO');
        },

        ptp : function(axis /*optional*/) {
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
                var strides = this._calculateDimStrides();

                var ret = new NDArray(this._dtype);
                ret.initFromShape(shape);
                var data = ret._array;
                var cursor = 0;

                var self = this;
                var calMin = function(cAxis, offset) {
                    var size = self._shape[cAxis];
                    var stride = strides[cAxis];
                    if (cAxis < axis) {
                        for (var i = 0; i < size; i++) {
                            calMin(cAxis+1, i * stride);
                        }
                    } else {
                        for (var i = 0; i < stride; i++) {
                            var min = source[offset + i];
                            var max = source[offset + i];
                            for (var j = 0; j < size; j++) {
                                var d = source[j * stride + i + offset]
                                if (d < min) {
                                    min = d;
                                }
                                if (d > max) {
                                    max = d;
                                }
                            }
                            data[cursor++] = max - min;
                        }
                    }
                }

                calMin(0, 0);

                return ret;
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

        },

        mean : function(axis /*optional*/) {
            var sum = this.sum(axis);
            if (sum instanceof NDArray) {
                sum.mul(1 / this._shape[axis], axis);
                return sum;
            } else {
                return sum / this._array.length;
            }
        },

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
         * Multiply
         */
        mul : function(rightOperand) {
            this._binaryOperation(
                this, rightOperand, this,
                function(lo, ro, out, len, isNumber) {
                    for (var i = 0; i < len; i++) {
                        isNumber
                            ? out[i] = lo[i] * ro
                            : out[i] = lo[i] * ro[i]
                    }
                }
            );
            return this;
        },

        /**
         * Add
         */
        add : function(rightOperand) {
            this._binaryOperation(
                this, rightOperand, this,
                function(lo, ro, out, len, isNumber) {
                    for (var i = 0; i < len; i++) {
                        isNumber
                            ? out[i] = lo[i] + ro
                            : out[i] = lo[i] + ro[i]
                    }
                }
            );
            return this;
        },

        /**
         * Substract
         */
        sub : function(rightOperand) {
            this._binaryOperation(
                this, rightOperand, this,
                function(lo, ro, out, len, isNumber) {
                    for (var i = 0; i < len; i++) {
                        isNumber
                            ? out[i] = lo[i] - ro
                            : out[i] = lo[i] - ro[i]
                    }
                }
            );
            return this;
        },

        /**
         * Divide
         */
        div : function(rightOperand) {
            this._binaryOperation(
                this, rightOperand, this,
                function(lo, ro, out, len, isNumber) {
                    for (var i = 0; i < len; i++) {
                        isNumber
                            ? out[i] = lo[i] / ro
                            : out[i] = lo[i] / ro[i]
                    }
                }
            );
            return this;
        },
        /**
         * mod
         */
        mod : function(rightOperand) {
            this._binaryOperation(
                this,
                rightOperand,
                this,
                function(lo, ro, out, len, isNumber) {
                    for (var i = 0; i < len; i++) {
                        isNumber
                            ? out[i] = lo[i] % ro
                            : out[i] = lo[i] % ro[i]
                    }
                }
            );
            return this;
        },
        /**
         * and
         */
        and : function(rightOperand) {
            this._binaryOperation(
                this, rightOperand, this,
                function(lo, ro, out, len, isNumber) {
                    for (var i = 0; i < len; i++) {
                        isNumber
                            ? out[i] = lo[i] & ro
                            : out[i] = lo[i] & ro[i]
                    }
                }
            );
            return this;
        },
        /**
         * or
         */
        or : function(rightOperand) {
            this._binaryOperation(
                this, rightOperand, this,
                function(lo, ro, out, len, isNumber) {
                    for (var i = 0; i < len; i++) {
                        isNumber
                            ? out[i] = lo[i] | ro
                            : out[i] = lo[i] | ro[i]
                    }
                }
            );
            return this;
        },
        /**
         * xor
         */
        xor : function(rightOperand) {
            this._binaryOperation(
                this, rightOperand, this,
                function(lo, ro, out, len, isNumber) {
                    for (var i = 0; i < len; i++) {
                        isNumber
                            ? out[i] = lo[i] ^ ro
                            : out[i] = lo[i] ^ ro[i]
                    }
                }
            );
            return this;
        },

        _binaryOperation : function(lo, ro, out, func) {
            if (typeof(ro) == 'number') {
                func(lo._array, ro, out._array, lo._array.length, true);
            } else {
                if (!arrayEqual(lo._shape, ro._shape)) {
                    throw new Error(broadcastErrorMsg(lo._shape, ro._shape));
                }
                func(lo._array, ro._array, out._array, lo._array.length, false);
            }
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

        round : function(decimals /*optional*/) {
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
        get : function(index) {
            if (typeof(index) == 'number') {
                index = index.toString();
            }
            var strides = this._calculateDimStrides();
            var res = this._parseRanges(index);
            var ranges = res[0];
            var shape = res[1];

            if (ranges.length > this._shape.length) {
                throw new Error('Too many indices');
            }
            // Get data
            var len = ranges.length;
            if (shape.length) {
                var ret = new NDArray(this._dtype);
                ret.initFromShape(shape);
                var data = ret._array;
            } else {
                var data = [];
            }

            var source = this._array;
            var cursor = 0;
            function getPiece(axis, offset) {
                var range = ranges[axis];
                var stride = strides[axis];
                if (axis < len-1) {
                    for (var i = range[0]; i < range[1]; i++) {
                        getPiece(axis+1, offset + stride * i);
                    }
                } else {
                    var startOffset = offset + range[0] * stride;
                    var endOffset = offset + range[1] * stride;
                    for (var i = startOffset; i < endOffset; i++) {
                        data[cursor++] = source[i];
                    }
                }
            }

            getPiece(0, 0);

            if (shape.length) {
                // Return scalar
                return ret;
            } else {
                return data[0];
            }
                
        },

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
            var strides = this._calculateDimStrides();
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
                    for (var i = range[0]; i < range[1]; i++) {
                        setPiece(axis+1,  offset + stride * i);
                    }
                } else {
                    var startOffset = offset + range[0] * stride;
                    var endOffset = offset + range[1] * stride;
                    for (var i = startOffset; i < endOffset; i++) {
                        if (isScalar) {
                            data[i] = source;
                        } else {
                            data[i] = source[cursor++];
                        }
                    }
                }
            }

            setPiece(0, 0);

            return this;
        },

        _calculateDimStride : function(axis) {
            if (axis == this._shape.length-1) {
                return 1;
            }
            var stride = this._shape[axis+1];
            for (var i = axis+2; i < this._shape.length; i++) {
                stride *= this._shape[i];
            }
            return stride;
        },

        _calculateDimStrides : function() {
            // Calculate stride of each axis
            var strides = [];
            var tmp = 1;
            var len = this._array.length;
            for (var i = 0; i < this._shape.length; i++) {
                tmp *= this._shape[i];
                strides.push(len / tmp);
            }

            return strides;
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
                    // Get a range not a item
                    shape.push(ranges[i][1] - ranges[i][0]);
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
            numArr = new NDArray();
            numArr._array = ArraySlice.call(this._array);
            numArr._shape = this._shape.slice();
            numArr._dtype = this._dtype;

            return numArr;
        },

        constructor : NDArray
    }

    NDArray.range = function(min, max, step) {
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
    }

    /**
     * Python like array indexing
     * index can be a simple integer 1,2,3,
     * or a range 2:10
     * @return an array with clamped and positive startOffset and endOffset
     */
    function parseRange(index, dimSize) {
        if (index.indexOf(':') >= 0) {
            // Range indexing;
            var res = index.split(/\s*:\s*/);

            var start = parseInt(res[0] || 0);
            var end = parseInt(res[1] || dimSize);
            // Negtive offset
            if (start < 0) {
                start = dimSize + start;
            }
            // Negtive offset
            if (end < 0) {
                end = dimSize + end;
            }
            // Clamp to [0-dimSize)
            start = Math.max(Math.min(dimSize, start), 0);
            // Clamp to [0-dimSize]
            end = Math.max(Math.min(dimSize, end), 0);
            return [start, end];
        } else {
            var start = parseInt(index);
            // Negtive offset
            if (start < 0) {
                start = dimSize + start;
            }
            if (start < 0 || start > dimSize) {
                throw new Error('Index ' + index + ' out of bounds');
            }
            // Clamp to [0-dimSize-1]
            start = Math.max(Math.min(dimSize-1, start), 0);
            return [start, start+1];
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
    };

    function getShape(array) {
        var shape = [array.length];
        var el = array[0];
        while (el instanceof Array) {
            shape.push(el.length);
            el = el[0];
        }
        return shape;
    };

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