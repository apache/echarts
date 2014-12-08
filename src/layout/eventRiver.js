/**
 * eventRiver 布局算法
 * @module echarts/layout/eventRiver
 * @author clmtulip  (车丽美, clmtulip@gmail.com)
 */
define(function(require) {
    function eventRiverLayout(series, intervalX, area) {
        var space = 5;
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
            for (var j = 0; j < series[i].eventList.length; j++) {
                if (series[i].eventList[j].weight == null) {
                    series[i].eventList[j].weight = 1;
                }
                var importance = 0;
                for (var k = 0; k < series[i].eventList[j].evolution.length; k++) {
                    importance += series[i].eventList[j].evolution[k].valueScale;
                }
                series[i].eventList[j].importance = importance * series[i].eventList[j].weight;
            }
            series[i].eventList.sort(importanceSort);
        }
        
        // step 1. 计算每个group的重要值importance，并按递减顺序排序
        for (var i = 0; i < series.length; i++) {
            if (series[i].weight == null) {
                series[i].weight = 1;
            }
            var importance = 0;
            for (var j = 0; j < series[i].eventList.length; j++) {
                importance += series[i].eventList[j].weight;
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
            for (var j = 0; j < series[i].eventList.length; j++) {
                for (var k = 0; k < series[i].eventList[j].evolution.length; k++) {
                    var time = series[i].eventList[j].evolution[k].timeScale;
                    minTime = Math.min(minTime, time);
                    maxTime = Math.max(maxTime, time);
                }
            }
        }
        // console.log('minTime: ' + minTime);
        // console.log('maxTime: ' + maxTime);
        
        // 建立线段树根节点
        var root = segmentTreeBuild(Math.floor(minTime), Math.ceil(maxTime));

        var totalMaxY = 0;
        for (var i = 0; i < series.length; i++) {
            for (var j = 0; j < series[i].eventList.length; j++) {
                var e = series[i].eventList[j];
                e.time = [];
                e.value = [];
                for (var k = 0; k < series[i].eventList[j].evolution.length; k++) {
                    e.time.push(series[i].eventList[j].evolution[k].timeScale);
                    e.value.push(series[i].eventList[j].evolution[k].valueScale);
                }

                var mxIndex = indexOf(e.value, Math.max.apply(Math, e.value));
                var maxY = segmentTreeQuery(root, e.time[mxIndex], e.time[mxIndex + 1]);
                var k = 0;
                e.y = maxY + e.value[mxIndex] / 2 + space;
                // 检测overlap，调整event.y
                for (k = 0; k < e.time.length - 1; k++) {
                    var curMaxY = segmentTreeQuery(root, e.time[k], e.time[k + 1]);
                    if (e.y - e.value[k] / 2 - space < curMaxY) {
                        e.y = curMaxY + e.value[k] / 2  + space;
                    }
                }
                var curMaxY = segmentTreeQuery(root, e.time[k], e.time[k] + scale);
                if (e.y - e.value[k] / 2 - space < curMaxY) {
                    e.y = curMaxY + e.value[k] / 2 + space;
                }
                series[i].y = e.y;
                
                totalMaxY = Math.max(totalMaxY, e.y + e.value[mxIndex] / 2);
                
                // 确定位置后更新线段树
                for (k = 0; k < e.time.length - 1; k++) {
                    segmentTreeInsert(root, e.time[k], e.time[k+1], e.y + e.value[k] / 2);
                }
                segmentTreeInsert(root, e.time[k], e.time[k] + scale, e.y + e.value[k] / 2);
            }
        }
        
        // 映射到显示区域内
        scaleY(series, area, totalMaxY, space);
    }
    
    /**
     * 映射到显示区域内 
     * @param {Object} series
     * @param {Object} area
     */
    function scaleY(series, area, maxY, space) {
        var yBase = area.y;
        var yScale = (area.height - space) / maxY;
        for (var i = 0; i < series.length; i++) {
            series[i].y = series[i].y * yScale + yBase;
            var eventList = series[i].eventList;
            for (var j = 0; j < eventList.length; j++) {
                eventList[j].y = eventList[j].y * yScale + yBase;
                var evolutionList = eventList[j].evolution;
                for (var k = 0; k < evolutionList.length; k++) {
                    evolutionList[k].valueScale *= yScale * 1;
                }
            }
            
        }
    }

    function segmentTreeBuild(left, right) {
        var root = {
            'left': left,
            'right': right,
            'leftChild': null,
            'rightChild': null,
            'maxValue': 0
        };
        
        if (left + 1 < right) {
            var mid = Math.round( (left + right) / 2);
            root.leftChild = segmentTreeBuild(left, mid);
            root.rightChild = segmentTreeBuild(mid, right);
        }
        
        return root;
    }

    function segmentTreeQuery(root, left, right) {
        if (right - left < 1) {
            return 0;
        }

        var mid = Math.round( (root.left + root.right) / 2);
        var result = 0;
        
        if (left == root.left && right == root.right) {
            result = root.maxValue;
        }
        else if (right <= mid && root.leftChild != null) {
            result = segmentTreeQuery(root.leftChild, left, right);
        }
        else if (left >= mid && root.rightChild != null) {
            result = segmentTreeQuery(root.rightChild, left, right);
        }
        else {
            var leftValue = 0;
            var rightValue = 0;
            if (root.leftChild != null) {
                leftValue = segmentTreeQuery(root.leftChild, left, mid);
            }
            if (root.rightChild != null) {
                rightValue = segmentTreeQuery(root.rightChild, mid, right);
            }
            result = leftValue > rightValue ? leftValue : rightValue;
        }
        return result;
    }

    // 插入和更新线段树
    function segmentTreeInsert(root, left, right, value) {
        if (root == null) {
            return ;
        }
        var mid = Math.round( (root.left + root.right) / 2);
        root.maxValue = root.maxValue > value ? root.maxValue : value;

        if (Math.floor(left * 10) == Math.floor(root.left * 10) 
            && Math.floor(right * 10) == Math.floor(root.right * 10)
        ) {
            return;
        }
        else if (right <= mid) {
            segmentTreeInsert(root.leftChild, left, right, value);
        }
        else if (left >= mid) {
            segmentTreeInsert(root.rightChild, left, right, value);
        }
        else {
            segmentTreeInsert(root.leftChild, left, mid, value);
            segmentTreeInsert(root.rightChild, mid, right, value);
        }
    }
    
    return eventRiverLayout;
});