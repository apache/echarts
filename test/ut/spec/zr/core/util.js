describe('zrUtil', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare(['zrender/core/util']);

    describe('merge', function () {

        testCase('basic', function (zrUtil) {
            expect(zrUtil.merge({}, {a: 121})).toEqual({a: 121});
            expect(zrUtil.merge({a: 'zz'}, {a: '121'}, true)).toEqual({a: '121'});
            expect(zrUtil.merge({a: 'zz', b: {c: 1212}}, {b: {c: 'zxcv'}}, true)).toEqual({a: 'zz', b: {c: 'zxcv'}});
        });
        testCase('overwrite', function (zrUtil) {
            expect(zrUtil.merge({a: {b: 'zz'}}, {a: '121'}, true)).toEqual({a: '121'});
            expect(zrUtil.merge({a: null}, {a: '121'}, true)).toEqual({a: '121'});
            expect(zrUtil.merge({a: '12'}, {a: null}, true)).toEqual({a: null});
            expect(zrUtil.merge({a: {a: 'asdf'}}, {a: undefined}, true)).toEqual({a: undefined});
            var b = {b: 'vvv'}; // not same object
            var result = zrUtil.merge({a: null}, {a: b}, true);
            expect(result).toEqual({a: {b: 'vvv'}});
            expect(result.a === b).toEqual(false);
        });
        testCase('not_overwrite', function (zrUtil) {
            expect(zrUtil.merge({a: {b: 'zz'}}, {a: '121'}, false)).toEqual({a: {b: 'zz'}});
            expect(zrUtil.merge({a: null}, {a: '121'}, false)).toEqual({a: null});
            expect(zrUtil.merge({a: '12'}, {a: null}, false)).toEqual({a: '12'});
            expect(zrUtil.merge({a: {a: 'asdf'}}, {a: undefined}, false)).toEqual({a: {a: 'asdf'}});
        });
        testCase('array', function (zrUtil) {
            expect(zrUtil.merge({a: {a: 'asdf'}}, {a: ['asdf', 'zxcv']}, true)).toEqual({a: ['asdf', 'zxcv']});
            expect(zrUtil.merge({a: {a: [12, 23, 34]}}, {a: {a: [99, 88]}}, false)).toEqual({a: {a: [12, 23, 34]}});
            var b = [99, 88]; // not same object
            var result = zrUtil.merge({a: {a: [12, 23, 34]}}, {a: {a: b}}, true);
            expect(result).toEqual({a: {a: b}});
            expect(result.a.a === b).toEqual(false);
        });
        testCase('null_undefined', function (zrUtil) {
            expect(zrUtil.merge(null, {a: '121'})).toEqual(null);
            expect(zrUtil.merge(undefined, {a: '121'})).toEqual(undefined);
            expect(zrUtil.merge({a: '121'}, null)).toEqual({a: '121'});
            expect(zrUtil.merge({a: '121'}, undefined)).toEqual({a: '121'});
        });
    });

    describe('clone', function () {

        testCase('primary', function (zrUtil) {
            expect(zrUtil.clone(null)).toEqual(null);
            expect(zrUtil.clone(undefined)).toEqual(undefined);
            expect(zrUtil.clone(11)).toEqual(11);
            expect(zrUtil.clone('11')).toEqual('11');
            expect(zrUtil.clone('aa')).toEqual('aa');
        });

        testCase('array', function (zrUtil) {
            var ins;

            exp(
                zrUtil.clone(ins = [1, '2', 'a', 4, {x: 'r', y: [2, 3]}]),
                [1, '2', 'a', 4, {x: 'r', y: [2, 3]}],
                ins
            );
            exp(
                zrUtil.clone(ins = {a: [1, '2', 'a', 4, {x: 'r', y: [2, 3]}]}).a,
                [1, '2', 'a', 4, {x: 'r', y: [2, 3]}],
                ins
            );
            exp(
                zrUtil.clone(ins = {a: [1, [1, '2', 'a', 4, {x: 'r', y: [2, 3]}]]}).a[1],
                [1, '2', 'a', 4, {x: 'r', y: [2, 3]}],
                ins
            );

            function exp(cloned, target, source) {
                expect(cloned).toEqual(target) && source !== source;
            }
        });

        testCase('object', function (zrUtil) {
            var ins;

            exp(
                zrUtil.clone(ins = {x: 1, y: [2, 3], z: {a: 3}}),
                {x: 1, y: [2, 3], z: {a: 3}},
                ins
            );
            exp(
                zrUtil.clone(ins = {a: {x: 1, y: [2, 3], z: {a: 3}}}).a,
                {x: 1, y: [2, 3], z: {a: 3}},
                ins
            );
            exp(
                zrUtil.clone(ins = {a: [1, {x: 1, y: [2, 3], z: {a: 3}}]}).a[1],
                {x: 1, y: [2, 3], z: {a: 3}},
                ins
            );

            function exp(cloned, target, source) {
                expect(cloned).toEqual(target) && source !== source;
            }
        });

        testCase('built-in', function (zrUtil) {
            var source = [
                new Date(),
                function () {},
                /asdf/,
                new Error(),
                new Image(),
                document.createElement('canvas').getContext('2d').createLinearGradient(0, 0, 0, 0),
                document.createElement('canvas').getContext('2d').createPattern(new Image(), 'repeat')
            ];

            for (var i = 0; i < source.length; i++) {
                var d = source[i];
                expect(zrUtil.clone(d) === d).toEqual(true);
                expect(zrUtil.clone({a: d}).a === d).toEqual(true);
                expect(zrUtil.clone({a: [1, d]}).a[1] === d).toEqual(true);
            }
        });

        testCase('TypedArray', function (zrUtil) {
            var types = [
                Int8Array,
                Uint8Array,
                Uint8ClampedArray,
                Int16Array,
                Uint16Array,
                Int32Array,
                Uint32Array,
                Float32Array,
                Float64Array
            ];

            for (var i = 0; i < types.length; i++) {
                var d = new types[i](3);
                d[0] = 1;
                d[2] = 2;
                expect(typedArrayExpect(d, zrUtil.clone(d))).toEqual(true);
                expect(typedArrayExpect(d, zrUtil.clone({a: d}).a)).toEqual(true);
                expect(typedArrayExpect(d, zrUtil.clone({a: [1, d]}).a[1])).toEqual(true);
            }

            function typedArrayExpect(a, b) {
                if (a === b) {
                    return false;
                }
                var typeStrA = Object.prototype.toString.call(a);
                var typeStrB = Object.prototype.toString.call(b);
                if (typeStrA !== typeStrB || a.length !== b.length) {
                    return false;
                }
                for (var i = 0; i < a.length; i++) {
                    if (a[i] !== b[i]) {
                        return false;
                    }
                }
                return true;
            }
        });

        testCase('user_defined_class', function (zrUtil) {
            var Clz = function (v) {
                this.bb = v;
            };
            Clz.prototype.aa = 1;
            var ins;

            exp(zrUtil.clone(ins = new Clz(2)), {bb: 2}, ins);
            exp(zrUtil.clone(ins = {a: new Clz(2)}).a, {bb: 2}, ins);
            exp(zrUtil.clone(ins = {a: [1, new Clz(2)]}).a[1], {bb: 2}, ins);

            function exp(cloned, target, source) {
                expect(cloned).toEqual(target) && source !== source;
            }
        });

    });
});