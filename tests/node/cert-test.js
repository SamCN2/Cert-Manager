const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Configuration
const CONFIG = {
  certCreateUrl: 'http://localhost:3000/api/sign-certificate',
  certAdminUrl: 'http://localhost:3003',
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

// Make certificate request
async function requestCertificate(id) {
  try {
    const username = generateUsername();
    const domain = randomElement(CONFIG.domains);
    const organization = randomElement(CONFIG.organizations);
    const email = `${username}@${domain}`;

    // Generate key and CSR
    const { csr } = await generateKeyAndCSR(username, email, organization);

    // Make request to cert-create
    const response = await axios.post(CONFIG.certCreateUrl, {
      csr,
      userData: { username, email }
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
    results.validated++;

    // Check database
    try {
      const dbResponse = await axios.get(
        `${CONFIG.certAdminUrl}/certificates/${response.data.serialNumber}`
      );
      if (dbResponse.data) {
        results.inDatabase++;
      }
    } catch (dbError) {
      console.log(`Warning: Certificate not found in database (serial: ${response.data.serialNumber})`);
    }

    results.completed++;
    return {
      id,
      username,
      email,
      serialNumber: response.data.serialNumber,
      success: true
    };

  } catch (error) {
    results.failed++;
    results.errors.push({
      id,
      error: error.message,
      response: error.response?.data
    });
    return {
      id,
      error: error.message,
      success: false
    };
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