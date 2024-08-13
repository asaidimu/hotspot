#!/usr/bin/env sh
tailwindcss -i ./public/css/input.css -o ./public/css/styles.css --minify

[ -e dist ] && rm -rf site
mkdir site
cp -r public/* site
rm -rf site/css/input.css
zip site.zip site/* -r
