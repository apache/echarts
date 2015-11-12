define(function () {
    var platform = navigator.platform || '';
    return {
        // 全图默认背景
        backgroundColor: 'rgba(0,0,0,0)',

        // 默认色板
        // color: ['#ff7f50','#87cefa','#da70d6','#32cd32','#6495ed',
        //         '#ff69b4','#ba55d3','#cd5c5c','#ffa500','#40e0d0',
        //         '#1e90ff','#ff6347','#7b68ee','#00fa9a','#ffd700',
        //         '#6699FF','#ff6666','#3cb371','#b8860b','#30e0e0'],

        // https://dribbble.com/shots/1065960-Infographic-Pie-chart-visualization
        color: ['#5793f3', '#d14a61', '#fd9c35', '#675bba', '#fec42c',
                '#dd4444', '#d4df5a', '#cd4870'],

        // 默认需要 Grid 配置项
        grid: {},

        // 主题，主题
        textStyle: {
            decoration: 'none',
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
        animationEasing: 'cubicOut'    //BounceOut
    };
});