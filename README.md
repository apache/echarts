# ECharts Next

### 如何使用开发版

你可以从 [在线构建工具](http://ecomfe.github.io/echarts-builder-web/echarts3.html) 打包下载。

或者使用如下方式基于源代码开发。

1. 获取 ZRender 3

    ```
    git pull https://github.com/ecomfe/zrender.git zrender
    # 切换到 3.0 分支
    git checkout dev-3.0.0
    ```

2. 获取 ECharts 3

    ```
    git pull https://github.com/ecomfe/echarts.git echarts
    # 切换到 3.0 分支
    git checkout dev-3.0.0
    ```

3. 配置 AMD 环境

    ```
    require.config({
        packages: [
            {
                main: 'echarts',
                location: 'echarts/src',
                name: 'echarts'
            },
            {
                main: 'zrender',
                location: 'echarts/zrender-dev3.0/src',
                name: 'zrender'
            }
        ]
    });
    ```