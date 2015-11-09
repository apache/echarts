#!/bin/bash
rm -r ../dist
node r.js -o config.js

if [[ $1 = "raw" ]]
then
    echo "raw"
else
    echo "optimize"
    node optimize.js
fi