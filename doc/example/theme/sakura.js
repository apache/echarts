define({
    // 全图默认背景
    // backgroundColor: 'rgba(0,0,0,0)',
    
    // 默认色板
    color: ['#e52c3c','#f7b1ab','#fa506c','#f59288','#f8c4d8',
            '#e54f5c','#f06d5c','#e54f80','#f29c9f','#eeb5b7'],

    // 值域
    dataRange: {
        color:['#e52c3c','#f7b1ab']//颜色 
    },

    
    // K线图默认参数
    k: {
        // barWidth : null          // 默认自适应
        // barMaxWidth : null       // 默认自适应 
        itemStyle: {
            normal: {
                color: '#e52c3c',          // 阳线填充颜色
                color0: '#f59288',      // 阴线填充颜色
                lineStyle: {
                    width: 1,
                    color: '#e52c3c',   // 阳线边框颜色
                    color0: '#f59288'   // 阴线边框颜色
                }
            },
            emphasis: {
                // color: 各异,
                // color0: 各异
            }
        }
    },
    
    // 饼图默认参数
    pie: {
        itemStyle: {
            normal: {
                // color: 各异,
                borderColor: '#fff',
                borderWidth: 1,
                label: {
                    show: true,
                    position: 'outer',
                  textStyle: {color: 'black'}
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                },
                labelLine: {
                    show: true,
                    length: 20,
                    lineStyle: {
                        // color: 各异,
                        width: 1,
                        type: 'solid'
                    }
                }
            }
        }
    },
    
    map: {
        mapType: 'china',   // 各省的mapType暂时都用中文
        mapLocation: {
            x : 'center',
            y : 'center'
            // width    // 自适应
            // height   // 自适应
        },
        showLegendSymbol : true,       // 显示图例颜色标识（系列标识的小圆点），存在legend时生效
        itemStyle: {
            normal: {
                // color: 各异,
                borderColor: '#fff',
                borderWidth: 1,
                areaStyle: {
                    color: '#ccc'//rgba(135,206,250,0.8)
                },
                label: {
                    show: false,
                    textStyle: {
                        color: 'rgba(139,69,19,1)'
                    }
                }
            },
            emphasis: {                 // 也是选中样式
                // color: 各异,
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 1,
                areaStyle: {
                    color: '#f3f39d'
                },
                label: {
                    show: false,
                    textStyle: {
                        color: 'rgba(139,69,19,1)'
                    }
                }
            }
        }
    },
    
    force : {
        // 分类里如果有样式会覆盖节点默认样式
        itemStyle: {
            normal: {
                // color: 各异,
                label: {
                    show: false
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                },
                nodeStyle : {
                    brushType : 'both',
                    strokeColor : '#e54f5c'
                },
                linkStyle : {
                    strokeColor : '#e54f5c'
                }
            },
            emphasis: {
                // color: 各异,
                label: {
                    show: false
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                },
                nodeStyle : {},
                linkStyle : {}
            }
        }
    }
});
