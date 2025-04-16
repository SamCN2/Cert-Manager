/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const express = require('express');
const cors = require('cors');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));  // Increased limit for CSR
app.use(express.static(path.join(__dirname, '../../webroot')));

// Add cert-admin API configuration
const CERT_ADMIN_URL = process.env.CERT_ADMIN_URL || 'http://localhost:3003';

// Load CA certificate and private key
let caCert, caPrivateKey;
try {
    caCert = forge.pki.certificateFromPem(
        fs.readFileSync(path.join(__dirname, '../../ca/ca-cert.pem'), 'utf8')
    );
    caPrivateKey = forge.pki.privateKeyFromPem(
        fs.readFileSync(path.join(__dirname, '../../ca/ca-key.pem'), 'utf8')
    );
} catch (error) {
    console.error('Error loading CA certificates:', error);
    process.exit(1);
}

app.post('/api/sign-certificate', async (req, res) => {
    try {
        const { csr, userData } = req.body;
        
        if (!csr || !userData) {
            return res.status(400).json({ error: 'Missing CSR or user data' });
        }

        console.log('Received CSR:', csr.substring(0, 100) + '...');
        console.log('User data:', userData);

        // Parse and verify the CSR
        const csrObj = forge.pki.certificationRequestFromPem(csr);
        console.log('CSR parsed successfully');

        if (!csrObj.verify()) {
            return res.status(400).json({ error: 'Invalid CSR' });
        }
        console.log('CSR verified successfully');

        // Prepare the certificate (without signing)
        const cert = forge.pki.createCertificate();
        cert.publicKey = csrObj.publicKey;
        
        // Set validity period (1 year)
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

        // Log CA certificate subject for debugging
        console.log('CA Certificate Subject:', JSON.stringify(caCert.subject.attributes, null, 2));

        // Set subject from CSR
        cert.setSubject(csrObj.subject.attributes);
        
        // Set issuer from CA certificate (not from CSR)
        cert.setIssuer(caCert.subject.attributes);

        // Set extensions
        cert.setExtensions([{
            name: 'basicConstraints',
            critical: true,
            cA: false
        }, {
            name: 'keyUsage',
            critical: true,
            digitalSignature: true,
            keyEncipherment: true
        }, {
            name: 'extKeyUsage',
            serverAuth: true,
            clientAuth: true,
            emailProtection: true
        }, {
            name: 'subjectAltName',
            altNames: [{
                type: 1, // rfc822Name
                value: userData.email
            }]
        }]);

        console.log('Certificate object created with extensions');

        // PHASE 1: Get Serial Number
        // Initialize the certificate record in cert-admin
        // A record without a fingerprint indicates an incomplete certificate creation
        const certData = {
            username: userData.username,
            email: userData.email
        };

        console.log('Phase 1 - Requesting serial number from cert-admin:', certData);
        const adminResponse = await axios.post(`${CERT_ADMIN_URL}/certificates`, certData);
        const serialNumber = adminResponse.data.serialNumber;
        console.log('Using serial number:', serialNumber);

        // Create and sign the certificate
        cert.serialNumber = serialNumber;
        cert.sign(caPrivateKey, forge.md.sha256.create());

        // Calculate certificate fingerprint
        const certAsn1 = forge.pki.certificateToAsn1(cert);
        const derBytes = forge.asn1.toDer(certAsn1).getBytes();
        const fingerprint = forge.md.sha256
            .create()
            .update(derBytes)
            .digest()
            .toHex();

        // Update cert-admin with the fingerprint
        await axios.patch(
            `${CERT_ADMIN_URL}/certificates/${serialNumber}`,
            { fingerprint }
        );

        // Convert to PEM format with standard 64-character line wrapping
        const pemLines = ['-----BEGIN CERTIFICATE-----'];
        const base64Cert = forge.util.encode64(derBytes);
        for (let i = 0; i < base64Cert.length; i += 64) {
            pemLines.push(base64Cert.substr(i, 64));
        }
        pemLines.push('-----END CERTIFICATE-----');
        const certPem = pemLines.join('\n');

        // Validate the generated certificate
        try {
            const testCert = forge.pki.certificateFromPem(certPem);
            if (testCert.serialNumber !== cert.serialNumber) {
                throw new Error('Certificate validation failed: Serial number mismatch');
            }
            console.log('Certificate validated successfully');
        } catch (validationError) {
            console.error('Certificate validation error:', validationError);
            throw new Error('Certificate validation failed: ' + validationError.message);
        }

        res.json({ 
            certificate: certPem,
            serialNumber: serialNumber
        });
    } catch (error) {
        console.error('Error in certificate creation/storage:', error);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        if (error.response && error.response.data) {
            console.error('Cert-admin error details:', error.response.data);
        }
        res.status(500).json({ 
            error: 'Failed to create or store certificate',
            details: error.response?.data || error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', caLoaded: !!caCert });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CA certificate loaded: ${!!caCert}`);
}); 