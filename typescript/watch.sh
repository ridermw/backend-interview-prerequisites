#!/bin/bash

# Run prettier and jest in watch mode together
trap 'kill $(jobs -p) 2>/dev/null' EXIT

npm run format
NODE_OPTIONS=--experimental-vm-modules NODE_NO_WARNINGS=1 jest --watch &

# Watch for file changes to run prettier
nodemon --ext ts,js,json --watch src --exec "npm run format" &

wait
