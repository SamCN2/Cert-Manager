const forge = require('node-forge');
const fs = require('fs');
const https = require('https');
const path = require('path');

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
    userId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'test-user'
};

// Load CA key and certificate
const caKey = forge.pki.privateKeyFromPem(
    fs.readFileSync(path.join(__dirname, 'ca/private/ca-key.pem'), 'utf8')
);
const caCert = forge.pki.certificateFromPem(
    fs.readFileSync(path.join(__dirname, 'ca/certs/ca-cert.pem'), 'utf8')
);

// Function to generate and sign certificate (server-side logic)
function generateCertificate(csrPem) {
    try {
        console.log('Parsing CSR...');
        const csr = forge.pki.certificationRequestFromPem(csrPem);
        
        if (!csr.verify()) {
            throw new Error('Invalid CSR signature');
        }
        console.log('CSR verified successfully');

        // Create a certificate from the CSR
        const cert = forge.pki.createCertificate();
        cert.publicKey = csr.publicKey;
        cert.serialNumber = '1234567890';
        
        // Set validity period (1 year)
        const now = new Date();
        cert.validity.notBefore = now;
        cert.validity.notAfter = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        
        // Set subject attributes with consistent valueTagClass
        const subjectAttrs = csr.subject.attributes.map(attr => ({
            shortName: attr.shortName,
            name: attr.name,
            type: attr.type,
            value: attr.value,
            valueTagClass: attr.name === 'emailAddress' ? 22 : 12
        }));
        cert.setSubject(subjectAttrs);
        console.log('Subject attributes:', JSON.stringify(subjectAttrs, null, 2));
        
        // Read CA certificate's subject attributes directly
        const caCertPem = fs.readFileSync(path.join(__dirname, 'ca/certs/ca-cert.pem'), 'utf8');
        const caCertObj = forge.pki.certificateFromPem(caCertPem);
        
        // Use CA certificate's subject attributes exactly as they are
        cert.setIssuer(caCertObj.subject.attributes);
        console.log('Issuer attributes (from CA cert):', JSON.stringify(caCertObj.subject.attributes, null, 2));
        
        // Add extensions
        cert.setExtensions([
            {
                name: 'basicConstraints',
                cA: false,
            },
            {
                name: 'keyUsage',
                digitalSignature: true,
                nonRepudiation: true,
                keyEncipherment: true,
            },
            {
                name: 'extKeyUsage',
                serverAuth: true,
                clientAuth: true,
                emailProtection: true,
            },
            {
                name: 'subjectKeyIdentifier',
            },
            {
                name: 'authorityKeyIdentifier',
                keyid: true,
                issuer: true,
            }
        ]);
        
        // Sign certificate
        cert.sign(caKey, forge.md.sha256.create());
        console.log('Certificate signed successfully');
        
        // Convert to PEM
        const certAsn1 = forge.pki.certificateToAsn1(cert);
        const derBytes = forge.asn1.toDer(certAsn1).getBytes();
        const base64Cert = forge.util.encode64(derBytes);
        
        const pemLines = ['-----BEGIN CERTIFICATE-----'];
        for (let i = 0; i < base64Cert.length; i += 64) {
            pemLines.push(base64Cert.substr(i, 64));
        }
        pemLines.push('-----END CERTIFICATE-----');
        const pem = pemLines.join('\n');
        
        // Verify the generated certificate
        const verifiedCert = forge.pki.certificateFromPem(pem);
        if (!verifiedCert) {
            throw new Error('Failed to parse generated certificate');
        }
        
        return {
            certificate: pem,
            caCertificate: forge.pki.certificateToPem(caCert),
            fingerprint: forge.md.sha256.create().update(derBytes).digest().toHex()
        };
    } catch (error) {
        console.error('Certificate generation failed:', error);
        throw error;
    }
}

// Generate a 2048-bit RSA key pair
const keyPair = forge.pki.rsa.generateKeyPair(2048);

// Create a CSR
const csr = forge.pki.createCertificationRequest();
csr.publicKey = keyPair.publicKey;
csr.setSubject([
    { name: 'commonName', value: config.commonName },
    { name: 'emailAddress', value: config.email },
    { name: 'organizationName', value: config.organization },
    { name: 'organizationalUnitName', value: config.organizationalUnit },
    { name: 'localityName', value: config.locality },
    { name: 'stateOrProvinceName', value: config.state },
    { name: 'countryName', value: config.country }
]);

// Sign the CSR
csr.sign(keyPair.privateKey, forge.md.sha256.create());

// Convert CSR to PEM
const csrPem = forge.pki.certificationRequestToPem(csr);

// Main function
async function main() {
    try {
        // Generate certificate locally
        console.log('Generating certificate locally...');
        const response = generateCertificate(csrPem);
        
        // Write certificates to files for inspection
        fs.writeFileSync('cert.pem', response.certificate);
        fs.writeFileSync('ca.pem', response.caCertificate);
        
        console.log('Certificates written to files for inspection');
        console.log('Certificate fingerprint:', response.fingerprint);
        
        // Verify the certificate chain
        const cert = forge.pki.certificateFromPem(response.certificate);
        const caCert = forge.pki.certificateFromPem(response.caCertificate);
        
        // Verify the certificate was signed by the CA
        try {
            const verified = cert.verify(caCert);
            if (verified) {
                console.log('Certificate chain verification successful');
            } else {
                console.error('Certificate chain verification failed');
            }
        } catch (error) {
            console.error('Certificate verification error:', error);
            
            // Try manual verification
            try {
                const certPublicKey = caCert.publicKey;
                const signatureValue = cert.signature;
                
                // Get the TBSCertificate (to-be-signed certificate) part
                const certAsn1 = forge.pki.certificateToAsn1(cert);
                const tbsCertificate = certAsn1.value[0];
                
                // Create message digest
                const md = forge.md.sha256.create();
                const tbsDer = forge.asn1.toDer(tbsCertificate).getBytes();
                md.update(tbsDer);
                
                // Verify signature
                const verified = certPublicKey.verify(md.digest().getBytes(), signatureValue);
                if (verified) {
                    console.log('Manual signature verification successful');
                } else {
                    console.error('Manual signature verification failed');
                }
            } catch (manualError) {
                console.error('Manual verification error:', manualError);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the main function
main(); 