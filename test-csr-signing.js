const https = require('https');
const forge = require('node-forge');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { exec } = require('child_process');

// Read the most recent validation file
function getLatestValidationFile() {
    const testEmailsDir = '/var/spool/certM3/test-emails';
    const files = fs.readdirSync(testEmailsDir)
        .filter(file => file.endsWith('-validation.json'))
        .sort()
        .reverse();
    
    if (files.length === 0) {
        throw new Error('No validation files found');
    }
    
    return path.join(testEmailsDir, files[0]);
}

// Extract validation token and user info from file
function getValidationData(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return {
        token: data.validationToken,
        username: data.to.split('@')[0], // Extract username from email
        email: data.to
    };
}

// Create a temporary directory for OpenSSL operations
const tempDir = '/tmp/cert-test-temp';
fs.mkdirSync(tempDir, { recursive: true });

// Function to run OpenSSL command and return formatted output
async function runOpenSSL(args) {
    return new Promise((resolve, reject) => {
        const cmd = 'openssl ' + args.join(' ');
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`OpenSSL ${args.join(',')} failed:`, error);
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

// Function to validate certificate structure
function validateCertificateStructure(certFile) {
    try {
        // Read the certificate file
        const certPEM = fs.readFileSync(certFile, 'utf8');
        
        // Write the certificate to a temporary file with proper line endings
        const tempCertFile = path.join(tempDir, 'temp-cert.pem');
        fs.writeFileSync(tempCertFile, certPEM.replace(/\n/g, '\r\n'));
        
        // Validate the certificate using OpenSSL
        const certInfo = execSync(`openssl x509 -in ${tempCertFile} -text -noout`).toString();
        console.log('\nCertificate information:');
        console.log('----------------------------------------');
        console.log(certInfo);
        console.log('----------------------------------------');
        
        // Verify the certificate chain
        console.log('\nVerifying certificate chain...');
        const verifyOutput = execSync(`openssl verify ${tempCertFile}`).toString();
        console.log('Certificate chain verification output:');
        console.log('----------------------------------------');
        console.log(verifyOutput);
        console.log('----------------------------------------');
        
    } catch (error) {
        console.error('Certificate validation failed:', error.message);
        throw error;
    }
}

// Generate a test CSR with proper structure
async function generateTestCSR() {
    // Create a temporary directory for OpenSSL operations
    const tempDir = '/tmp/cert-test-temp';
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    // Generate key pair
    const keys = forge.pki.rsa.generateKeyPair(2048);
    
    // Create a certificate request
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    
    // Set the subject with proper structure
    csr.setSubject([
        {
            name: 'countryName',
            value: 'US',
            valueTagClass: 12
        },
        {
            name: 'stateOrProvinceName',
            value: 'California',
            valueTagClass: 12
        },
        {
            name: 'localityName',
            value: 'San Francisco',
            valueTagClass: 12
        },
        {
            name: 'organizationName',
            value: 'ogt11.com, llc',
            valueTagClass: 12
        },
        {
            name: 'organizationalUnitName',
            value: 'Certificate Authority',
            valueTagClass: 12
        },
        {
            name: 'commonName',
            value: 'testuser',
            valueTagClass: 12
        },
        {
            name: 'emailAddress',
            value: 'testuser@testemail.com',
            valueTagClass: 22
        }
    ]);
    
    // Sign the CSR
    csr.sign(keys.privateKey, forge.md.sha256.create());

    // Generate private key and CSR
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    const csrPem = forge.pki.certificationRequestToPem(csr);

    // Write files for OpenSSL validation
    const keyFile = path.join(tempDir, 'test.key');
    const csrFile = path.join(tempDir, 'test.csr');
    fs.writeFileSync(keyFile, privateKeyPem);
    fs.writeFileSync(csrFile, csrPem);

    // Validate CSR with OpenSSL
    console.log('\nValidating generated CSR...');
    const csrOutput = await runOpenSSL(['req', '-in', csrFile, '-text', '-noout']);
    console.log('\nOpenSSL req output:');
    console.log('----------------------------------------');
    console.log(csrOutput);
    console.log('----------------------------------------');

    // Validate private key
    console.log('\nValidating generated private key...');
    const keyOutput = await runOpenSSL(['rsa', '-in', keyFile, '-check', '-noout']);
    console.log('\nOpenSSL rsa output:');
    console.log('----------------------------------------');
    console.log(keyOutput);
    console.log('----------------------------------------');

    // Verify CSR signature
    console.log('\nVerifying CSR signature...');
    const verifyOutput = await runOpenSSL(['req', '-in', csrFile, '-verify', '-noout']);
    console.log(verifyOutput);

    return { csr: csrPem, privateKey: privateKeyPem };
}

// Submit the CSR to cert-admin service
async function submitCSR(csr) {
    const options = {
        hostname: 'urp.ogt11.com',
        path: '/api/cert-admin/csr/sign',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        rejectUnauthorized: false // For testing only
    };

    const requestData = {
        csr: csr,
        username: 'testuser',
        userId: '123e4567-e89b-12d3-a456-426614174000' // Using a valid UUID
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: response
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(JSON.stringify(requestData));
        req.end();
    });
}

// Clean up certificate PEM format
function cleanCertificatePEM(certPEM) {
    // First, ensure we're working with a string
    if (Buffer.isBuffer(certPEM)) {
        certPEM = certPEM.toString('utf8');
    }
    
    // If the certificate is a concatenated string (contains '+'), join it properly
    if (typeof certPEM === 'string' && certPEM.includes('+')) {
        // Extract all the base64 lines, ignoring the concatenation operators
        const base64Lines = certPEM
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                // Remove quotes and + operators
                line = line.replace(/^['"]|['"]$/g, '');
                line = line.replace(/\s*\+\s*$/, '');
                return line;
            })
            .filter(line => !line.includes('BEGIN') && !line.includes('END'));
            
        // Join all lines together into a single string
        const base64Data = base64Lines.join('');
        
        // Split the base64 data into lines of 64 characters
        const formattedBase64 = base64Data.match(/.{1,64}/g).join('\n');
        
        // Add PEM header and footer with proper line endings
        certPEM = '-----BEGIN CERTIFICATE-----\n' +
                 formattedBase64 + '\n' +
                 '-----END CERTIFICATE-----';
    }
    
    // Ensure proper line endings
    certPEM = certPEM.replace(/\r\n|\r|\n/g, '\n');
    
    // Ensure exactly one trailing newline
    if (!certPEM.endsWith('\n')) {
        certPEM += '\n';
    }
    
    // Write the certificate to a file
    const pemFile = path.join(tempDir, 'cert.pem');
    fs.writeFileSync(pemFile, certPEM);
    
    // Convert to DER format
    const derFile = path.join(tempDir, 'cert.der');
    execSync(`openssl x509 -in ${pemFile} -outform DER -out ${derFile}`);
    
    // Convert back to PEM format
    const normalizedCert = execSync(`openssl x509 -in ${derFile} -inform DER -outform PEM`).toString();
    
    // Write the normalized certificate back to the PEM file
    fs.writeFileSync(pemFile, normalizedCert);
    
    return normalizedCert;
}

// Main test function
async function testCSRSigning() {
    try {
        // Generate test CSR
        console.log('Generating test CSR...');
        const { csr } = await generateTestCSR();

        // Submit CSR to server
        console.log('\nSubmitting CSR to server...');
        const response = await submitCSR(csr);
        console.log('Server response:', response);

        if (!response.body.certificate) {
            throw new Error('No certificate in server response');
        }
        
        // Clean and normalize the certificate
        const cleanCert = cleanCertificatePEM(response.body.certificate);
        console.log('\nCleaned certificate:');
        console.log('----------------------------------------');
        console.log(cleanCert);
        console.log('----------------------------------------');
        
        // Write the cleaned certificate to a file
        const certFile = path.join(tempDir, 'cert.pem');
        fs.writeFileSync(certFile, cleanCert);
        console.log('\nCertificate written to:', certFile);
        
        // Try to parse with forge
        try {
            const cert = forge.pki.certificateFromPem(cleanCert);
            console.log('\nCertificate validation with forge:');
            console.log('----------------------------------------');
            console.log('Subject:', cert.subject.attributes.map(attr => `${attr.name}=${attr.value}`).join(', '));
            console.log('Issuer:', cert.issuer.attributes.map(attr => `${attr.name}=${attr.value}`).join(', '));
            console.log('Valid from:', cert.validity.notBefore);
            console.log('Valid to:', cert.validity.notAfter);
            console.log('Serial number:', cert.serialNumber);
            console.log('----------------------------------------');
            
            // Additional validation steps
            const certAsn1 = forge.pki.certificateToAsn1(cert);
            const derBytes = forge.asn1.toDer(certAsn1).getBytes();
            const fingerprint = forge.md.sha256
                .create()
                .update(derBytes)
                .digest()
                .toHex();
            
            console.log('Certificate fingerprint:', fingerprint);
            console.log('\nCertificate validation completed successfully');
            
            // Also validate with OpenSSL
            console.log('\nValidating with OpenSSL...');
            const opensslOutput = execSync(`openssl x509 -in ${certFile} -text -noout`).toString();
            console.log('OpenSSL validation successful:');
            console.log('----------------------------------------');
            console.log(opensslOutput);
            console.log('----------------------------------------');
        } catch (error) {
            console.error('Error validating certificate:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error in testCSRSigning:', error);
        throw error;
    }
}

// Run the test
testCSRSigning().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
}); 