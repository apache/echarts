/**
 * eventRiver 布局算法
 * @module echarts/layout/eventRiver
 * @author clmtulip  (车丽美, clmtulip@gmail.com)
 */
define(function(require) {

    function eventRiverLayout(series, intervalX, area) {
        var space = 4;
        var scale = intervalX;

        function importanceSort(a, b) {
            var x = a.importance;
            var y = b.importance;
            return ((x > y) ? -1 : ((x < y) ? 1 : 0));
        }

        /**
         * 查询数组中元素的index
         */
        function indexOf(array, value) {
            if (array.indexOf) {
                return array.indexOf(value);
            }
            for (var i = 0, len = array.length; i < len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
            return -1;
        }

        // step 0. calculate event importance and sort descending
        for (var i = 0; i < series.length; i++) {
            for (var j = 0; j < series[i].data.length; j++) {
                if (series[i].data[j].weight == null) {
                    series[i].data[j].weight = 1;
                }
                var importance = 0;
                for (var k = 0; k < series[i].data[j].evolution.length; k++) {
                    importance += series[i].data[j].evolution[k].valueScale;
                }
                series[i].data[j].importance = importance * series[i].data[j].weight;
            }
            series[i].data.sort(importanceSort);
        }

        // step 1. 计算每个group的重要值importance，并按递减顺序排序
        for (var i = 0; i < series.length; i++) {
            if (series[i].weight == null) {
                series[i].weight = 1;
            }
            var importance = 0;
            for (var j = 0; j < series[i].data.length; j++) {
                importance += series[i].data[j].weight;
            }
            series[i].importance = importance * series[i].weight;
        }
        // 根据importance对groups进行递减排序
        series.sort(importanceSort);

        // step 3. set bubble positions in group order, then in event order
        // 找到包含所有事件的时间段，即最小和最大时间点
        var minTime = Number.MAX_VALUE;
        var maxTime = 0;
        for (var i = 0; i < series.length; i++) {
            for (var j = 0; j < series[i].data.length; j++) {
                for (var k = 0; k < series[i].data[j].evolution.length; k++) {
                    var time = series[i].data[j].evolution[k].timeScale;
                    minTime = Math.min(minTime, time);
                    maxTime = Math.max(maxTime, time);
                }
            }
        }
        //console.log('minTime: ' + minTime);
        //console.log('maxTime: ' + maxTime);

        // 时间范围 即 x轴显示的起始范围
        minTime = ~~minTime;
        maxTime = ~~maxTime;

        // 气泡之间的间隙
        var flagForOffset = (function () {

            var length = maxTime - minTime + 1 + (~~intervalX);
            if (length <= 0){
                return [0];
            }
            var result = [];
            while (length--){
                result.push(0);
            }
            return result;
        })();

        var flagForPos = flagForOffset.slice(0);

        var bubbleData = [];
        var totalMaxy = 0;
        var totalOffset = 0;

        for (var i = 0; i < series.length; i++) {
            for (var j = 0; j < series[i].data.length; j++) {
                var e = series[i].data[j];
                e.time = [];
                e.value = [];
                var tmp;
                var maxy = 0;
                for (var k = 0; k < series[i].data[j].evolution.length; k++) {
                    tmp = series[i].data[j].evolution[k];
                    e.time.push(tmp.timeScale);
                    e.value.push(tmp.valueScale);
                    maxy = Math.max(maxy, tmp.valueScale);
                }

                // 边界计算
                bubbleBound(e, intervalX, minTime);

                // 得到可以放置的位置
                e.y = findLocation(flagForPos, e, function (e, index){return e.ypx[index];});
                // 得到偏移量
                e._offset = findLocation(flagForOffset, e, function (){ return space;});

                totalMaxy = Math.max(totalMaxy, e.y + maxy);
                totalOffset = Math.max(totalOffset, e._offset);

                bubbleData.push(e);
            }
        }

        // 映射到显示区域内
        scaleY(bubbleData, area, totalMaxy, totalOffset);
    }

    /**
     * 映射到显示区域内
     */
    function scaleY(bubbleData, area, maxY, offset) {
        var height = area.height;
        var offsetScale = offset / height > 0.5 ? 0.5 : 1;

        var yBase = area.y;
        var yScale = (area.height - offset) / maxY;

        for (var i = 0, length = bubbleData.length; i < length; i++){
            var e = bubbleData[i];
            e.y = yBase + yScale * e.y + e._offset * offsetScale;

            delete e.time;
            delete e.value;
            delete e.xpx;
            delete e.ypx;
            delete e._offset;

            // 修改值域范围
            var evolutionList = e.evolution;
            for (var k = 0, klen = evolutionList.length; k < klen; k++) {
                evolutionList[k].valueScale *= yScale;
            }
        }
    }


    /**
     * 得到两点式的方程函数 y = k*x + b
     * @param {number} x0 起点横坐标
     * @param {number} y0 起点纵坐标
     * @param {number} x1 终点横坐标
     * @param {number} y1 终点纵坐标
     * @returns {Function} 输入为横坐标 返回纵坐标s
     */
    function line(x0, y0, x1, y1){

        // 横坐标相同,应该抛出错误
        if (x0 === x1) {
            throw new Error('x0 is equal with x1!!!');
        }

        // 纵坐标相同
        if (y0 === y1) {
            return function () {
                return y0;
            }
        }

        var k = (y0 - y1) / (x0 - x1);
        var b = (y1 * x0 - y0 * x1) / (x0 - x1);

        return function (x) {
            return k * x + b;
        }
    }

    /**
     * 计算当前气泡的值经过的边界
     * @param {object} e 气泡的值
     * @param {array} e.time 时间范围
     * @param {array} e.value 值域范围
     * @param {number} intervalX 气泡尾巴长度
     */
    function bubbleBound(e, intervalX, minX){
        var space = ~~intervalX;
        var length = e.time.length;

        e.xpx = [];
        e.ypx = [];

        var i = 0;
        var x0 = 0;
        var x1 = 0;
        var y0 = 0;
        var y1 = 0;
        var newline;
        for(; i < length; i++){

            x0 = ~~e.time[i];
            y0 = e.value[i] / 2;

            if (i === length - 1) {
                // i = length - 1  ~  += intervalX
                x1 = x0 + space;
                y1 = 0;
            } else {
                x1 = ~~(e.time[i + 1]);
                y1 = e.value[i + 1] / 2;
            }

            // to line
            newline = line(x0, y0, x1, y1);
            //
            for (var x = x0; x < x1; x++){
                e.xpx.push(x - minX);
                e.ypx.push(newline(x));
            }
        }

        e.xpx.push(x1 - minX);
        e.ypx.push(y1);
    }

    function findLocation(flags, e, yvalue){
        var pos = 0;

        var length = e.xpx.length;
        var i = 0;
        var y;
        for(; i < length; i++){
            y = yvalue(e, i);
            pos = Math.max(pos, y + flags[e.xpx[i]]);
        }

        // reset flags
        for(i = 0; i < length; i++){
            y = yvalue(e, i);
            flags[e.xpx[i]] = pos + y;
        }

        return pos;
    }

    return eventRiverLayout;
});
