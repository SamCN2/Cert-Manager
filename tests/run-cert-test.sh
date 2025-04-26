#!/bin/bash

# Copyright (c) 2025 ogt11.com, llc

set -e

# Change to the test directory
cd "$(dirname "$0")/node"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run the test
echo "Running certificate test..."
npm test

# Check the results file
result_file="/tmp/cert-test-node/test-results.json"
if [ -f "$result_file" ]; then
    echo -e "\nDetailed results are available in: $result_file"
fi 