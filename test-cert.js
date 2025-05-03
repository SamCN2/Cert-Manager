const fs = require('fs');
const { execSync } = require('child_process');

// Base64 certificate data
const base64Data = 'MIIDpDCCAoygAwIBAgISAZaPfxdC3Z7FgMMQE61jdAMA0GCSqGSIb3DQEBCwUAMIGIMQswCQYDVQQGEwJVczELMAkGA1UECAwCTUQxETAPBgNVBAcMCEJldGhlc2RhMQ4wDAYDVQQKDAVvZ3QxMTEQMA4GA1UECwwHaG9zdGluZzESMBAGA1UEAwwJb2d0MTEuY29tMSMwIQYJKoZIhvcNAQkBFhRob3N0bWFzdGVyQG9ndDExLmNvbTAeFw0yNTA1MDIwNTM1MzlaFw0yNjA1MDIwNTM1MzlaMCwxCjAIBgNVBAMTAWMxHjAcBgkqhkiG9w0BCQETD2NAdGVzdGVtYWlsLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALy5Tv1qDJA0TBTglArfIHdESNvQOw2+WSQz3oGXTa6aCzpzTPBtlsglmXYQUv7m3eB13R1cvHRnZU97WTwt/xFdwarlZto/yyfmBvT9UNgYS1LOvr6lhdzww7B8PBnwaSwblKd2Og8FbEtaBPT8jRG4xnPOze3DMq0Qpru+V1faQjsfK884v6fQDADua2+ZN3T14REAEhoAP/1nQmhcj9tr8rd1KYg1mVpp1JhG6ZXPCRArcXckZPh1mRV0WV4l0ydEvx+0k5Ik/8xLD75mG1d8iir00eeOOZyIkMfp62EjpCPvONMwpgl+oLSZK7V9wsQP2To/wRE1dF1PLejBZjUCAwEAAaNjMGEwCQYDVR0TBAIwADALBgNVHQ8EBAMCBeAwHQYDVR0lBBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMB0GA1UdDgQWBBSRJFwUbjHpHa1AlAbKp3nGLlUMBjAJBgNVHSMEAjAAMA0GCSqGSIb3DQEBCwUAA4IBAQAbcVmk7QXOr63tP5CMh7Se5O9O2FCn0/8hJeCo5A9LBM7DRcycqDToqtOYwqrg08KmHZ+5HODCTQ9Pvt0E1qWWAc30K7DtjxDoFboSKeL4ty0w8IdHSAlxiYY+cg/NYNjCotAy1ZRj/TLVHcPAYDA+ScJn46Lia+iHPU3zh0zsZM70POjKendjhjyC5X48aucwzfiGs5FVkVcBEU60wOdfhM0fTqVKLqxTaAoLQ7HlDpyMfEEhWokxDX4cLw8i2pB0OYQlCT3qaVbt+ZRA4Y2/lCn4A04HUfhebb8zLD76CtPSClrxK3t1PBUEU6NCzm89fq7btqAoMSQg0T1yRe83';

// Convert base64 to binary
const binaryData = Buffer.from(base64Data, 'base64');

// Write binary data to file
fs.writeFileSync('test-cert.der', binaryData);

// Convert DER to PEM using OpenSSL
try {
    execSync('openssl x509 -inform DER -in test-cert.der -outform PEM -out test-cert.pem');
    const result = execSync('openssl x509 -in test-cert.pem -text -noout').toString();
    console.log('\nCertificate is valid!');
    console.log(result);
} catch (error) {
    console.error('\nCertificate verification failed:', error.stderr.toString());
}

// Show file info
console.log('\nFile info:');
console.log(execSync('ls -l test-cert.pem').toString());
console.log(execSync('file test-cert.pem').toString()); 