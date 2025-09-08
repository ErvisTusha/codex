#!/bin/bash

# Setup virtual display for testing GUI applications in CI
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &

# Wait for display to be ready
sleep 2

# Start the Electron app
npm start