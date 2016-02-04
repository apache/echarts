({
    baseUrl: '../',
    name: 'echarts',
    paths: {
        extension: '../extension',
        echarts: '../extension/echarts'
    },
    wrap: {
        startFile: [
            '../wrap/startExtension.js',
            '../wrap/nut.js'
        ],
        end: 'require("extension/bmap/bmap") }));'
    },
    include:[
        'extension/bmap/bmap'
    ],
    out: '../../dist/extension/bmap.js'
})