import CertificateClient from './prototypes/crypto-migration/client/certificate-client.js';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

// Configuration
const config = {
    baseUrl: 'https://urp.ogt11.com',
    csrEndpoint: '/api/cert-admin/csr/sign',
    commonName: 'taarna.ogt11.com',
    email: 'taarna@ogt11.com',
    organization: 'ogt11.com, llc',
    organizationalUnit: 'Certificate Authority',
    locality: 'San Francisco',
    state: 'California',
    country: 'US',
    username: 'taarna'
};

// Create certificate client
const client = new CertificateClient();

// Send CSR to signing endpoint
async function signCSR(csrPem) {
    return new Promise((resolve, reject) => {
        const requestBody = {
            csr: csrPem,
            username: config.username,
            email: config.email
        };

        console.log('Sending CSR to:', config.baseUrl + config.csrEndpoint);
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

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
            console.log('Response headers:', res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        console.error('Server error response:', data);
                        reject(new Error(`Server returned ${res.statusCode}: ${data}`));
                        return;
                    }

                    const response = JSON.parse(data);
                    if (!response.certificate || !response.caCertificate) {
                        reject(new Error('Invalid server response - missing certificate data'));
                        return;
                    }
                    
                    resolve({
                        certificate: response.certificate,
                        caCertificate: response.caCertificate,
                        serialNumber: response.serialNumber
                    });
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

// Main function
async function main() {
    try {
        // Generate key pair
        console.log('Step 1: Generating key pair...');
        const keyPair = await client.generateKeyPair('P-384');
        console.log('✓ Key pair generated successfully');
        
        // Create CSR
        console.log('\nStep 2: Creating CSR...');
        const subject = {
            country: config.country,
            state: config.state,
            locality: config.locality,
            organization: config.organization,
            organizationalUnit: config.organizationalUnit,
            commonName: config.commonName,
            emailAddress: config.email
        };
        const csr = await client.generateCSR(keyPair, subject);
        console.log('✓ CSR created successfully');
        
        // Save CSR for inspection
        fs.writeFileSync('request.csr', csr);
        console.log('✓ CSR saved to request.csr');
        
        // Send CSR for signing
        console.log('\nStep 3: Sending CSR for signing...');
        const { certificate, caCertificate, serialNumber } = await signCSR(csr);
        console.log('✓ Certificate received successfully');
        console.log('Serial number:', serialNumber);
        
        // Save certificates for inspection
        fs.writeFileSync('certificate.pem', certificate);
        fs.writeFileSync('ca.pem', caCertificate);
        console.log('✓ Certificates saved to certificate.pem and ca.pem');
        
        // Verify certificate chain
        console.log('\nStep 4: Verifying certificate chain...');
        const chainValid = await client.verifyChain(certificate, caCertificate);
        if (chainValid) {
            console.log('✓ Certificate chain is valid');
        } else {
            throw new Error('Certificate chain verification failed');
        }
        
        // Create PKCS12 wrapper
        console.log('\nStep 5: Creating PKCS12 wrapper...');
        const password = 'test123';
        const p12Buffer = await client.createPKCS12(certificate, keyPair.privateKey, password);
        console.log('✓ PKCS12 wrapper created successfully');
        
        // Write PKCS12 to file
        console.log('\nStep 6: Writing PKCS12...');
        fs.writeFileSync('certificate.p12', p12Buffer);
        console.log('✓ PKCS12 file written to certificate.p12');
        
        console.log('\nAll steps completed successfully!');
        console.log('Generated files:');
        console.log('- request.csr: The certificate signing request');
        console.log('- certificate.pem: The signed certificate');
        console.log('- ca.pem: The CA certificate');
        console.log('- certificate.p12: The PKCS12 bundle (password: test123)');
    } catch (err) {
        console.error('\nError occurred:', err.message);
        if (err.stack) {
            console.error('Stack trace:', err.stack);
        }
        process.exit(1);
    }
}

main(); 