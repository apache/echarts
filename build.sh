#!/bin/bash


basePath=$(cd `dirname $0`; pwd)
cd ${basePath}
rm -r dist

# npm run prepublish

./node_modules/rollup/bin/rollup --config

