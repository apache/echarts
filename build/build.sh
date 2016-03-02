#!/bin/bash

cd ../
rm -r dist

npm run prepublish
webpack
webpack -p
webpack --config extension/webpack.config.js
webpack --config extension/webpack.config.js -p