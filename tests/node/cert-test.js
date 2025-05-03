const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const forge = require('node-forge');

// Configuration
const CONFIG = {
  certCreateUrl: 'http://localhost:3000/api/sign-certificate',
  certAdminUrl: 'http://localhost:3003',
  userAdminUrl: 'http://localhost:3004',
  numRequests: 2,
  tempDir: '/tmp/cert-test-node',
  domains: ['example.com', 'test.com', 'demo.com', 'stress.com', 'load.com'],
  organizations: ['TestCorp', 'StressInc', 'LoadTest LLC', 'Demo Corp', 'Example Inc'],
  namePrefixes: ['Test', 'Stress', 'Load', 'Demo', 'Sample', 'Mock', 'Fake'],
  nameSuffixes: ['User', 'Admin', 'Dev', 'Ops', 'QA', 'Test', 'Eng']
};

// Test results storage
const results = {
  total: 0,
  completed: 0,
  validated: 0,
  inDatabase: 0,
  failed: 0,
  errors: []
};

// Utility functions
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateUsername = () => {
  const prefix = randomElement(CONFIG.namePrefixes);
  const suffix = randomElement(CONFIG.nameSuffixes);
  const number = Math.floor(Math.random() * 1000);
  return `${prefix}${suffix}${number}`;
};

// Generate key pair and CSR
async function generateKeyAndCSR(username, email, organization) {
  // Generate key pair
  const keys = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Create CSR using openssl command
  const spawn = require('child_process').spawn;
  const configContent = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = California
L = San Francisco
O = ${organization}
OU = IT Department
CN = ${username}
emailAddress = ${email}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
email = ${email}
`;

  // Write config and key to temporary files
  const tempDir = CONFIG.tempDir;
  const configFile = path.join(tempDir, `${username}-openssl.cnf`);
  const keyFile = path.join(tempDir, `${username}-key.pem`);
  
  await writeFile(configFile, configContent);
  await writeFile(keyFile, keys.privateKey);

  return new Promise((resolve, reject) => {
    const openssl = spawn('openssl', [
      'req',
      '-new',
      '-config', configFile,
      '-key', keyFile,
      '-nodes'
    ]);

    let csrData = '';
    let errorData = '';

    openssl.stdout.on('data', (data) => {
      csrData += data;
    });

    openssl.stderr.on('data', (data) => {
      errorData += data;
    });

    openssl.on('close', (code) => {
      // Clean up temporary files
      fs.unlink(configFile, () => {});
      fs.unlink(keyFile, () => {});

      if (code === 0) {
        resolve({
          privateKey: keys.privateKey,
          csr: csrData
        });
      } else {
        reject(new Error(`OpenSSL failed: ${errorData}`));
      }
    });
  });
}

// Validate certificate
function validateCertificate(cert, username, email) {
  try {
    const x509 = new crypto.X509Certificate(cert);
    
    // Basic format validation
    if (!x509.subject || !x509.issuer) {
      throw new Error('Invalid certificate format');
    }

    // Validate subject fields
    const subject = x509.subject;
    if (!subject.includes(`CN=${username}`)) {
      throw new Error('Common Name mismatch');
    }
    if (!subject.includes(`emailAddress=${email}`)) {
      throw new Error('Email mismatch');
    }

    // Get raw extensions using forge for detailed validation
    const forge = require('node-forge');
    const forgeCert = forge.pki.certificateFromPem(cert);
    
    // Validate basic constraints
    const basicConstraints = forgeCert.extensions.find(
      ext => ext.name === 'basicConstraints'
    );
    if (!basicConstraints || basicConstraints.cA) {
      throw new Error('Invalid basic constraints');
    }

    // Validate key usage
    const keyUsage = forgeCert.extensions.find(
      ext => ext.name === 'keyUsage'
    );
    if (!keyUsage || !keyUsage.digitalSignature) {
      throw new Error('Missing required key usage');
    }

    return true;
  } catch (error) {
    throw new Error(`Certificate validation failed: ${error.message}`);
  }
}

// Generate PKCS#12 file
async function generatePKCS12(cert, privateKey, password) {
  const p12 = forge.pkcs12.toPkcs12Asn1(
    forge.pki.privateKeyFromPem(privateKey),
    [forge.pki.certificateFromPem(cert)],
    password,
    {
      generateLocalKeyId: true,
      algorithm: '3des',
      iterations: 2048
    }
  );

  const p12Der = forge.asn1.toDer(p12).getBytes();
  const p12Base64 = forge.util.encode64(p12Der);
  return p12Base64;
}

// Validate PKCS#12 file
async function validatePKCS12(p12Base64, password) {
  const p12Der = forge.util.decode64(p12Base64);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  
  // Get the key and certificate
  const keyBag = p12.getBags({bagType: forge.pki.oids.pkcs8ShroudedKeyBag})[forge.pki.oids.pkcs8ShroudedKeyBag];
  const certBag = p12.getBags({bagType: forge.pki.oids.certBag})[forge.pki.oids.certBag];
  
  if (!keyBag || keyBag.length === 0) {
    throw new Error('No private key found in PKCS#12');
  }
  if (!certBag || certBag.length === 0) {
    throw new Error('No certificate found in PKCS#12');
  }
  
  return {
    privateKey: forge.pki.privateKeyToPem(keyBag[0].key),
    certificate: forge.pki.certificateToPem(certBag[0].cert)
  };
}

// Make certificate request
async function requestCertificate(id) {
  try {
    const username = generateUsername();
    const domain = randomElement(CONFIG.domains);
    const organization = randomElement(CONFIG.organizations);
    const email = `${username}@${domain}`;

    // Generate key and CSR
    const { privateKey, csr } = await generateKeyAndCSR(username, email, organization);

    // Make request to cert-create
    const response = await axios.post(CONFIG.certCreateUrl, {
      csr,
      username,
      validationToken: null // We're not using validation tokens in the test
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    // Validate response
    if (!response.data.certificate) {
      throw new Error('No certificate in response');
    }

    // Validate certificate
    validateCertificate(response.data.certificate, username, email);

    // Generate PKCS#12
    const password = 'test123';
    const p12Base64 = await generatePKCS12(response.data.certificate, privateKey, password);
    
    // Validate PKCS#12
    const { privateKey: extractedKey, certificate: extractedCert } = await validatePKCS12(p12Base64, password);
    
    // Verify extracted certificate matches original
    if (extractedCert !== response.data.certificate) {
      throw new Error('Extracted certificate does not match original');
    }
    
    // Verify extracted key matches original
    if (extractedKey !== privateKey) {
      throw new Error('Extracted private key does not match original');
    }

    // Save files for inspection
    const outputDir = path.join(CONFIG.tempDir, username);
    await mkdir(outputDir, { recursive: true });
    
    await writeFile(path.join(outputDir, 'certificate.pem'), response.data.certificate);
    await writeFile(path.join(outputDir, 'private-key.pem'), privateKey);
    await writeFile(path.join(outputDir, 'certificate.p12'), Buffer.from(p12Base64, 'base64'));
    
    console.log(`Certificate and PKCS#12 files saved to ${outputDir}`);

    return {
      certificate: response.data.certificate,
      privateKey,
      p12Base64,
      username,
      email,
      serialNumber: response.data.serialNumber
    };
  } catch (error) {
    console.error(`Request ${id} failed:`, error);
    throw error;
  }
}

// Main test function
async function runTest() {
  console.log('Starting certificate test...');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Create temp directory
    await mkdir(CONFIG.tempDir, { recursive: true });

    // Run requests
    results.total = CONFIG.numRequests;
    const requests = Array.from({ length: CONFIG.numRequests }, (_, i) => 
      requestCertificate(i + 1)
    );

    const outcomes = await Promise.all(requests);

    // Print results
    console.log('\nTest Results:');
    console.log('=============');
    console.log(`Total requests: ${results.total}`);
    console.log(`Completed: ${results.completed}`);
    console.log(`Validated: ${results.validated}`);
    console.log(`Found in Database: ${results.inDatabase}`);
    console.log(`Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\nErrors:');
      console.log('=======');
      results.errors.forEach(error => {
        console.log(`\nRequest ${error.id}:`);
        console.log(`Error: ${error.error}`);
        if (error.response) {
          console.log('Response:', error.response);
        }
      });
    }

    // Save detailed results
    const resultFile = path.join(CONFIG.tempDir, 'test-results.json');
    await writeFile(resultFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      outcomes
    }, null, 2));

    console.log(`\nDetailed results saved to: ${resultFile}`);

  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest(); 