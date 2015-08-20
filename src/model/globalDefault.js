define({
    // 全图默认背景
    backgroundColor: 'rgba(0,0,0,0)',

    // 默认色板
    color: ['#ff7f50','#87cefa','#da70d6','#32cd32','#6495ed',
            '#ff69b4','#ba55d3','#cd5c5c','#ffa500','#40e0d0',
            '#1e90ff','#ff6347','#7b68ee','#00fa9a','#ffd700',
            '#6699FF','#ff6666','#3cb371','#b8860b','#30e0e0'],

    // 默认需要 Grid 配置项
    grid: {},

    EVENT: {
        // -------全局通用
        REFRESH: 'refresh',
        RESTORE: 'restore',
        RESIZE: 'resize',
        CLICK: 'click',
        DBLCLICK: 'dblclick',
        HOVER: 'hover',
        MOUSEOUT: 'mouseout',
        // -------业务交互逻辑
        DATA_CHANGED: 'dataChanged',
        DATA_ZOOM: 'dataZoom',
        DATA_RANGE: 'dataRange',
        DATA_RANGE_SELECTED: 'dataRangeSelected',
        DATA_RANGE_HOVERLINK: 'dataRangeHoverLink',
        LEGEND_SELECTED: 'legendSelected',
        LEGEND_HOVERLINK: 'legendHoverLink',
        MAP_SELECTED: 'mapSelected',
        PIE_SELECTED: 'pieSelected',
        MAGIC_TYPE_CHANGED: 'magicTypeChanged',
        DATA_VIEW_CHANGED: 'dataViewChanged',
        TIMELINE_CHANGED: 'timelineChanged',
        MAP_ROAM: 'mapRoam',
        FORCE_LAYOUT_END: 'forceLayoutEnd',
        // -------内部通信
        TOOLTIP_HOVER: 'tooltipHover',
        TOOLTIP_IN_GRID: 'tooltipInGrid',
        TOOLTIP_OUT_GRID: 'tooltipOutGrid',
        ROAMCONTROLLER: 'roamController'
    },
    // 主题，默认标志图形类型列表
    symbolList: [
        'circle', 'rectangle', 'triangle', 'diamond',
        'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond'
    ],
    animation: true,                // 过渡动画是否开启
    addDataAnimation: true,         // 动态数据接口是否开启动画效果
    animationThreshold: 2000,       // 动画元素阀值，产生的图形原素超过2000不出动画
    animationDuration: 2000,        // 过渡动画参数：进入
    animationDurationUpdate: 500,   // 过渡动画参数：更新
    animationEasing: 'ExponentialOut'    //BounceOut
});