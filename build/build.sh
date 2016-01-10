#!/bin/bash

rm -r ../dist

node r.js -o config/echarts.simple.js
node optimize.js -m simple

node r.js -o config/echarts.common.js
node optimize.js -m common

node r.js -o config/echarts.js
node optimize.js -m all

node r.js -o config/dataTool.js
