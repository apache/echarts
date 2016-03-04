如果你想帮助 **ECharts** 的话，请首先阅读指导原则：

- 如果你希望提 bug：

  - 清楚地描述问题，注意：**别人是否能通过你的描述理解这是什么问题**。
  - 说明版本（ECharts 版本，浏览器版本，设备、操作系统版本等）
  - 最好提供完整的ECharts option，截图或线上实例（可以使用JSFiddle/JSBin/Codepen）。

- 如果你想问问题：

  - 首先是否在这些文档中寻找过问题的答案：[option文档](http://echarts.baidu.com/option.html)，[API文档](http://echarts.baidu.com/api.html)，[教程](http://echarts.baidu.com/tutorial.html)
  - 简单的问题，可以在QQ群中求助（群号：465958031）

- 如何取得能运行的 `ECharts option` 

  一个参考方式：
  在你的程序的 
  ```javascript 
  chart.setOption(option); 
  ``` 
  前加入这句话 
  ```javascript 
  console.log(JSON.stringify(option, null, 4));
  ```
  
  然后打开浏览器的调试工具（如 `Chrome Deverloper Tool`）的 `控制台(console)`，可以得到option输出。

