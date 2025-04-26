#!/bin/bash

# Copyright (c) 2025 ogt11.com, llc

set -e

# Configuration
NUM_REQUESTS=2
CERT_CREATE_URL="http://localhost:3000/api/sign-certificate"
CERT_ADMIN_URL="http://localhost:3003"
PARALLEL_REQUESTS=5  # Reduced to avoid overwhelming the server
TEMP_DIR="/tmp/cert-stress-test"
LOG_FILE="${TEMP_DIR}/stress_test.log"
RESPONSE_DIR="${TEMP_DIR}/responses"
CERT_DIR="${TEMP_DIR}/certificates"

# Check if servers are running
echo "Checking if cert-create is available..."
if ! curl -s -f "http://localhost:3000/api/health" > /dev/null 2>&1; then
    echo "Error: cert-create is not responding at http://localhost:3000"
    echo "Please ensure the cert-create server is running on port 3000"
    exit 1
fi

echo "Checking if cert-admin is available..."
if ! curl -s -f "${CERT_ADMIN_URL}/ping" > /dev/null 2>&1; then
    echo "Warning: cert-admin is not responding at ${CERT_ADMIN_URL}"
    echo "Certificate data will not be stored in the database"
fi

# Arrays for random data generation
DOMAINS=("example.com" "test.com" "demo.com" "stress.com" "load.com")
ORGANIZATIONS=("TestCorp" "StressInc" "LoadTest LLC" "Demo Corp" "Example Inc")
NAME_PREFIXES=("Test" "Stress" "Load" "Demo" "Sample" "Mock" "Fake")
NAME_SUFFIXES=("User" "Admin" "Dev" "Ops" "QA" "Test" "Eng")

# Create temporary directories
mkdir -p "$TEMP_DIR" "$RESPONSE_DIR" "$CERT_DIR"
#trap 'rm -rf "$TEMP_DIR"' EXIT

# Function to generate a random username
generate_username() {
    prefix=$1
    number=$((100 + RANDOM % 900))
    echo "${prefix}${number}"
}

# Function to escape JSON string
escape_json() {
    # Remove newlines and escape quotes
    echo "$1" | awk 'BEGIN{RS="";ORS=""} {gsub(/\n/,"\\n"); gsub(/"/,"\\""); print}'
}

# Generate key and CSR
generate_key_and_csr() {
    local username=$1
    local email=$2
    local key_file="$TEMP_DIR/${username}.key"
    local csr_file="$TEMP_DIR/${username}.csr"

    # Generate private key
    openssl genpkey -algorithm RSA -out "$key_file" 2>/dev/null

    # Generate CSR
    openssl req -new -key "$key_file" -out "$csr_file" -subj "/C=US/ST=California/L=San Francisco/O=Demo Corp/OU=IT Department/CN=${username}/emailAddress=${email}" 2>/dev/null

    # Read and escape CSR
    local csr_content
    csr_content=$(cat "$csr_file")
    echo "$(escape_json "$csr_content")"
}

# Write the worker script that will be called by parallel
cat > "${TEMP_DIR}/worker.sh" << EOF
#!/bin/bash

# Worker script that generates and submits a single certificate request

# Get command line arguments
id="\$1"
TEMP_DIR="\$2"
CERT_CREATE_URL="\$3"
RESPONSE_DIR="\$4"
CERT_DIR="\$5"

# Arrays passed from parent script
DOMAINS=(${DOMAINS[@]@Q})
ORGANIZATIONS=(${ORGANIZATIONS[@]@Q})
NAME_PREFIXES=(${NAME_PREFIXES[@]@Q})
NAME_SUFFIXES=(${NAME_SUFFIXES[@]@Q})

# Function to get a random element from an array
random_element() {
    local -n arr=\$1
    local size=\${#arr[@]}
    local index=\$((RANDOM % size))
    echo "\${arr[\$index]}"
}

# Generate username
prefix=\$(random_element NAME_PREFIXES)
suffix=\$(random_element NAME_SUFFIXES)
number=\$((RANDOM % 1000))
username="\${prefix}\${suffix}\${number}"

# Generate other details
domain=\$(random_element DOMAINS)
org=\$(random_element ORGANIZATIONS)
email="\${username}@\${domain}"

# File paths for this request
key_file="\${TEMP_DIR}/private_\${id}.key"
csr_file="\${TEMP_DIR}/request_\${id}.csr"
config_file="\${TEMP_DIR}/openssl_\${id}.cnf"
response_file="\${RESPONSE_DIR}/response_\${id}.json"
cert_file="\${CERT_DIR}/cert_\${id}.pem"
cert_text_file="\${CERT_DIR}/cert_\${id}.txt"

# Create OpenSSL config
cat > "\$config_file" << INNER_EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = California
L = San Francisco
O = \${org}
OU = IT Department
CN = \${username}
emailAddress = \${email}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
email = \${email}
INNER_EOF

# Generate private key and CSR
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "\$key_file" 2>/dev/null
if [ ! -f "\$key_file" ]; then
    echo "Failed to generate key file for request \$id"
    exit 1
fi

openssl req -new -config "\$config_file" -key "\$key_file" -out "\$csr_file" 2>/dev/null
if [ ! -f "\$csr_file" ]; then
    echo "Failed to generate CSR file for request \$id"
    exit 1
fi

# Read CSR and format as PEM
csr=\$(cat "\$csr_file" | tr -d '\n\r' | sed 's/\"/\\\"/g')

# Prepare request data with proper JSON escaping
request_data=\$(printf '{"csr":"%s","userData":{"username":"%s","email":"%s"}}' "\${csr}" "\${username}" "\${email}")

# Submit request with full response logging
echo "=== Full Request/Response ===" >> "\$response_file"
response=\$(curl -s -X POST "\$CERT_CREATE_URL" \\
    -H "Content-Type: application/json" \\
    -H "Accept: application/json" \\
    --max-time 30 \\
    -d "\$request_data")

# Save request details
echo -e "\n=== Request Details ===" >> "\$response_file"
echo "Request ID: \$id" >> "\$response_file"
echo "Username: \$username" >> "\$response_file"
echo "Email: \$email" >> "\$response_file"

# Check if response contains a certificate
if ! echo "\$response" | grep -q '"certificate":'; then
    echo "Request \$id failed: No certificate in response"
    echo "Response: \$response" >> "\$response_file"
    exit 1
fi

# Extract certificate and serial number
certificate=\$(echo "\$response" | grep -o '"certificate":"[^"]*"' | cut -d'"' -f4)
serial_number=\$(echo "\$response" | grep -o '"serialNumber":"[^"]*"' | cut -d'"' -f4)

echo -e "\n=== Response Details ===" >> "\$response_file"
echo "Serial Number: \$serial_number" >> "\$response_file"

# Save certificate to file
echo "\$certificate" > "\$cert_file"

# Validate certificate format and content
echo "Validating certificate for request \$id..."

# Check if certificate file exists and is not empty
if [ ! -s "\$cert_file" ]; then
    echo "Request \$id failed: Empty certificate file"
    exit 1
fi

# Verify PEM format
if ! grep -q "BEGIN CERTIFICATE" "\$cert_file" || ! grep -q "END CERTIFICATE" "\$cert_file"; then
    echo "Request \$id failed: Invalid PEM format"
    exit 1
fi

# Use OpenSSL to parse and verify the certificate
if ! openssl x509 -in "\$cert_file" -text -noout > "\$cert_text_file" 2>/dev/null; then
    echo "Request \$id failed: Invalid certificate format"
    exit 1
fi

# Verify certificate fields
cert_text=\$(cat "\$cert_text_file")

# Check subject fields
if ! echo "\$cert_text" | grep -q "Subject:.*CN = \$username"; then
    echo "Request \$id failed: Common Name mismatch"
    exit 1
fi

if ! echo "\$cert_text" | grep -q "Subject:.*emailAddress = \$email"; then
    echo "Request \$id failed: Email mismatch"
    exit 1
fi

# Check key usage
if ! echo "\$cert_text" | grep -q "X509v3 Key Usage:.*Digital Signature"; then
    echo "Request \$id failed: Missing required key usage"
    exit 1
fi

# Check basic constraints
if ! echo "\$cert_text" | grep -q "X509v3 Basic Constraints:.*CA:FALSE"; then
    echo "Request \$id failed: Invalid basic constraints"
    exit 1
fi

# Verify certificate chain (if CA cert is available)
ca_cert="/home/samcn2/src/certM3/ca/ca-cert.pem"
if [ -f "\$ca_cert" ]; then
    if ! openssl verify -CAfile "\$ca_cert" "\$cert_file" > /dev/null 2>&1; then
        echo "Request \$id failed: Certificate chain verification failed"
        exit 1
    fi
fi

# Add validation results to response file
echo -e "\nCertificate Validation:" >> "\$response_file"
echo "- PEM format: Valid" >> "\$response_file"
echo "- Subject CN: \$username" >> "\$response_file"
echo "- Subject Email: \$email" >> "\$response_file"
echo "- Key Usage: Valid" >> "\$response_file"
echo "- Basic Constraints: Valid" >> "\$response_file"
if [ -f "\$ca_cert" ]; then
    echo "- Chain Verification: Passed" >> "\$response_file"
fi

# Check cert-admin database for the certificate
echo "Checking cert-admin database for serial number \$serial_number..."
db_check=\$(curl -s -f "\${CERT_ADMIN_URL}/certificates/\${serial_number}" 2>/dev/null)
if [ \$? -eq 0 ] && [ -n "\$db_check" ]; then
    echo "- Database Entry: Found" >> "\$response_file"
    echo "- Database Record: \$db_check" >> "\$response_file"
else
    echo "Warning: Certificate not found in database (serial: \$serial_number)" >> "\$response_file"
fi

echo "Request \$id completed for \$username (certificate validated)"
exit 0
EOF

# Make worker script executable
chmod +x "${TEMP_DIR}/worker.sh"

echo "Starting stress test with $NUM_REQUESTS requests..."
echo "Timestamp: $(date)"

# Run requests in parallel with response directory
seq 1 $NUM_REQUESTS | parallel -j $PARALLEL_REQUESTS --delay 0.5 \
    "${TEMP_DIR}/worker.sh" {} "$TEMP_DIR" "$CERT_CREATE_URL" "$RESPONSE_DIR" "$CERT_DIR" \
    2>&1 | tee -a "$LOG_FILE"

echo "Stress test completed"
echo "Timestamp: $(date)"

# Print summary statistics
total_completed=$(grep "completed" "$LOG_FILE" | wc -l)
total_failed=$(grep "failed" "$LOG_FILE" | wc -l)
total_rate_limited=$(grep "rate limited" "$LOG_FILE" | wc -l)
total_unexpected=$(grep "unexpected response" "$LOG_FILE" | wc -l)
total_validated=$(grep "certificate validated" "$LOG_FILE" | wc -l)
total_in_db=$(grep "Database Entry: Found" "$RESPONSE_DIR"/*.json 2>/dev/null | wc -l)

echo "Summary:"
echo "Total requests: $NUM_REQUESTS"
echo "Completed: $total_completed"
echo "Validated: $total_validated"
echo "Found in Database: $total_in_db"
echo "Failed: $total_failed"
echo "Rate limited: $total_rate_limited"
echo "Unexpected responses: $total_unexpected"

# Check for common error patterns in responses
echo -e "\nAnalyzing responses for common errors..."
if [ -d "$RESPONSE_DIR" ]; then
    echo "Sample of responses:"
    # Show both successful and failed responses for debugging
    ls -t "$RESPONSE_DIR"/*.json | head -n 5 | while read -r file; do
        echo -e "\nFrom $file:"
        echo "=== Request Details ==="
        grep -A 2 "Request ID:" "$file"
        echo "=== Certificate Details ==="
        grep -A 6 "Certificate Validation:" "$file"
        echo "=== Database Status ==="
        grep -A 2 "Database Entry:" "$file" || echo "No database entry found"
        echo "----------------------------------------"
    done
fi 
