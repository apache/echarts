ECharts
=======
---

--Slightly revised *English ReadMe.md* --


+ [Github pages (English)](http://ecomfe.github.io/echarts/index-en.html)

+ [Why ECharts (English):](http://ecomfe.github.io/echarts/doc/slide/whyEcharts-en.html)


Based on SVG canvas, eCharts is a pure Javascript chart library, provides intuitive, vivid, interactive, individually customized data visualization graphs. Dragging heavy computing innovation, the data view, Range roaming features greatly enhance the user experience, giving users the ability to data mining, integration.

** ---- When big data era, redefine the data to the chart **

LICENSE:
https://github.com/ecomfe/echarts/blob/master/LICENSE.txt
 
Architecture
------------
ECharts (Enterprise Charts commercial product chart library)

Chart library used to provide commercial products, based on the underlying <a href="http://ecomfe.github.io/zrender/" target="_blank"> ZRender </a>, create a coordinate system, legends, tips, tool and other basic components, and in this the constructed line chart (regional map), Histogram (bar chart), scatter (bubble chart), Pie (ring diagram), K-line charts, maps, diagrams, and power chords oriented layout, while supporting mixed stacking and multi charts to show any dimension.

<Img src = "doc/asset/img/device.png" />
<Img src = "doc/asset/img/explorer.png" />
<I> (IE8- supported by <a href="https://code.google.com/p/explorercanvas/" target="_blank"> excanvas </a>) </i>

![ECharts Architecture](doc/asset/img/architecture.png)

#### Characteristic

We invite you to read this document "<a href="http://echarts.baidu.com/doc/slide/whyEcharts.html" target="_blank"> Why ECharts? </a>" You can learn a more intuitive experience and the characteristics of ECharts quickly navigate to all chart types.

* Some characteristics of the document show in IE8- did not get support, we recommend using IE9, chrome, safari, firefox or opear other advanced browser to read this document.

----
### Mash up
Chart mashup will be more expressive and more interesting, chart ECharts provided (9 category 14 kinds) supports any mix and match:

Line chart (regional map), Histogram (bar chart), scatter (bubble chart), K line graph,
Pie (circular diagram), radar, maps, chord chart, force guide layout.

Mix and match cases under a standard chart: contains a unique legend, Toolbox, a data area zoom, range roam module, a Cartesian coordinate system (which can include one or more category axis, one or more of the value axis, vertically and horizontally up to four)

![ECharts mashup](doc/asset/img/mix.jpg)

### Drag recalculation
Drag recalculation feature (patent pending) has brought data charts has never been user experience, allowing users to extract statistical data for effective integration, even the exchange of data between multiple charts, giving the user for data mining integration capabilities.

![ECharts drag recalculation](doc/asset/img/draggable.gif)

### Data View
If your data presented enough users are concerned, they will not satisfied with the visualization of graphs, download and save them to go one by one to meet the data sharing process needs to integrate existing data and so on?

Maybe you just give a "" delimited text data to understand them, this is the view of the data ECharts! Of course, you can override the output method of data views, with a unique way to present your data.

If your users high enough, you can even open the Edit function data view, compared with the drag weight basis, this is the bulk of data modification!

![ECharts Data View](doc/asset/img/dataView.gif)

### Dynamic type switching
Many capacity chart type is similar to the performance itself, but because of differences in data, the performance of the different needs and personal preferences ultimately lead to tension and charts presented is not much different, such as line charts and histograms option series data is stacked or Tile is always a headache.

ECharts provides dynamic type switch, allowing users to freely switch to the chart type and stacking state he needs.

![ECharts dynamic type switching](doc/asset/img/magicType.gif)

### Legend switch
Simultaneous multi-series data show exhibits rich content, but how to allow users to switch to his concern for individual series?

ECharts provides a convenient multi-dimensional illustration switch, you can always switch to your concerns data series.

![ECharts legend switch](doc/asset/img/legendSelected.gif)

### Data area selection
Data can be infinite, but display space is always limited, the data region select components provide the ability to roam large amount of data, allowing users to select and present his data area of ​​interest.

Cooperate with the moving averages (extremes) marking, labeling to show the powerful data analysis capabilities.

![ECharts data area selection](doc/asset/img/datazoom.gif)

### Multi-map linkage
Multi-series data in the same department at the same time a right angle to show sometimes be confusing, but they sense the presence of a strong association can not be separated?

ECharts linkage provides the ability to multi-map (connect), details do not just mouse across the display, multiple charts connect and share components to achieve automatic splicing event to save photographs.

![ECharts data area selection](doc/asset/img/connect.gif)

### Range Roaming
Size of the chart (such as maps, scatter plots) coordinates based on the value of performance by color change can intuitively display image data distribution.

But how to focus on the values ​​I care about? We have created a range called roaming function, so you can easily filter value.

![ECharts data area selection](doc/asset/img/dataRange.gif)

### Glare effects
We know that many times we need some ability to attract the eye.

ECharts support label marking <a href="echarts.baidu.com/doc/example/map12.html" target="_blank"> glare effects </a>, particularly easy to use on the map <a href = "echarts.baidu.com/doc/example/map11.html" target = "_ blank"> Baidu migrate data visualization effects </a>
/
![ECharts data area selection](doc/asset/img/effect.gif)

### Large-scale scatterplot
How to show tens of millions of discrete data in order to identify their distribution and clustering? Looks like in addition to statistical tools (such as MATLAB) with a professional is no alternative?

No, ECharts invention based on large-scale scatterplot (patent) pixel, scatter a 900 x 400 area will be able to repeat without rendering 360,000 sets of data, which for conventional applications, using modern browser enough to easily show one million of discrete data!

![ECharts data area selection](doc/asset/img/ scatter.gif)

### Dynamic Data add
If you need to show real-time changes in data, we believe that this dynamic interface will be helpful.

![ECharts marking auxiliary](doc/asset/img/dynamic1.gif)

### Auxiliary marking
The trend line? Average? The future trend? Correction value? Users will know there is a demand intention ~

Marking assist in providing K line chart but necessary function! Yes, K-line diagram that we are developing in ~

![customization](doc/asset/img/mark.gif)

### Multi-dimensional accumulation
Support for multi-family, multi-dimensional data accumulation, with automatic retractable graphical entities and Cartesian coordinates, can show more content of the charts -

![ECharts multi-dimensional stacked](doc/asset/img/multiStack.png)

### Sub Area Map mode
Map type supports world, china and the country 34 provinces and autonomous regions. While supporting sub-regional model, extended out through the main map types included in the sub-region maps, easily the world's 176 countries and regions output nationwide more than 600 cities and regions sketch.

![ECharts customization](doc/asset/img/subMapType.png)

### GeoJson map extended
Built-in maps and geographical data from standard GeoJson through efficient compression algorithm to generate the map data (size is only about 30% of the standard geoJson) driving from. If the built-in map data type or if the project did not meet your needs, can produce new types of dynamic registration you need simple.

![ECharts customization](doc/asset/img/example/map7.png)

### Customization
500 configurable options combined with multi-level control is designed to meet the needs of highly customized and personalized.

![ECharts customization](doc/asset/img/custom.png)

### Event interactions
User interaction and data change events can be captured with the outside world realize chart linkage. <a href="doc/example/event.html" target="_blank"> try this & raquo; </a>

![ECharts customization](doc/asset/img/example/mix3.png)