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

import {X509CertificationRequest} from '@peculiar/x509';

class CSRGenerator {
  constructor() {
    this.keyPair = null;
  }

  async generateKeyPair(curve = 'P-384') {
    try {
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: curve
        },
        true,
        ['sign', 'verify']
      );
      
      return this.keyPair;
    } catch (error) {
      console.error('Key pair generation failed:', error);
      throw error;
    }
  }

  async generateCSR(subject) {
    if (!this.keyPair) {
      throw new Error('Key pair not generated. Call generateKeyPair() first.');
    }

    try {
      // Create CSR
      const csr = new X509CertificationRequest();
      
      // Set public key
      csr.publicKey = this.keyPair.publicKey;
      
      // Set subject
      csr.subject = subject;
      
      // Add extensions
      csr.extensions = [
        {
          name: 'basicConstraints',
          critical: true,
          cA: false,
        },
        {
          name: 'keyUsage',
          critical: true,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true,
          emailProtection: true,
        }
      ];
      
      // Sign CSR
      await csr.sign(this.keyPair.privateKey, 'sha256');
      
      // Convert to PEM
      return csr.toString('pem');
    } catch (error) {
      console.error('CSR generation failed:', error);
      throw error;
    }
  }

  async createPKCS12(certificate, password) {
    if (!this.keyPair) {
      throw new Error('Key pair not generated. Call generateKeyPair() first.');
    }

    try {
      // Create PKCS#12 container
      const p12 = new X509CertificationRequest();
      
      // Add certificate and private key
      p12.addCertificate(certificate);
      p12.addPrivateKey(this.keyPair.privateKey);
      
      // Convert to PKCS#12 format
      const p12Bytes = await p12.toPKCS12(password);
      
      // Convert to base64
      return btoa(String.fromCharCode(...new Uint8Array(p12Bytes)));
    } catch (error) {
      console.error('PKCS#12 creation failed:', error);
      throw error;
    }
  }
}

export default CSRGenerator;

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

async function createAndDownloadPKCS12(certObj, privateKey, password) {
    console.log('Creating PKCS#12...');
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
        privateKey,
        [certObj],
        password,
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