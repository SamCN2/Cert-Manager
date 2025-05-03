/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const express = require('express');
const cors = require('cors');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const version = require(path.join(__dirname, '../version'));
const userAdminService = require('./services/user-admin.service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));  // Increased limit for CSR
app.use(express.static(path.join(__dirname, '../webroot')));

// Add cert-admin API configuration
const CERT_ADMIN_URL = process.env.CERT_ADMIN_URL || 'http://localhost:3003';

// Add user-admin API configuration
const USER_ADMIN_URL = process.env.USER_ADMIN_URL || 'http://localhost:3004';

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
        const { csr, username, validationToken } = req.body;
        
        if (!csr || !username) {
            return res.status(400).json({ error: 'Missing CSR or username' });
        }

        console.log('Received CSR:', csr.substring(0, 100) + '...');
        console.log('Username:', username);
        console.log('Validation Token:', validationToken ? 'Present' : 'Missing');

        // Verify validation token if provided
        if (validationToken) {
            try {
                const isValid = await axios.post(`${USER_ADMIN_URL}/api/verify-validation-token`, { validationToken });
                if (!isValid.data.valid) {
                    return res.status(400).json({ error: 'Invalid or expired validation token' });
                }
                console.log('Validation token verified successfully');
            } catch (error) {
                console.error('Error verifying validation token:', error);
                return res.status(400).json({ error: 'Error verifying validation token' });
            }
        }

        // Fetch user details from user-admin
        const userData = await userAdminService.getUserDetails(username);
        console.log('Fetched user details:', userData);

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
            email: userData.email,
            codeVersion: version
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

        // Convert to PEM format using forge's built-in function
        const certPem = forge.pki.certificateToPem(cert);

        // Validate the generated certificate
        try {
            const testCert = forge.pki.certificateFromPem(certPem);
            if (testCert.serialNumber !== cert.serialNumber) {
                throw new Error('Certificate validation failed: Serial number mismatch');
            }
            
            // Additional validation
            const testAsn1 = forge.pki.certificateToAsn1(testCert);
            const testDer = forge.asn1.toDer(testAsn1).getBytes();
            const testFingerprint = forge.md.sha256
                .create()
                .update(testDer)
                .digest()
                .toHex();
            
            if (testFingerprint !== fingerprint) {
                throw new Error('Certificate validation failed: Fingerprint mismatch');
            }
            
            console.log('Certificate validated successfully');
        } catch (validationError) {
            console.error('Certificate validation error:', validationError);
            throw new Error('Certificate validation failed: ' + validationError.message);
        }

        // Send the response with the certificate in a way that preserves the PEM format
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            certificate: certPem,  // Send the certificate as is, without trimming
            serialNumber: serialNumber
        }, null, 2));
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

// Username validation endpoint
app.post('/api/validate-username', async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required', valid: false });
        }

        // Query user-admin service to validate username
        const response = await axios.get(`${USER_ADMIN_URL}/api/users/check-username/${username}`);
        
        // The username is valid if it exists in the user-admin service
        // We don't want to check availability, we want to check existence
        res.json({ valid: response.data.exists });
    } catch (error) {
        console.error('Username validation error:', error);
        // If the error is from user-admin service, pass through the response
        if (error.response) {
            return res.status(error.response.status).json({
                error: error.response.data.error || 'Username validation failed',
                valid: false
            });
        }
        res.status(500).json({ error: 'Username validation failed', valid: false });
    }
});

// Get user data endpoint
app.get('/api/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Query user-admin service to get user data
        const response = await axios.get(`${USER_ADMIN_URL}/api/users/${username}`);
        
        res.json({
            name: response.data.displayName,
            email: response.data.email || '',
            username: response.data.username
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        if (error.response) {
            return res.status(error.response.status).json({
                error: error.response.data.error || 'Failed to fetch user data'
            });
        }
        res.status(500).json({
            error: 'Internal server error while fetching user data'
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
