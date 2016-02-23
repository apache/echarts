## DEMO

### 问题描述(Description) ###
设置yAxis的max，min为字符串，且值较大时，导致tooltip消失。

### 截图(Images) ###
![tooltip](https://cloud.githubusercontent.com/assets/7768611/12501135/e55f34c6-c0f4-11e5-9847-f5b2cc7ce97d.png)

### 版本及环境(Version & Environment) ###
[3.0.2] & Windows7 64bit & Chrome 48.0.2564.103

### 重现条件(Steps to reproduce) ###
- 当设置yAxis，min为'11'字符，max为'29'字符时，正常显示。
- 当min为'21'字符，max为'29'字符时，tooltip消失，不正常显示。
- 当以上值为数字时，正常显示。

### 期望结果(Expected behaviour) ###
正常显示tooltip。

### 配置项(Option) ###
```javascript
option = {
	  tooltip: {
	    trigger: 'axis'
	  },
	  legend: {
	    data: ['UCL', '中线', '测试值', 'LCL']
	  },
	  toolbox: {
	    show: true,
	    feature: {
	      mark: {
	        show: true
	      },
	      dataView: {
	        show: true,
	        readOnly: false
	      },
	      magicType: {
	        show: true,
	        type: ['line']
	      },
	      restore: {
	        show: true
	      },
	      saveAsImage: {
	        show: true
	      }
	    }
	  },
	  calculable: false,
	  xAxis: [{
	    type: 'category',
	    boundaryGap: false,
	    data: ['IQC150700002', 'IQC151100376', 'IQC151100727', 'IQC151100739', 'IQC151200342', 'IQC151200572', 'IQC151201142', 'IQC160100319', 'IQC160100444']
	  }],
	  yAxis: [{
	    type: 'value',
	    max: '29',
	    min: '21'
	  }],
	  series: [{
	    name: 'LCL',
	    type: 'line',
	    data: [25.8366666666667, 25.8366666666667, 25.8366666666667, 25.8366666666667, 25.8366666666667, 25.8366666666667, 25.8366666666667, 25.8366666666667, 25.8366666666667]
	  }, {
	    name: '测试值',
	    type: 'line',
	    data: [24.750000, 22.500000, 22.500000, 24.500000, 26.000000, 24.500000, 23.500000, 25.000000, 28.000000]
	  }, {
	    name: '中线',
	    type: 'line',
	    data: [24.5833333333333, 24.5833333333333, 24.5833333333333, 24.5833333333333, 24.5833333333333, 24.5833333333333, 24.5833333333333, 24.5833333333333, 24.5833333333333]
	  }, {
	    name: 'UCL',
	    type: 'line',
	    data: [23.33, 23.33, 23.33, 23.33, 23.33, 23.33, 23.33, 23.33, 23.33]
	  }]
	};
```

### 线上实例(Online Demo) ###
[JSFIDDLE](https://jsfiddle.net/SuperZ/v0L2kqko/)



