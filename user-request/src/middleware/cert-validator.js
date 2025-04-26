/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const forge = require('node-forge');
const logger = require('../logger');
const userAdminService = require('../services/user-admin.service');

/**
 * Middleware to validate client certificates and set up certStatus
 */
async function certValidator(req, res, next) {
    // Initialize default certStatus
    req.certStatus = {
        valid: false,
        expired: false,
        invalid: false
    };
    
    req.user = null;

    // Check if we have a client certificate
    const clientCert = req.socket.getPeerCertificate();
    if (!clientCert || !Object.keys(clientCert).length) {
        // No certificate present
        return next();
    }

    try {
        // Parse the certificate
        const cert = forge.pki.certificateFromPem(clientCert.raw);
        
        // Extract email from subject alternative name
        const email = cert.extensions.find(ext => 
            ext.name === 'subjectAltName'
        )?.altNames.find(name => 
            name.type === 1 // rfc822Name (email)
        )?.value;

        if (!email) {
            logger.warn('Certificate missing email in subjectAltName');
            req.certStatus.invalid = true;
            return next();
        }

        // Check if certificate is expired
        const now = new Date();
        if (now > cert.validity.notAfter || now < cert.validity.notBefore) {
            logger.info(`Expired certificate presented for email: ${email}`);
            req.certStatus.expired = true;
            
            // Try to fetch user details
            const userData = await userAdminService.getUserByEmail(email);
            if (userData) {
                req.user = userData;
                // Automatically send validation email
                await userAdminService.sendValidationEmail(email);
            }
            return next();
        }

        // Verify certificate against our CA
        // This would be implemented based on your CA verification logic
        const isValidCert = await verifyCertificate(cert);
        if (!isValidCert) {
            logger.warn(`Invalid certificate presented for email: ${email}`);
            req.certStatus.invalid = true;
            return next();
        }

        // Certificate is valid, fetch user details
        const userData = await userAdminService.getUserByEmail(email);
        if (userData) {
            req.user = userData;
            req.certStatus.valid = true;
        } else {
            logger.warn(`No user found for valid certificate email: ${email}`);
            req.certStatus.invalid = true;
        }

    } catch (error) {
        logger.error('Error validating client certificate:', error);
        req.certStatus.invalid = true;
    }

    next();
}

/**
 * Verify certificate against our CA
 * This is a placeholder - implement based on your CA verification logic
 */
async function verifyCertificate(cert) {
    // Implementation would verify the certificate against your CA
    // and check revocation status
    return true; // Placeholder
}

module.exports = certValidator; 