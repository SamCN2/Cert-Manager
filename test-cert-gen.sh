#!/bin/bash

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
cd $TEMP_DIR

# Generate a private key
openssl genrsa -out private.key 2048

# Generate a CSR
openssl req -new -key private.key -out request.csr -subj "/CN=testuser/emailAddress=test@example.com"

# Self-sign the certificate (in production, this would be signed by a CA)
openssl x509 -req -days 365 -in request.csr -signkey private.key -out certificate.crt

# Create a PKCS#12 file
openssl pkcs12 -export -out certificate.p12 -inkey private.key -in certificate.crt -password pass:test123

# Validate the PKCS#12 file
echo "Validating PKCS#12 file..."
openssl pkcs12 -info -in certificate.p12 -password pass:test123 -noout

# Clean up
cd -
echo "Test files created in: $TEMP_DIR"
echo "To clean up, run: rm -rf $TEMP_DIR" 