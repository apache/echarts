/**
 * TreeMap layout
 * @module echarts/layout/TreeMap
 * @author loutongbing(loutongbing@126.com)
 */
define(function (require) {

    function TreeMapLayout(opts) {
        /**
         * areas 每个子矩形面积
         * x 父矩形横坐标
         * y 父矩形横坐标
         * width 父矩形宽
         * height 父矩形高
        */
        var row = {
            x: opts.x,
            y: opts.y,
            width: opts.width,
            height: opts.height
        };

        this.x = opts.x;
        this.y = opts.y;
        this.width = opts.width;
        this.height = opts.height;
    }

    TreeMapLayout.prototype.run = function (areas) {
        var out = [];

        this._squarify(areas, {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }, out);

        return out;
    };

    TreeMapLayout.prototype._squarify = function (areas, row, out) {
        var layoutDirection = 'VERTICAL';
        var width = row.width;
        var height = row.height;
        if (row.width < row.height) {
            layoutDirection = 'HORIZONTAL';
            width = row.height;
            height = row.width;
        }
        // 把考虑方向与位置的因素剥离出来，只考虑怎么排列，运行完毕之后再修正
        var shapeArr = this._getShapeListInAbstractRow(
            areas, width, height
        );
        // 首先换算出虚拟的x、y坐标
        for (var i = 0; i < shapeArr.length; i++) {
            shapeArr[i].x = 0;
            shapeArr[i].y = 0;
            for (var j = 0; j < i; j++) {
                shapeArr[i].y += shapeArr[j].height;
            }
        }
        var nextRow = {};
        // 根据虚拟的shapeArr计算真实的小矩形
        if (layoutDirection == 'VERTICAL') {
            for (var k = 0; k < shapeArr.length; k++) {
                out.push(
                    {
                        x: shapeArr[k].x + row.x,
                        y: shapeArr[k].y + row.y,
                        width: shapeArr[k].width,
                        height: shapeArr[k].height
                    }
                );
            }
            nextRow = {
                x: shapeArr[0].width + row.x,
                y: row.y,
                width: row.width - shapeArr[0].width,
                height: row.height
            };
        }
        else {
            for (var l = 0; l < shapeArr.length; l++) {
                out.push(
                    {
                        x: shapeArr[l].y + row.x,
                        y: shapeArr[l].x + row.y,
                        width: shapeArr[l].height,
                        height: shapeArr[l].width
                    }
                );
            }
            nextRow = {
                x: row.x,
                y: row.y + shapeArr[0].width,  // 注意是虚拟形状下的width
                width: row.width,
                height: row.height - shapeArr[0].width // 注意是虚拟形状下的width
            };
        }
        // 下一步的矩形数组要剔除已经填充过的矩形
        var nextAreaArr = areas.slice(shapeArr.length);
        if (nextAreaArr.length === 0) {
            return;
        }
        else {
            this._squarify(
                nextAreaArr,
                nextRow,
                out
            );
        }
    };
    TreeMapLayout.prototype._getShapeListInAbstractRow = function (
        areas,
        width,
        height
    ) {
        // 如果只剩下一个了，直接返回
        if (areas.length === 1) {
            return [
                {
                    width: width,
                    height: height
                }
            ];
        }
        // 填充进入的个数，从填充一个开始到填充所有小矩形，
        // 纵横比最优时break并保留结果
        for (var count = 1; count < areas.length; count++) {

            var shapeArr0 = this._placeFixedNumberRectangles(
                areas.slice(0, count),
                width,
                height
            );
            var shapeArr1 = this._placeFixedNumberRectangles(
                areas.slice(0, count + 1),
                width,
                height
            );
            if (this._isFirstBetter(shapeArr0, shapeArr1)) {
                return shapeArr0;
            }
        }
    };

    // 确定数量进行填充
    TreeMapLayout.prototype._placeFixedNumberRectangles = function (
        areaSubArr,
        width,
        height
    ) {
        var count = areaSubArr.length;
        // 声明返回值-每个矩形的形状（长宽）之数组
        // 例如：
        /*[
            {
                width: 11
                height: 12
            },
            {
                width: 11
                height: 22
            }
        ]*/
        var shapeArr = [];

        // 求出面积总和
        var sum = 0;
        for (var i = 0; i < areaSubArr.length; i++) {
            sum += areaSubArr[i];
        }
        var cellWidth = sum / height;
        for (var j = 0; j < count; j++) {
            var cellHeight = height * areaSubArr[j] / sum;
            shapeArr.push(
                {
                    width: cellWidth,
                    height: cellHeight
                }
            );
        }
        return shapeArr;
    };
    // 相邻的两种填充方式放进去，比较是不是前一个的纵横比较小
    TreeMapLayout.prototype._isFirstBetter = function (
        shapeArr0,
        shapeArr1
    ) {
        var ratio0 = shapeArr0[0].height / shapeArr0[0].width;
        ratio0 = (ratio0 > 1) ? 1 / ratio0 : ratio0;
        var ratio1 =  shapeArr1[0].height / shapeArr1[0].width;
        ratio1 = (ratio1 > 1) ? 1 / ratio1 : ratio1;
        if (Math.abs(ratio0 - 1) <= Math.abs(ratio1 - 1)) {
            return true;
        }
        return false;
    };

    return TreeMapLayout;
});