#!/bin/bash

rm -r ../dist

node r.js -o config.js
node optimize.js

node r.js -o configStatistics.js

mkdir ../dist/extension/parser
uglifyjs ../extension/parser/gexf.js -c -m -o ../dist/extension/parser/gexf.js

