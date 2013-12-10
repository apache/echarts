#!/bin/bash
node build.js optimize=true plain=false exclude=map output=echarts.js
node build.js optimize=false plain=false exclude=map output=echarts-original.js
node build.js optimize=true plain=false output=echarts-map.js
node build.js optimize=false plain=false output=echarts-original-map.js
node build.js optimize=true plain=true exclude=map output=echarts-plain.js
node build.js optimize=true plain=true output=echarts-plain-map.js
node build.js optimize=false plain=true exclude=map output=echarts-plain-original.js
node build.js optimize=false plain=true output=echarts-plain-original-map.js