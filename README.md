# ECharts

<a href="https://echarts.apache.org/">
    <img style="vertical-align: top;" src="./asset/logo.png?raw=true" alt="logo" height="50px">
</a>

ECharts is a free, powerful charting and visualization library offering an easy way of adding intuitive, interactive, and highly customizable charts to your commercial products. It is written in pure JavaScript and based on <a href="https://github.com/ecomfe/zrender">zrender</a>, which is a whole new lightweight canvas library.

Now ECharts is an incubator project of Apache Software Foundation.
Please check its incubator status [here](http://incubator.apache.org/projects/echarts.html)

**[中文官网](https://echarts.apache.org/zh/index.html)** | **[ENGLISH HOMEPAGE](https://echarts.apache.org/index.html)**

[![Build Status](https://travis-ci.org/apache/incubator-echarts.svg?branch=master)](https://travis-ci.org/apache/incubator-echarts) [![](https://img.shields.io/npm/dw/echarts.svg?label=npm%20downloads&style=flat)](https://www.npmjs.com/package/echarts) [![Last npm release](https://img.shields.io/npm/v/echarts)](https://www.npmjs.com/package/echarts)

## Get ECharts

You may choose one of the following methods:

+ Download from Official Website in [中文下载页](https://echarts.apache.org/zh/download.html)
+ Download from Official Website in [English](https://echarts.apache.org/en/download.html)
+ `npm install echarts --save`
+ CDN: [jsDelivr CDN](https://www.jsdelivr.com/package/npm/echarts?path=dist)

## Docs

+ Tutorial
    + [中文](https://echarts.apache.org/zh/tutorial.html)
    + [English](https://echarts.apache.org/en/tutorial.html)

+ API
    + [中文](https://echarts.apache.org/zh/api.html)
    + [English](https://echarts.apache.org/en/api.html)

+ Option Manual
    + [中文](https://echarts.apache.org/zh/option.html)
    + [English](https://echarts.apache.org/en/option.html)

## Get Help

+ [GitHub Issues](https://github.com/apache/incubator-echarts/issues) for bug report and feature requests
+ Email [dev@echarts.apache.org](dev@echarts.apache.org) for general questions
+ Subscribe [mailing list](https://echarts.apache.org/en/maillist.html) to get updated with the project

## Build

Build echarts source code:

Execute the instructions in the root directory of the echarts:
([Node.js](https://nodejs.org) is required)

```shell
# Install the dependencies from NPM:
npm install

# If intending to build and get all types of the "production" files:
npm run release
# The same as `node build/build.js --release`

# If only intending to get `dist/echarts.js`, which is usually
# enough in dev or running the tests:
npm run build
# The same as `node build/build.js`

# Get the same "production" files as `node build/build.js`, while
# watching the editing of the source code. Usually used in dev.
npm run watch
# The same as `node build/build.js -w`

# Check the manual:
npm run help
# The same as `node build/build.js --help`
```

Then the "production" files are generated in the `dist` directory.

More custom build approaches can be checked in this tutorial: [Create Custom Build of ECharts](https://echarts.apache.org/en/tutorial.html#Create%20Custom%20Build%20of%20ECharts) please.

## Contribution

If you wish to debug locally or make pull requests, please refer to [contributing](https://github.com/apache/incubator-echarts/blob/master/CONTRIBUTING.md) document.

## Resources

### Awesome ECharts

[https://github.com/ecomfe/awesome-echarts](https://github.com/ecomfe/awesome-echarts)

### Extensions

+ [ECharts GL](https://github.com/ecomfe/echarts-gl) An extension pack of ECharts, which provides 3D plots, globe visualization, and WebGL acceleration.

+ [Liquidfill 水球图](https://github.com/ecomfe/echarts-liquidfill)

+ [Wordcloud 字符云](https://github.com/ecomfe/echarts-wordcloud)

+ [Baidu Map 百度地图扩展](https://github.com/apache/incubator-echarts/tree/master/extension/bmap)

+ [vue-echarts](https://github.com/ecomfe/vue-echarts) ECharts component for Vue.js

+ [echarts-stat](https://github.com/ecomfe/echarts-stat) Statistics tool for ECharts

## License

ECharts is available under the Apache License V2.

## Code of Conduct

Please refer to [Apache Code of Conduct](https://www.apache.org/foundation/policies/conduct.html).

## Paper

Deqing Li, Honghui Mei, Yi Shen, Shuang Su, Wenli Zhang, Junting Wang, Ming Zu, Wei Chen.
[ECharts: A Declarative Framework for Rapid Construction of Web-based Visualization](https://www.sciencedirect.com/science/article/pii/S2468502X18300068).
Visual Informatics, 2018.
