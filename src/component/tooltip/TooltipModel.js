import * as echarts from '../../echarts';

export default echarts.extendComponentModel({

    type: 'tooltip',

    dependencies: ['axisPointer'],

    defaultOption: {
        zlevel: 0,

        z: 8,

        show: true,

        // tooltip主体内容
        showContent: true,

        // 'trigger' only works on coordinate system.
        // 'item' | 'axis' | 'none'
        trigger: 'item',

        // 'click' | 'mousemove' | 'none'
        triggerOn: 'mousemove|click',

        alwaysShowContent: false,

        displayMode: 'single', // 'single' | 'multipleByCoordSys'

        // 位置 {Array} | {Function}
        // position: null
        // Consider triggered from axisPointer handle, verticalAlign should be 'middle'
        // align: null,
        // verticalAlign: null,

        // 是否约束 content 在 viewRect 中。默认 false 是为了兼容以前版本。
        confine: false,

        // 内容格式器：{string}（Template） ¦ {Function}
        // formatter: null

        showDelay: 0,

        // 隐藏延迟，单位ms
        hideDelay: 100,

        // 动画变换时间，单位s
        transitionDuration: 0.4,

        enterable: false,

        // 提示背景颜色，默认为透明度为0.7的黑色
        backgroundColor: 'rgba(50,50,50,0.7)',

        // 提示边框颜色
        borderColor: '#333',

        // 提示边框圆角，单位px，默认为4
        borderRadius: 4,

        // 提示边框线宽，单位px，默认为0（无边框）
        borderWidth: 0,

        // 提示内边距，单位px，默认各方向内边距为5，
        // 接受数组分别设定上右下左边距，同css
        padding: 5,

        // Extra css text
        extraCssText: '',

        // 坐标轴指示器，坐标轴触发有效
        axisPointer: {
            // 默认为直线
            // 可选为：'line' | 'shadow' | 'cross'
            type: 'line',

            // type 为 line 的时候有效，指定 tooltip line 所在的轴，可选
            // 可选 'x' | 'y' | 'angle' | 'radius' | 'auto'
            // 默认 'auto'，会选择类型为 category 的轴，对于双数值轴，笛卡尔坐标系会默认选择 x 轴
            // 极坐标系会默认选择 angle 轴
            axis: 'auto',

            animation: 'auto',
            animationDurationUpdate: 200,
            animationEasingUpdate: 'exponentialOut',

            crossStyle: {
                color: '#999',
                width: 1,
                type: 'dashed',

                // TODO formatter
                textStyle: {}
            }

            // lineStyle and shadowStyle should not be specified here,
            // otherwise it will always override those styles on option.axisPointer.
        },
        textStyle: {
            color: '#fff',
            fontSize: 14
        }
    }
});