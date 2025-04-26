/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a version string that includes timestamp and hash
function generateVersion() {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const randomBytes = crypto.randomBytes(4).toString('hex');
    return `cert-admin-${timestamp}-${randomBytes}`;
}

// Create version info object
const versionInfo = {
    version: generateVersion(),
    timestamp: new Date().toISOString(),
    node_version: process.version,
    platform: process.platform,
    arch: process.arch
};

// Ensure the dist directory exists
const targetDir = path.join(__dirname, '..', 'dist');
fs.mkdirSync(targetDir, { recursive: true });

// Write version to file
const versionFile = path.join(targetDir, 'version.json');
fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));

console.log('Generated version:', versionInfo.version); 