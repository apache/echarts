module.exports = {
    title: {
        text: 'Bar Chart',
        left: 'center',
        top: '3%',
        textStyle: {
            fontWeight: 'normal'
        }
    },
    toolbox: {
        top: '3%',
        feature: {
            magicType: {
                type: ['line', 'bar', 'stack', 'tiled']
            },
            restore: {},
            dataZoom: {},
            saveAsImage: {}
        }
    },
    grid: {
        left: '13%',
        right: '5%',
        bottom: '5%',
        textStyle: {
            fontWeight: 'normal'
        }
    },
    xAxis: {
        type: 'value'
    },
    yAxis: {
        type: 'category',
        data: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday','Sunday']
    },
    series: [
        {
            name:'直接访问',
            type:'bar',
            stack: '总量',
            label: {
                normal: {
                    show: true,
                    position: 'insideRight'
                }
            },
            data:[320, 302, 301, 334, 390, 330, 320]
        },
        {
            name:'邮件营销',
            type:'bar',
            stack: '总量',
            label: {
                normal: {
                    show: true,
                    position: 'insideRight'
                }
            },
            data:[120, 132, 101, 134, 90, 230, 210]
        },
        {
            name:'联盟广告',
            type:'bar',
            stack: '总量',
            label: {
                normal: {
                    show: true,
                    position: 'insideRight'
                }
            },
            data:[220, 182, 191, 234, 290, 330, 310]
        },
        {
            name:'视频广告',
            type:'bar',
            stack: '总量',
            label: {
                normal: {
                    show: true,
                    position: 'insideRight'
                }
            },
            data:[150, 212, 201, 154, 190, 330, 410]
        },
        {
            name:'搜索引擎',
            type:'bar',
            stack: '总量',
            label: {
                normal: {
                    show: true,
                    position: 'insideRight'
                }
            },
            data:[820, 832, 901, 934, 1290, 1330, 1320]
        }
    ]
};