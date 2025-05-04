/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import CSRGenerator from '../src/public/js/csr.js';

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
        input.addEventListener('input', () => {
            if (input.value) {
                mdcTextField.foundation.activateFocus();
            }
        });
    });

    // Initialize all buttons with ripple effect
    const buttons = document.querySelectorAll('.mdc-button');
    buttons.forEach(button => {
        const mdcButton = mdc.ripple.MDCRipple.attachTo(button);
    });
});

// Add debouncing function at the top
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

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cert-request-form');
  const csrGenerator = new CSRGenerator();
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      // Get form data
      const formData = new FormData(form);
      const userData = {
        username: formData.get('username'),
        email: formData.get('email')
      };
      
      // Generate key pair
      await csrGenerator.generateKeyPair();
      
      // Generate CSR
      const subject = [{
        name: 'commonName',
        value: userData.username
      }, {
        name: 'emailAddress',
        value: userData.email
      }];
      
      const csrPem = await csrGenerator.generateCSR(subject);
      
      // Send CSR to server
      const response = await fetch('/api/csr/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          csr: csrPem,
          userId: formData.get('userId'),
          username: userData.username,
          email: userData.email
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const {certificate, caCertificate, serialNumber} = await response.json();
      
      // Create PKCS#12
      const password = formData.get('password');
      const p12Base64 = await csrGenerator.createPKCS12(certificate, password);
      
      // Create download links
      const certificateLink = document.createElement('a');
      certificateLink.href = `data:application/x-x509-user-cert;base64,${btoa(certificate)}`;
      certificateLink.download = `${userData.username}.pem`;
      certificateLink.textContent = 'Download Certificate';
      
      const p12Link = document.createElement('a');
      p12Link.href = `data:application/x-pkcs12;base64,${p12Base64}`;
      p12Link.download = `${userData.username}.p12`;
      p12Link.textContent = 'Download PKCS#12';
      
      // Add links to page
      const resultDiv = document.getElementById('result');
      resultDiv.innerHTML = '';
      resultDiv.appendChild(certificateLink);
      resultDiv.appendChild(document.createElement('br'));
      resultDiv.appendChild(p12Link);
      
    } catch (error) {
      console.error('Certificate request failed:', error);
      alert('Failed to generate certificate. Please try again.');
    }
  });
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
 * @param {Object} userData - User details from the server
 * @returns {forge.pki.CertificationRequest}
 */
async function generateCSR(keyPair, userData) {
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keyPair.publicKey;
    
    csr.setSubject([
        { name: 'commonName', value: userData.displayName },
        { name: 'emailAddress', value: userData.email }
    ]);
    
    csr.sign(keyPair.privateKey, forge.md.sha256.create());
    return csr;
}

/**
 * Validate a username with the server
 * @param {string} username - The username to validate
 * @returns {Promise<boolean>}
 */
async function validateUsername(username) {
    try {
        const response = await fetch('/api/validate-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        return data.valid;
    } catch (error) {
        console.error('Username validation error:', error);
        return false;
    }
}

/**
 * Get user details from the server
 * @param {string} username - The username to look up
 * @returns {Promise<Object>}
 */
async function getUserDetails(username) {
    try {
        const response = await fetch(`/api/user/${username}`);
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
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

// Add function to populate form with user data
async function populateUserData(username) {
    try {
        const response = await fetch(`/api/user/${username}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        const userData = await response.json();
        
        // Populate form fields
        document.getElementById('name').value = userData.name;
        document.getElementById('email').value = userData.email;
        
        // Trigger Material Design label animation
        document.querySelectorAll('.mdc-text-field').forEach(textField => {
            if (textField.querySelector('input').value) {
                textField.classList.add('mdc-text-field--label-floating');
            }
        });
    } catch (error) {
        console.error('Error populating user data:', error);
    }
}

// Modify the username validation function to include auto-population
const debouncedValidation = debounce(async (username, statusDiv) => {
    if (username.length === 0) {
        statusDiv.textContent = '';
        statusDiv.className = 'mdc-text-field-helper-line';
        return;
    }
    
    statusDiv.textContent = 'Checking username...';
    statusDiv.className = 'mdc-text-field-helper-line pending';
    
    const isValid = await validateUsername(username);
    
    if (isValid) {
        statusDiv.textContent = '✓ Username verified';
        statusDiv.className = 'mdc-text-field-helper-line success';
        // Auto-populate form when username is valid
        await populateUserData(username);
    } else {
        statusDiv.textContent = '✗ Username not found';
        statusDiv.className = 'mdc-text-field-helper-line error';
        // Clear form fields when username is invalid
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
    }
}, 300);

document.getElementById('username').addEventListener('input', function(e) {
    const username = e.target.value.trim();
    const statusDiv = document.getElementById('username-status');
    debouncedValidation(username, statusDiv);
}); 