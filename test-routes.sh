#!/bin/bash

# Configuration
BASE_URL="https://urp.ogt11.com"
CURL_OPTS="-s -o /dev/null -w '%{http_code}'"

# Test function
test_endpoint() {
    local method=$1
    local path=$2
    local expected_code=$3
    local description=$4
    
    echo "Testing $description..."
    echo "  $method $BASE_URL$path"
    
    local response_code
    if [ "$method" = "POST" ]; then
        response_code=$(curl $CURL_OPTS -X POST "$BASE_URL$path")
    else
        response_code=$(curl $CURL_OPTS "$BASE_URL$path")
    fi
    
    # Remove any quotes from the response code
    response_code=$(echo $response_code | tr -d "'")
    
    if [ "$response_code" = "$expected_code" ]; then
        echo "  ✓ Success: Got expected status code $response_code"
    else
        echo "  ✗ Failed: Got $response_code (expected $expected_code)"
    fi
    echo
}

# Test User Request Service
echo "Testing User Request Service..."
test_endpoint "GET" "/request/" "200" "Home page"
test_endpoint "GET" "/request/validate" "200" "Validation form"
test_endpoint "GET" "/request/debug" "200" "Debug page"
test_endpoint "GET" "/request/revalidate" "200" "Revalidation form"

# Test Certificate Request Integration
echo "Testing Certificate Request Integration..."
test_endpoint "GET" "/request/cert-request/" "200" "Certificate request form"
test_endpoint "GET" "/request/cert-request/success" "200" "Success page"

# Test API Endpoints
echo "Testing API Endpoints..."
test_endpoint "GET" "/api/user-admin/users/check-username/test" "200" "User admin API"
test_endpoint "GET" "/api/cert-admin/certificates" "200" "Certificate admin API"
test_endpoint "POST" "/request/cert-request/api/cert-request" "400" "Certificate request API (missing parameters)"
test_endpoint "POST" "/api/cert-admin/csr/sign" "422" "CSR signing API (missing parameters)"

# Test Static Files
echo "Testing Static Files..."
test_endpoint "GET" "/request/js/mdc.js" "200" "MDC JavaScript file"
test_endpoint "GET" "/request/js/csr.js" "200" "CSR JavaScript file"
test_endpoint "GET" "/request/js/certapp.js" "200" "Certificate app JavaScript file"
test_endpoint "GET" "/request/css/styles.css" "200" "CSS file"

# Test Form Submissions
echo "Testing Form Submissions..."
test_endpoint "POST" "/request/validate" "200" "Validation form submission (shows form)"
test_endpoint "POST" "/request/cert-request/" "200" "Certificate request form submission (shows form)"
test_endpoint "POST" "/request/cert-request/api/cert-request" "400" "Certificate request API submission (missing parameters)"

echo "Test complete!" 
