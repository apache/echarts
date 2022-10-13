## 百度地图扩展

ECharts 百度地图扩展，可以在百度地图上展现 [点图](https://echarts.apache.org/zh/option.html#series-scatter)，[线图](https://echarts.apache.org/zh/option.html#series-lines)，[热力图](https://echarts.apache.org/zh/option.html#series-heatmap) 等可视化。


### 示例

[全国主要城市空气质量](https://echarts.apache.org/examples/zh/editor.html?c=effectScatter-bmap)

[北京公交路线](https://echarts.apache.org/examples/zh/editor.html?c=lines-bmap-bus)

[北京公交路线特效](https://echarts.apache.org/examples/zh/editor.html?c=lines-bmap-effect)

[杭州热门步行路线](https://echarts.apache.org/examples/zh/editor.html?c=heatmap-bmap)

[在地图上显示分箱图](https://echarts.apache.org/examples/zh/editor.html?c=map-bin)


### 引入

可以直接引入打包好的扩展文件和百度地图的 jssdk

```html
<!-- 引入百度地图的 JS SDK，这里需要使用你在百度地图开发者平台申请的 ak -->
<!-- 如需使用百度地图 2.0 版本，请将 `v=3.0` 改为 `v=2.0` -->
<script src="https://api.map.baidu.com/api?v=3.0&ak="></script>
<!-- 引入 ECharts -->
<script src="dist/echarts.min.js"></script>
<!-- 引入百度地图扩展 -->
<script src="dist/extension/bmap.min.js"></script>
```

如果是 webpack 打包，也可以 require 引入

```js
require('echarts');
require('echarts/extension/bmap/bmap');
```

插件会自动注册相应的组件。

### 使用

扩展主要提供了跟 geo 一样的坐标系和底图的绘制，因此配置方式非常简单，如下

```js
option = {
    // 加载 bmap 组件
    bmap: {
        // 百度地图中心经纬度。默认为 [104.114129, 37.550339]。
        center: [120.13066322374, 30.240018034923],
        // 百度地图缩放级别。默认为 5。
        zoom: 14,
        // 是否开启拖拽缩放，可以只设置 'scale' 或者 'move'。默认关闭。
        roam: true,
        // 百度地图的旧版自定义样式，见 https://lbsyun.baidu.com/custom/index.htm
        mapStyle: {},
        // 百度地图 3.0 之后的新版自定义样式，见 https://lbsyun.baidu.com/index.php?title=open/custom
        mapStyleV2: {},
        // 百度地图的初始化配置，见 https://lbsyun.baidu.com/cms/jsapi/reference/jsapi_reference.html#a0b1
        mapOptions: {
            // 禁用百度地图自带的底图可点功能
            enableMapClick: false
        }
    },
    series: [{
        type: 'scatter',
        // 使用百度地图坐标系
        coordinateSystem: 'bmap',
        // 数据格式跟在 geo 坐标系上一样，每一项都是 [经度，纬度，数值大小，其它维度...]
        data: [ [120, 30, 1] ],
        // 编码数据项中第三个元素作为 value 维度
        encode: {
            value: 2
        }
    }]
}

// 获取百度地图实例，使用百度地图自带的控件
var bmap = chart.getModel().getComponent('bmap').getBMap();
bmap.addControl(new BMap.MapTypeControl());
```


