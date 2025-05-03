const fs = require('fs');
const path = require('path');
const forge = require('node-forge');
const { execSync } = require('child_process');

// The certificate from the response
const certificate = `-----BEGIN CERTIFICATE-----
MIIDpDCCAoygAwIBAgISAZaPjo8CHPJ1IHlmMKcXN4MA0GCSqGSIb3DQEBCwUAMI
GIMQswCQYDVQQGEwJVczELMAkGA1UECAwCTUQxETAPBgNVBAcMCEJldGhlc2RhMQ
4wDAYDVQQKDAVvZ3QxMTEQMA4GA1UECwwHaG9zdGluZzESMBAGA1UEAwwJb2d0MT
EuY29tMSMwIQYJKoZIhvcNAQkBFhRob3N0bWFzdGVyQG9ndDExLmNvbTAeFw0yNT
A1MDIwNTUyMTBaFw0yNjA1MDIwNTUyMTBaMCwxCjAIBgNVBAMTAWMxHjAcBgkqhk
iG9w0BCQETD2NAdGVzdGVtYWlsLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPAD
CCAQoCggEBALejXp/R9+x6AcqmITNtOMfQj8udYFWE9xYA1cyNI+tY+qr3q7dhRg
YzUFtpaNk0jXAmRFlme1b99pyGuglJWpHLfv7EmBzhGe5l0lUEH0F1w49pt3Ab1F
VEYO5jOQAi5rWAd25/MlwrUdO/PeZFVi+yk+50C51Fei7NIe7FdJEZHn2y1+jhwK
ie4BmQ1rW6s6rPz/ZWiP/ScHqdOdlPOq6L3aPFBVyIHYuxta1y6+akfhVEghGl2Y
VtEXSiL9pz+L87GZ931luz5tYChKCARP+qxUnAXrTZh+sKJfoeDmTEZoREYEFbhp
o70H0A6hAzXIUxpVKDvDtXy/BPspHfEncCAwEAAaNjMGEwCQYDVR0TBAIwADALBg
NVHQ8EBAMCBeAwHQYDVR0lBBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMB0GA1UdDg
QWBBQ6qUQZZs7vK72Ptuq3n+ubPbfz6zAJBgNVHSMEAjAAMA0GCSqGSIb3DQEBCw
UAA4IBAQAkboazpQvylWyxOjHa6hYFepnadGw+0FaIuiVP5iYzsueaZS4JhJmp1G
cU68N6WMAdJPZ6sVST8lxCQuH9QpOURxEDppKfbBGGl9FO2jnSdpMy8W5GVqe36o
+EsW3/MKzMGQ18wBe0FvlBLf8H2Q26MK+PRPJybsWDeUHWAuI8cskavYbvlsJdrz
hchZqMl9xiZhPKEbw2Wlu1zH9p7MZRzoFZe6fJa1GrZLz/Iu4cDas5JBa0bJKnFM
Gh1QMzlTcSpkxqbLXEXwG08ArJpo1HBMnwuzRAoDI1fRjMBKDYfGLwFZl0Fb3e0N
gAeh3Kn1fNrRpki2uRG0+Vcn36yoa2
-----END CERTIFICATE-----`;

// Create temporary directory
const tempDir = '/tmp/cert-test-temp';
fs.mkdirSync(tempDir, { recursive: true });

try {
    // Extract and clean the base64 data
    const base64Data = certificate
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .split(/[\r\n]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('');
    
    // Create a properly formatted PEM file
    const pemData = '-----BEGIN CERTIFICATE-----\n' +
        base64Data.match(/.{1,64}/g).join('\n') +
        '\n-----END CERTIFICATE-----\n';
    
    // Write the normalized certificate to a file
    const pemFile = path.join(tempDir, 'cert.pem');
    fs.writeFileSync(pemFile, pemData, 'utf8');
    
    // Display the normalized certificate
    console.log('Normalized certificate:');
    console.log(pemData);
    
    // Verify with OpenSSL
    console.log('\nVerifying with OpenSSL...');
    const result = execSync(`openssl x509 -in ${pemFile} -text -noout`).toString();
    console.log(result);
    
    // Try to create PKCS#12
    console.log('\nCreating PKCS#12...');
    const p12File = path.join(tempDir, 'cert.p12');
    execSync(`openssl pkcs12 -export -in ${pemFile} -nokeys -out ${p12File} -passout pass:test123`);
    console.log('PKCS#12 file created successfully');
    
} catch (error) {
    console.error('Error:', error.message || error.stderr?.toString() || error);
} finally {
    // Clean up
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
        // Ignore cleanup errors
    }
} 