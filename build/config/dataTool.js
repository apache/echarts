({
    baseUrl: '../',
    name: 'echarts',
    paths: {
        extension: '../extension',
        echarts: '../extension/dataTool/echarts'
    },
    wrap: {
        startFile: [
            '../wrap/startDataTool.js',
            '../wrap/nut.js'
        ],
        endFile: [
            '../wrap/endDataTool.js'
        ]
    },
    include:[
        'extension/dataTool/prepareBoxplotData',
        'extension/dataTool/gexf'
    ],
    out: '../../dist/extension/dataTool.js'
})