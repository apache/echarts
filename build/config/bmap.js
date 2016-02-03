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
        endFile: [
            '../wrap/endExtension.js'
        ]
    },
    include:[
        'extension/bmap/bmap'
    ],
    out: '../../dist/extension/bmap.js'
})