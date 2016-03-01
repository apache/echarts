module.exports = {
    legend: {
        bottom: '5%',
        data: ['rose1', 'rose2', 'rose3', 'rose4']
    },
    series : [
        {
            name:'半径模式',
            type:'pie',
            radius : [20, 80],
            center : ['25%', 110],
            label: {
                normal: {
                    show: false
                },
                emphasis: {
                    show: true
                }
            },
            lableLine: {
                normal: {
                    show: false
                },
                emphasis: {
                    show: true
                }
            },
            data:[
                {value:10, name:'rose1'},
                {value:5, name:'rose2'},
                {value:15, name:'rose3'},
                {value:25, name:'rose4'},
                {value:20, name:'rose5'},
                {value:35, name:'rose6'},
                {value:30, name:'rose7'},
                {value:40, name:'rose8'}
            ]
        },
        {
            name:'面积模式',
            type:'pie',
            radius : [30, 80],
            center : ['75%', 110],
            roseType : 'area',
            labelLine: {
                normal: {
                    length: 5
                }
            },
            data:[
                {value:10, name:'rose1'},
                {value:5, name:'rose2'},
                {value:15, name:'rose3'},
                {value:25, name:'rose4'},
                {value:20, name:'rose5'},
                {value:35, name:'rose6'},
                {value:30, name:'rose7'},
                {value:40, name:'rose8'}
            ]
        },
        {
            name:'仪表盘',
            type:'gauge',
            radius : 100,
            center : ['50%', 280],
            detail : {formatter:'{value}%'},
            data:[
                {value:50, name:'Gauge'}
            ]
        }
    ]
};
