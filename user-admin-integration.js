const express = require('express');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store key pairs in memory (in production, use a secure storage)
const keyPairs = new Map();

// Generate key pair and CSR
app.post('/api/generate-csr', (req, res) => {
    try {
        const { username, email, commonName } = req.body;
        
        // Generate key pair
        const keyPair = forge.pki.rsa.generateKeyPair(2048);
        
        // Store key pair for later use
        keyPairs.set(username, keyPair);
        
        // Create CSR
        const csr = forge.pki.createCertificationRequest();
        csr.publicKey = keyPair.publicKey;
        csr.setSubject([
            { name: 'commonName', value: commonName },
            { name: 'emailAddress', value: email }
        ]);
        
        // Sign CSR
        csr.sign(keyPair.privateKey, forge.md.sha256.create());
        
        // Convert to PEM
        const csrPem = forge.pki.certificationRequestToPem(csr);
        
        res.json({ csr: csrPem });
    } catch (error) {
        console.error('Error generating CSR:', error);
        res.status(500).json({ error: 'Failed to generate CSR' });
    }
});

// Sign CSR and return PKCS#12
app.post('/api/sign-csr', async (req, res) => {
    try {
        const { csr, username, password } = req.body;
        
        // Get stored key pair
        const keyPair = keyPairs.get(username);
        if (!keyPair) {
            throw new Error('Key pair not found');
        }
        
        // Send CSR to cert-admin for signing
        const certPem = await signCSR(csr);
        
        // Parse the certificate
        const certObj = forge.pki.certificateFromPem(certPem);
        
        // Create PKCS#12 wrapper
        const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
            keyPair.privateKey,
            [certObj],
            password,
            {
                friendlyName: username,
                algorithm: '3des',
                generateLocalKeyId: true,
                saltSize: 8,
                iterations: 2048
            }
        );
        
        // Convert to DER
        const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
        
        // Send the PKCS#12 file as a response
        res.setHeader('Content-Type', 'application/x-pkcs12');
        res.setHeader('Content-Disposition', `attachment; filename=${username}.p12`);
        res.send(Buffer.from(p12Der, 'binary'));
        
        // Clean up stored key pair
        keyPairs.delete(username);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to create PKCS#12 file' });
    }
});

// Function to send CSR to cert-admin for signing
async function signCSR(csrPem) {
    return new Promise((resolve, reject) => {
        const requestBody = {
            csr: csrPem,
            userId: '123e4567-e89b-12d3-a456-426614174000',
            username: 'test-user',
            email: 'test@example.com'
        };

        const options = {
            hostname: 'urp.ogt11.com',
            port: 443,
            path: '/api/cert-admin/csr/sign',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(requestBody))
            },
            rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
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

// Serve HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 