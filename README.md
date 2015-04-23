ECharts
=======
百度 (中文) : http://echarts.baidu.com

在线视频教程：http://study.163.com/course/courseMain.htm?courseId=1016007

Why ECharts (中文) : http://echarts.baidu.com/doc/slide/whyEcharts.html

Github pages (English) : http://ecomfe.github.io/echarts/index-en.html

Why ECharts (English) : http://ecomfe.github.io/echarts/doc/slide/whyEcharts-en.html


基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据可视化图表。创新的拖拽重计算、数据视图、值域漫游等特性大大增强了用户体验，赋予了用户对数据进行挖掘、整合的能力。

**———— 大数据时代，重新定义数据图表的时候到了**

LICENSE:
https://github.com/ecomfe/echarts/blob/master/LICENSE.txt
 
Architecture
------------
ECharts (Enterprise Charts 商业产品图表库)

提供商业产品常用图表库，底层基于<a href="http://ecomfe.github.io/zrender/" target="_blank">ZRender</a>，创建了坐标系，图例，提示，工具箱等基础组件，并在此上构建出折线图（区域图）、柱状图（条状图）、散点图（气泡图）、饼图（环形图）、K线图、地图、和弦图以及力导向布局图，同时支持任意维度的堆积和多图表混合展现。

<img src="doc/asset/img/device.png" />
<img src="doc/asset/img/explorer.png" />
<i>(IE8- supported by <a href="https://code.google.com/p/explorercanvas/" target="_blank">excanvas</a> )</i>

![ECharts Architecture](doc/asset/img/architecture.png)

特色

我们诚挚邀请你翻阅这份在线文档 《 <a href="http://echarts.baidu.com/doc/slide/whyEcharts.html" target="_blank">Why ECharts ?</a> 》 你可以从中更直观的体验到ECharts的特性以及快速浏览到所有图表类型。

*文档中展现的个别特性在IE8-中并没有得到支持，所以建议使用IE9+、chrome、safari、firefox或opear等高级浏览器阅读这份文档。

----
### 混搭
混搭的图表会更具表现力也更有趣味，ECharts提供的图表（共9类14种）支持任意混搭：

折线图（区域图）、柱状图（条状图）、散点图（气泡图）、K线图、
饼图（环形图）、雷达图、地图、和弦图、力导布局图。

混搭情况下一个标准图表：包含唯一图例、工具箱、数据区域缩放、值域漫游模块，一个直角坐标系（可包含一条或多条类目轴线，一条或多条值轴线，最多上下左右四条）

![ECharts 混搭](doc/asset/img/mix.jpg)

### 拖拽重计算
拖拽重计算特性（专利）带来了数据统计图表从未有过的用户体验，允许用户对统计数据进行有效的提取、整合，甚至在多个图表间交换数据，赋予了用户对数据进行挖掘、整合的能力。

![ECharts 拖拽重计算](doc/asset/img/draggable.gif)

### 数据视图
如果你所呈现的数据足够让用户所关心，那么他们将不满足于查看可视化的图表，要去逐一迎合他们下载保存，数据分享，加工整合已有数据等等需求？

或许你只要给予一个“,”分隔的数据文本他们就懂了，这就是ECharts的数据视图！当然，你可以重载数据视图的输出方法，用你独特的方式去呈现数据。

如果你的用户足够的高端，你甚至可以打开数据视图的编辑功能，跟拖拽重计算相比，这可是批量的数据修改！

![ECharts 数据视图](doc/asset/img/dataView.gif)

### 动态类型切换
很多图表类型本身所表现的能力是相似的，但由于数据差异、表现需求和个人喜好的不同导致最终图表所呈现的张力又大不一样，比如折线图和柱状图的选择,系列数据是堆叠还是平铺总是让人头疼。

ECharts提供了动态类型切换，让用户随心所欲的切换到他所需要的图表类型和堆叠状态。

![ECharts 动态类型切换](doc/asset/img/magicType.gif)

### 图例开关
多系列数据的同时展现呈现出丰富内容，但如何让用户切换到他所关心的个别系列上？

ECharts提供了方便快捷的多维度图例开关，可以随时切换到你所关心的数据系列。

![ECharts 图例开关](doc/asset/img/legendSelected.gif)

### 数据区域选择
数据可以是无限的，但显示空间总是有限的，数据区域选择组件提供了大数据量中漫游的能力，让用户选择并呈现他所关心的数据区域。

配合随动的均值（极值）标线，标注展现强大的数据剖析能力。 

![ECharts 数据区域选择](doc/asset/img/datazoom.gif)

### 多图联动
多系列数据在同一个直角系内同时展现有时候会产生混乱，但他们又存在极强的关联意义不可分离？

ECharts提供了多图联动的能力（connect），能做的可不仅仅是鼠标划过的详情显示，连接的多个图表会共享组件事件并且实现了保存图片时的自动拼接。

![ECharts 数据区域选择](doc/asset/img/connect.gif)

### 值域漫游
基于坐标的图表（如地图、散点图）通过色彩变化表现数值的大小能直观形象的展示数据分布。

但如何聚焦到我所关心的数值上？我们创造了称为值域漫游的功能，让你可以轻松进行数值筛选。

![ECharts 数据区域选择](doc/asset/img/dataRange.gif)

### 炫光特效
我们知道，很多时候我们需要一些吸引眼球的能力。

ECharts支持标注标线的<a href="echarts.baidu.com/doc/example/map12.html" target="_blank">炫光特效</a>，特别用在地图上轻松实现<a href="echarts.baidu.com/doc/example/map11.html" target="_blank">百度迁徙数据可视化特效</a>

![ECharts 数据区域选择](doc/asset/img/effect.gif)

### 大规模散点图
如何展现成千上百万的离散数据从而找出他们的分布和聚类？貌似除了用专业的统计工具（如MATLAB）外别无选择？

不，ECharts发明了基于像素的大规模散点图（专利），一个900 x 400的散点区域就能够毫不重复的呈现36万组数据，这对于常规的应用，用现代浏览器就足以轻松展现百万级的散点数据！

![ECharts 数据区域选择](doc/asset/img/scatter.gif)

### 动态数据添加
如果你需要展示有实时变化的数据，相信这个动态接口会对你很有帮助。

![ECharts 标线辅助](doc/asset/img/dynamic1.gif)

### 标线辅助
趋势线？平均线？未来走势？修正值？有需求用户自然知道用意~

提供标线辅助在K线图中可是必要的功能！是的，K线图我们正在开发中~

![ECharts 标线辅助](doc/asset/img/mark.gif)

### 多维度堆积
支持多系列，多维度的数据堆积，配合自动伸缩的图形实体和直角坐标系，能呈现出更有内涵的统计图表~

![ECharts 多维度堆积](doc/asset/img/multiStack.png)

### 子区域地图模式
地图类型支持world，china及全国34个省市自治区。同时支持子区域模式，通过主地图类型扩展出所包含的子区域地图，轻易输出全球176个国家地区和全国600多个省市区域简图。

![ECharts 个性化定制](doc/asset/img/subMapType.png)

### GeoJson地图扩展
内置地图由标准GeoJson地理数据并经过高效的压缩算法压缩生成的地图数据（大小仅为标准geoJson的30%左右）驱动而来。如果内置地图类型或数据如果并未满足你的项目需要，可通过简单动态注册产生你所需要的新类型。

![ECharts 个性化定制](doc/asset/img/example/map7.png)

### 个性化定制
500+个可配置选项结合多级控制设计满足高度定制的个性化需求。

![ECharts 个性化定制](doc/asset/img/custom.png)

### 事件交互
可以捕获的用户交互和数据变化事件实现图表与外界的联动。<a href="doc/example/event.html" target="_blank">try this &raquo;</a>

![ECharts 个性化定制](doc/asset/img/example/mix3.png)
