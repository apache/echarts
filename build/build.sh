#!/bin/bash
rm -r ../dist
node r.js -o config.js
node optimize.js