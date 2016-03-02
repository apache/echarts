define(function () {
    var platform = '';
    // Navigator not exists in node
    if (typeof navigator !== 'undefined') {
        platform = navigator.platform || '';
    }
    return {
        // 全图默认背景
        // backgroundColor: 'rgba(0,0,0,0)',

        // https://dribbble.com/shots/1065960-Infographic-Pie-chart-visualization
        // color: ['#5793f3', '#d14a61', '#fd9c35', '#675bba', '#fec42c', '#dd4444', '#d4df5a', '#cd4870'],
        // 浅色
        // color: ['#bcd3bb', '#e88f70', '#edc1a5', '#9dc5c8', '#e1e8c8', '#7b7c68', '#e5b5b5', '#f0b489', '#928ea8', '#bda29a'],
        // color: ['#cc5664', '#9bd6ec', '#ea946e', '#8acaaa', '#f1ec64', '#ee8686', '#a48dc1', '#5da6bc', '#b9dcae'],
        // 深色
        color: ['#c23531','#2f4554', '#61a0a8', '#d48265', '#91c7ae','#749f83',  '#ca8622', '#bda29a','#6e7074', '#546570', '#c4ccd3'],

        // 默认需要 Grid 配置项
        grid: {},
        // 主题，主题
        textStyle: {
            // color: '#000',
            // decoration: 'none',
            // PENDING
            fontFamily: platform.match(/^Win/) ? 'Microsoft YaHei' : 'sans-serif',
            // fontFamily: 'Arial, Verdana, sans-serif',
            fontSize: 12,
            fontStyle: 'normal',
            fontWeight: 'normal'
        },
        // 主题，默认标志图形类型列表
        // symbolList: [
        //     'circle', 'rectangle', 'triangle', 'diamond',
        //     'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond'
        // ],
        animation: true,                // 过渡动画是否开启
        animationThreshold: 2000,       // 动画元素阀值，产生的图形原素超过2000不出动画
        animationDuration: 1000,        // 过渡动画参数：进入
        animationDurationUpdate: 300,   // 过渡动画参数：更新
        animationEasing: 'exponentialOut',    //BounceOut
        animationEasingUpdate: 'cubicOut'
    };
});