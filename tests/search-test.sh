#!/bin/bash

# Copyright (c) 2025 ogt11.com, llc

set -e

# Configuration
CERT_ADMIN_URL="http://localhost:3003"
DOMAINS=("example.com" "test.com" "demo.com" "stress.com" "load.com")

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Function to perform a search and validate results
search_and_validate() {
    local query="$1"
    local expected_field="$2"
    local expected_value="$3"
    
    echo -e "\n${GREEN}Testing search: $query${NC}"
    
    local response
    response=$(curl -s "${CERT_ADMIN_URL}/certificates/search?$query")
    
    # Check if response is valid JSON
    if ! echo "$response" | jq . >/dev/null 2>&1
    then 
        echo -e "${RED}Invalid JSON response${NC}"
        return 1
    fi
    
    # Count results
    local count
    count=$(echo "$response" | jq '. | length')
    echo "Found $count certificates"
    
    # If expected field and value provided, validate results
    if [[ -n "$expected_field" && -n "$expected_value" ]]
    then
        local valid_count
        valid_count=$(echo "$response" | jq --arg field "$expected_field" --arg value "$expected_value" \
            '[.[] | select(.[$field] == $value)] | length')
        echo "Validated $valid_count certificates match $expected_field=$expected_value"
    fi
}

echo "Starting search tests..."

# Test version-based search
echo -e "\n${GREEN}Testing version-based searches${NC}"
current_version=$(curl -s "${CERT_ADMIN_URL}/certificates/search?version=$(date +%Y)" | jq -r '.[0].codeVersion')
search_and_validate "version=$current_version" "codeVersion" "$current_version"

# Test domain-based search
echo -e "\n${GREEN}Testing domain-based searches${NC}"
for domain in "${DOMAINS[@]}"; do
    search_and_validate "email=@${domain}" "email" "@${domain}"
done

# Test organization pattern search
echo -e "\n${GREEN}Testing organization pattern searches${NC}"
search_and_validate "username=Test" "username" "Test"
search_and_validate "username=Stress" "username" "Stress"

# Test fingerprint uniqueness
echo -e "\n${GREEN}Testing fingerprint uniqueness${NC}"
duplicate_fingerprints=$(curl -s "${CERT_ADMIN_URL}/certificates/search" | \
    jq -r '.[].fingerprint' | sort | uniq -d)
if [[ -n "$duplicate_fingerprints" ]]; then
    echo -e "${RED}Found duplicate fingerprints:${NC}"
    echo "$duplicate_fingerprints"
else
    echo -e "${GREEN}No duplicate fingerprints found${NC}"
fi

# Test email uniqueness within version
echo -e "\n${GREEN}Testing email uniqueness within version${NC}"
duplicate_emails=$(curl -s "${CERT_ADMIN_URL}/certificates/search?version=$current_version" | \
    jq -r '.[].email' | sort | uniq -d)
if [[ -n "$duplicate_emails" ]]; then
    echo -e "${RED}Found duplicate emails within version:${NC}"
    echo "$duplicate_emails"
else
    echo -e "${GREEN}No duplicate emails found within version${NC}"
fi

echo -e "\n${GREEN}Search tests completed${NC}" 
