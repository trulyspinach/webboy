#!/usr/bin/env bash
cd ./webpage
browserify webboy.js -o build.js
#javascript-obfuscator build.js --output build.js
open main.html