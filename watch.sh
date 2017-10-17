#!/bin/bash

basePath=$(cd `dirname $0`; pwd)
cd ${basePath}

./node_modules/rollup/bin/rollup --config --watch

