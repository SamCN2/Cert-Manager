const forge = require('node-forge');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');

// Configuration
const config = {
    baseUrl: 'https://urp.ogt11.com',
    csrEndpoint: '/api/cert-admin/csr/sign',
    commonName: 'test.example.com',
    email: 'test@example.com',
    organization: 'Test Organization',
    organizationalUnit: 'Test Unit',
    locality: 'Test City',
    state: 'Test State',
    country: 'US',
    userId: uuidv4(),
    username: 'test-user'
};

// Generate key pair
function generateKeyPair() {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    return {
        privateKey: keys.privateKey,
        publicKey: keys.publicKey
    };
}

// Create CSR
function createCSR(privateKey, publicKey) {
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = publicKey;
    csr.setSubject([{
        name: 'commonName',
        value: config.commonName
    }, {
        name: 'emailAddress',
        value: config.email
    }, {
        name: 'organizationName',
        value: config.organization
    }, {
        name: 'organizationalUnitName',
        value: config.organizationalUnit
    }, {
        name: 'localityName',
        value: config.locality
    }, {
        name: 'stateOrProvinceName',
        value: config.state
    }, {
        name: 'countryName',
        value: config.country
    }]);

    // Sign CSR with private key
    csr.sign(privateKey);
    return forge.pki.certificationRequestToPem(csr);
}

// Send CSR to signing endpoint
function signCSR(csrPem) {
    return new Promise((resolve, reject) => {
        const requestBody = {
            csr: csrPem,
            userId: config.userId,
            username: config.username,
            email: config.email
        };

        console.log('Sending request to:', config.baseUrl + config.csrEndpoint);

        const options = {
            hostname: 'urp.ogt11.com',
            port: 443,
            path: config.csrEndpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(requestBody))
            },
            rejectUnauthorized: false // For testing only
        };

        const req = https.request(options, (res) => {
            console.log('Response status:', res.statusCode);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.error) {
                        reject(new Error(response.error.message || 'Server error'));
                        return;
                    }
                    
                    // The certificate is already properly formatted from the server
                    // No need to clean or normalize it
                    resolve(response.certificate);
                } catch (error) {
                    console.error('Error parsing response:', error);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
            reject(error);
        });

        req.write(JSON.stringify(requestBody));
        req.end();
    });
}

// Create PKCS12 wrapper
function createPKCS12(certPem, privateKey, password) {
    try {
        // Parse the certificate directly from PEM
        const certObj = forge.pki.certificateFromPem(certPem);
        
        // Create PKCS12 using node-forge with standard parameters
        const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
            privateKey,
            [certObj],
            password,
            {
                friendlyName: config.commonName,
                algorithm: '3des',
                generateLocalKeyId: true,
                saltSize: 8,
                iterations: 2048
            }
        );
        
        // Convert to DER
        const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
        
        // Create buffer from DER bytes
        const buffer = new Uint8Array(p12Der.length);
        for (let i = 0; i < p12Der.length; ++i) {
            buffer[i] = p12Der.charCodeAt(i);
        }
        
        return Buffer.from(buffer).toString('base64');
    } catch (error) {
        console.error('Detailed error in createPKCS12:', error);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        throw error;
    }
}

// Main function
async function main() {
    try {
        // Generate key pair
        console.log('Step 1: Generating key pair...');
        const { privateKey, publicKey } = await generateKeyPair();
        console.log('✓ Key pair generated successfully');
        
        // Create CSR
        console.log('Step 2: Creating CSR...');
        const csr = await createCSR(privateKey, publicKey);
        console.log('✓ CSR created successfully');
        
        // Send CSR for signing
        console.log('Step 3: Sending CSR for signing...');
        const certPem = await signCSR(csr);
        console.log('✓ Certificate received successfully');
        
        // Create PKCS12 wrapper
        console.log('Step 4: Creating PKCS12 wrapper...');
        const p12Base64 = createPKCS12(certPem, privateKey, 'test123');
        console.log('✓ PKCS12 wrapper created successfully');
        
        // Write PKCS12 to file
        console.log('Step 5: Writing PKCS12 to file...');
        fs.writeFileSync('certificate.p12', Buffer.from(p12Base64, 'base64'));
        console.log('✓ PKCS12 file written to certificate.p12');
    } catch (err) {
        console.error('Error occurred:', err.message);
        if (err.stack) {
            console.error('Stack trace:', err.stack);
        }
        if (err.response && err.response.data) {
            console.error('Server response:', err.response.data);
        }
    }
}

main(); 