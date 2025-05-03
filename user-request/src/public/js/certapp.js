/**
 * Copyright (c) 2025 ogt11.com, llc
 */

// Initialize Material Design components
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all text fields
    const textFields = document.querySelectorAll('.mdc-text-field');
    textFields.forEach(textField => {
        const mdcTextField = mdc.textField.MDCTextField.attachTo(textField);
        
        // Store MDC instance for later use
        textField.mdcInstance = mdcTextField;
        
        // Add input handler for floating label
        const input = textField.querySelector('input');
        if (input) {
            input.addEventListener('input', () => {
                if (input.value) {
                    mdcTextField.foundation.activateFocus();
                }
            });
        }
    });

    // Initialize all buttons with ripple effect
    const buttons = document.querySelectorAll('.mdc-button');
    buttons.forEach(button => {
        const mdcButton = mdc.ripple.MDCRipple.attachTo(button);
    });

    // Initialize radio buttons
    const radioButtons = document.querySelectorAll('.mdc-radio');
    radioButtons.forEach(radio => {
        mdc.radio.MDCRadio.attachTo(radio);
    });

    // Initialize form validation
    const form = document.getElementById('certRequestForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.querySelector('.mdc-button__label').textContent;
            submitButton.querySelector('.mdc-button__label').textContent = 'Generating CSR...';
            submitButton.disabled = true;
            
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // If no group is selected, set it to null
            if (!data.group) {
                data.group = null;
            }
            
            try {
                console.log('Starting CSR generation process...');
                
                // Generate key pair
                console.log('Generating key pair...');
                const keyPair = await generateKeyPair();
                console.log('Key pair generated successfully');
                
                // Create CSR with user details
                console.log('Creating CSR with user details...');
                const csr = await generateCSR(keyPair, {
                    username: data.username,
                    email: data.email,
                    group: data.group
                });
                console.log('CSR created successfully');
                
                // Send CSR to server
                console.log('Sending CSR to server...');
                const response = await fetch('/request/cert-request/api/cert-request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        csr: forge.pki.certificationRequestToPem(csr),
                        username: data.username,
                        email: data.email,
                        validationToken: data.validationToken
                    })
                });
                
                const result = await response.json();
                console.log('Server response:', result);
                console.log('Response keys:', Object.keys(result));
                console.log('Response type:', typeof result);
                console.log('Certificate type:', typeof result.certificate);
                console.log('Certificate length:', result.certificate?.length);
                console.log('Raw certificate:', result.certificate);
                
                if (response.ok) {
                    console.log('Server response OK, starting certificate processing...');
                    
                    if (!result.certificate) {
                        throw new Error('No certificate received from server');
                    }
                    
                    // Create and download PKCS#12 file
                    console.log('Parsing certificate from PEM...');
                    console.log('Certificate PEM:', result.certificate);
                    
                    try {
                        // Clean up the certificate string
                        const cleanCert = result.certificate
                            .replace(/\r\n/g, '\n')  // Convert Windows line endings to Unix
                            .replace(/\n\n/g, '\n')  // Remove double newlines
                            .trim()                  // Remove leading/trailing whitespace
                            .split('\n')            // Split into lines
                            .map(line => line.trim()) // Trim each line
                            .filter(line => line.length > 0) // Remove empty lines
                            .join('\n');            // Rejoin with single newlines
                        
                        console.log('Cleaned certificate PEM:', cleanCert);
                        
                        // Parse the certificate
                        const certObj = forge.pki.certificateFromPem(cleanCert);
                        console.log('Certificate parsed successfully');
                        
                        // Parse CA certificate if provided
                        let caCertObj = null;
                        if (result.caCertificate) {
                            const cleanCaCert = result.caCertificate
                                .replace(/\r\n/g, '\n')
                                .replace(/\n\n/g, '\n')
                                .trim()
                                .split('\n')
                                .map(line => line.trim())
                                .filter(line => line.length > 0)
                                .join('\n');
                            
                            caCertObj = forge.pki.certificateFromPem(cleanCaCert);
                            console.log('CA certificate parsed successfully');
                            
                            // Verify certificate chain
                            if (!certObj.verify(caCertObj)) {
                                throw new Error('Certificate chain verification failed');
                            }
                            console.log('Certificate chain verified successfully');
                        }
                        
                        // Generate fingerprint from certificate
                        console.log('Generating certificate fingerprint...');
                        const fingerprint = forge.md.sha256.create()
                            .update(forge.asn1.toDer(forge.pki.certificateToAsn1(certObj)).getBytes())
                            .digest()
                            .toHex();
                        console.log('Fingerprint generated:', fingerprint);
                        
                        console.log('Creating PKCS#12 file...');
                        const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
                            keyPair.privateKey,
                            [certObj, ...(caCertObj ? [caCertObj] : [])],
                            document.getElementById('passkey').value,
                            {
                                friendlyName: data.username,
                                algorithm: '3des',
                                generateLocalKeyId: true,
                                saltSize: 8,
                                iterations: 2048
                            }
                        );
                        console.log('PKCS#12 ASN.1 created');
                        
                        // Convert to binary format
                        const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
                        const buffer = new Uint8Array(p12Der.length);
                        for (let i = 0; i < p12Der.length; ++i) {
                            buffer[i] = p12Der.charCodeAt(i);
                        }
                        console.log('PKCS#12 DER encoded');
                        
                        // Download using Blob
                        console.log('Creating download blob...');
                        const blob = new Blob([buffer], { type: 'application/x-pkcs12' });
                        const url = URL.createObjectURL(blob);
                        console.log('Blob URL created:', url);
                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${data.username}.p12`;
                        console.log('Download link created, filename:', a.download);
                        
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        console.log('Redirecting to success page...');
                        window.location.href = result.redirectUrl || '/request/cert-request/success';
                    } catch (parseError) {
                        console.error('Error processing certificate:', parseError);
                        throw new Error(`Failed to process certificate: ${parseError.message}`);
                    }
                } else {
                    throw new Error(result.error || 'Failed to submit certificate request');
                }
            } catch (error) {
                console.error('Error during CSR generation or submission:', error);
                
                // Reset button state
                submitButton.querySelector('.mdc-button__label').textContent = originalButtonText;
                submitButton.disabled = false;
                
                // Show error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = error.message || 'An error occurred while processing your request. Please try again.';
                
                // Remove any existing error message
                const existingError = form.querySelector('.error-message');
                if (existingError) {
                    existingError.remove();
                }
                
                // Add new error message at the top of the form
                form.insertBefore(errorDiv, form.firstChild);
                
                // Scroll to the error message
                errorDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
});

// Add debouncing function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Generate a key pair for the certificate
 * @returns {Promise<Object>} The generated key pair
 */
async function generateKeyPair() {
    return new Promise((resolve, reject) => {
        try {
            const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
            resolve(keyPair);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Generate a CSR with the provided key pair and user data
 * @param {Object} keyPair - The key pair to use for the CSR
 * @param {Object} userData - The user data to include in the CSR
 * @returns {Promise<Object>} The generated CSR
 */
async function generateCSR(keyPair, userData) {
    return new Promise((resolve, reject) => {
        try {
            // Validate key pair
            if (!keyPair || !keyPair.publicKey || !keyPair.privateKey) {
                throw new Error('Invalid key pair');
            }

            // Validate user data
            if (!userData || !userData.username || !userData.email) {
                throw new Error('Missing required user data');
            }

            // Create CSR
            const csr = forge.pki.createCertificationRequest();
            
            // Set the public key
            csr.publicKey = keyPair.publicKey;
            
            // Build subject attributes to match CA certificate structure
            const subjectAttributes = [
                {
                    name: 'countryName',
                    value: 'US'
                },
                {
                    name: 'stateOrProvinceName',
                    value: 'California'
                },
                {
                    name: 'localityName',
                    value: 'San Francisco'
                },
                {
                    name: 'organizationName',
                    value: 'ogt11.com, llc'
                },
                {
                    name: 'organizationalUnitName',
                    value: 'Certificate Authority'
                },
                {
                    name: 'commonName',
                    value: userData.username
                },
                {
                    name: 'emailAddress',
                    value: userData.email
                }
            ];
            
            // Set the complete subject
            csr.setSubject(subjectAttributes);
            
            // Sign the CSR with SHA-256
            csr.sign(keyPair.privateKey, forge.md.sha256.create());
            
            // Verify the CSR
            if (!csr.verify()) {
                throw new Error('Failed to verify CSR signature');
            }

            resolve(csr);
        } catch (error) {
            console.error('Error generating CSR:', error);
            reject(error);
        }
    });
} 