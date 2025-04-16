/**
 * Copyright (c) 2025 ogt11.com, llc
 */

document.getElementById('certForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const statusDiv = document.getElementById('status');
    statusDiv.className = 'status';
    statusDiv.textContent = 'Generating certificate...';

    try {
        // Generate key pair
        const keyPair = await generateKeyPair();
        
        // Create CSR
        const csr = await generateCSR(keyPair);
        
        // Send CSR to server
        const response = await fetch('/api/sign-certificate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                csr: forge.pki.certificationRequestToPem(csr),
                userData: {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    username: document.getElementById('username').value
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const { certificate } = await response.json();

        try {
            // Parse the certificate
            const certObj = forge.pki.certificateFromPem(certificate);

            // Create PKCS#12 with standard options
            const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
                keyPair.privateKey,
                [certObj],
                document.getElementById('password').value,
                {
                    friendlyName: document.getElementById('name').value,
                    algorithm: '3des',
                    generateLocalKeyId: true,
                    saltSize: 8,
                    iterations: 2048
                }
            );
            
            // Convert to binary format
            const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
            const buffer = new Uint8Array(p12Der.length);
            for (let i = 0; i < p12Der.length; ++i) {
                buffer[i] = p12Der.charCodeAt(i);
            }
            
            // Download the PKCS#12 file
            const blob = new Blob([buffer], { type: 'application/x-pkcs12' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${document.getElementById('username').value}.p12`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            statusDiv.className = 'status success';
            statusDiv.textContent = 'Certificate generated and downloaded successfully!';
        } catch (error) {
            console.error('Certificate processing error:', error);
            statusDiv.className = 'status error';
            statusDiv.textContent = `Error processing certificate: ${error.message}`;
        }
    } catch (error) {
        console.error('Request error:', error);
        statusDiv.className = 'status error';
        statusDiv.textContent = `Error: ${error.message}`;
    }
});

/**
 * Generate a 2048-bit RSA key pair
 * @returns {Promise<forge.pki.KeyPair>}
 */
async function generateKeyPair() {
    return new Promise((resolve, reject) => {
        forge.pki.rsa.generateKeyPair({ bits: 2048 }, (err, keyPair) => {
            if (err) reject(err);
            else resolve(keyPair);
        });
    });
}

/**
 * Generate a Certificate Signing Request (CSR)
 * @param {forge.pki.KeyPair} keyPair - The key pair to use for the CSR
 * @returns {forge.pki.CertificationRequest}
 */
async function generateCSR(keyPair) {
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keyPair.publicKey;
    
    csr.setSubject([
        { name: 'commonName', value: document.getElementById('name').value },
        { name: 'emailAddress', value: document.getElementById('email').value }
    ]);
    
    csr.sign(keyPair.privateKey, forge.md.sha256.create());
    return csr;
}

async function createPKCS12(privateKey, certificate, password) {
    console.log('Creating PKCS#12...');
    try {
        const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
            privateKey,
            [certificate],
            password,
            {
                algorithm: 'sha1', // Changed algorithm
                friendlyName: document.getElementById('name').value,
                generateLocalKeyId: true,
                iterations: 1024  // Reduced iterations
            }
        );
        
        console.log('PKCS#12 ASN.1 created');
        return forge.asn1.toDer(p12Asn1).getBytes();
    } catch (error) {
        console.error('PKCS#12 creation error:', error);
        throw error;
    }
}

async function createAndDownloadPKCS12(certObj, privateKey) {
    console.log('Creating PKCS#12...');
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
        privateKey,
        [certObj],
        document.getElementById('password').value,
        {
            algorithm: '3des',
            friendlyName: document.getElementById('name').value,
            saltSize: 8
        }
    );
    
    console.log('PKCS#12 ASN.1 created');
    const p12Der = forge.asn1.toDer(p12Asn1);
    console.log('PKCS#12 DER encoded');
    const p12Bytes = p12Der.getBytes();
    
    // Download using Blob
    const blob = new Blob(
        [forge.util.binary.raw.decode(p12Bytes)],
        { type: 'application/x-pkcs12' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.getElementById('username').value}.p12`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
} 