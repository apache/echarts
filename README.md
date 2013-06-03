ECharts
=======
http://ecomfe.github.com/echarts

基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。创新的拖拽重计算、数据视图等特性大大增强了用户体验，赋予了用户对数据进行挖掘、整合的能力。

<p style="text-align:right;"><strong>———— 大数据时代，重新定义数据图表的时候到了</strong></p>

Architecture
------------
ECharts (Enterprise Charts 商业产品图表库)

提供商业产品常用图表库，底层基于ZRender，创建了坐标系，图例，提示，工具箱等基础组件，并在此上构建出折线图（区域图）、柱状图（条状图）、饼图（环形图），同时支持任意维度的堆积和多图表混合展现。

<div style="float:left;margin:10px 10px 30px 10px;"><img src="doc/asset/img/device.png" /></div>
<div>
    <img src="doc/asset/img/explorer.png" />
    <p>&nbsp;&nbsp;<i>(IE8- supported by <a href="https://code.google.com/p/explorercanvas/" target="_blank">excanvas</a> )</i></p>
</div>

![ECharts Architecture](doc/asset/img/architecture.png)

特色
----
### 混搭
标准图库支持3种基本图表类型及其任意混搭：

折线图line（包含区域图）、柱状图bar（包含横向条状图）、饼图pie。（散点图scatter、雷达图radar，暂不提供）

混搭情况下一个标准图表：包含唯一图例模块，一个直角坐标系（可包含一条或多条类目轴线，一条或多条值轴线，最多上下左右四条）

![ECharts 混搭](doc/asset/img/mix.jpg)

### 拖拽重计算
拖拽重计算特性（已申请专利）带来了数据统计图表从未有过的用户体验，允许用户对统计数据进行有效的提取、整合，甚至在多个图表间交换数据，赋予了用户对数据进行挖掘、整合的能力。

![ECharts 拖拽重计算](doc/asset/img/draggable.gif)

### 数据视图
如果你所呈现的数据足够让用户所关心，那么他们将不满足于查看可视化的图表，要去逐一迎合他们下载保存，数据分享，加工整合已有数据等等需求？

或许你只要给予一个“,”分隔的数据文本他们就懂了，这就是ECharts的数据视图！当然，你可以重载数据视图的输出方法，用你独特的方式去呈现数据。

如果你的用户足够的高端，你甚至可以打开数据视图的编辑功能，跟拖拽重计算相比，这可是批量的数据修改！

![ECharts 数据视图](doc/asset/img/dataView.gif)

### 动态类型切换
很多图表类型本身所表现的能力是相似的，但由于数据差异、表现需求和个人喜好的不同导致最终图表所呈现的张力又大不一样，比如折线图和柱状图的选择总是让人头疼。

ECharts提供了动态类型切换，让用户随心所欲的切换到他所需要的图表类型。

![ECharts 动态类型切换](doc/asset/img/magicType.gif)

### 图例开关
ECharts提供了方便快捷的图例开关，可以随时切换到你所关心的数据系列。



![ECharts 图例开关](doc/asset/img/legendSelected.gif)

### 数据区域选择
数据可以是无限的，但显示空间总是有限的，数据区域选择组件提供了大数据量中漫游的能力，让用户选择并呈现他所关心的数据区域。

![ECharts 数据区域选择](doc/asset/img/datazoom.gif)

### 标线辅助
趋势线？平均线？未来走势？修正值？有需求用户自然知道用意~

提供标线辅助在K线图中可是必要的功能！是的，K线图我们正在开发中~

![ECharts 标线辅助](doc/asset/img/mark.gif)

### 多维度堆积
支持多系列，多维度的数据堆积，配合自动伸缩的图形实体和直角坐标系，能呈现出更有内涵的统计图表~

![ECharts 多维度堆积](doc/asset/img/multiStack.png)

### 个性化定制
近300个可配置选项结合多级控制设计满足高度定制的个性化需求。
<img src="doc/asset/img/doc/multiControl.jpg" style="height:145px;float:left"/>
![ECharts 个性化定制](doc/asset/img/custom.png)


### 事件交互
可以捕获的用户交互和数据变化事件实现图表与外界的联动。

<a href="doc/example/event.html" target="_blank">try this &raquo;</a>
