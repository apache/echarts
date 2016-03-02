#!/bin/bash


basePath=$(cd `dirname $0`; pwd)
cd ${basePath}/../
rm -r dist

npm run prepublish

./node_modules/.bin/webpack
./node_modules/.bin/webpack -p
./node_modules/.bin/webpack --config extension/webpack.config.js
./node_modules/.bin/webpack --config extension/webpack.config.js -p


