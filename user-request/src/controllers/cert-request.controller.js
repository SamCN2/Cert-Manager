/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const config = require('../config');
const UserAdminService = require('../services/user-admin.service');
const UserRequestService = require('../services/user-request.service');
const axios = require('axios');
const crypto = require('crypto');
const forge = require('node-forge');

// Create service instances
const userAdminService = new UserAdminService();
const userRequestService = new UserRequestService();

// GET / - Show certificate request form
router.get('/', async (req, res) => {
    try {
        const { username, email, displayName, validationToken, groups } = req.query;
        
        if (!username || !email || !validationToken) {
            return res.render('cert-request-form', {
                title: 'Request Certificate',
                error: 'Please use the validation link from your email to access this page.',
                groups: [],
                isCertRequestPage: true
            });
        }

        // Parse groups if present
        let parsedGroups = [];
        if (groups) {
            try {
                parsedGroups = JSON.parse(groups);
            } catch (error) {
                logger.error('Error parsing groups:', error);
            }
        }

        return res.render('cert-request-form', {
            title: 'Request Certificate',
            error: null,
            username,
            email,
            displayName,
            validationToken,
            groups: parsedGroups,
            isCertRequestPage: true
        });
    } catch (error) {
        logger.error('Error rendering cert-request form:', error);
        return res.render('cert-request-form', {
            title: 'Request Certificate',
            error: 'An error occurred while loading the form. Please try again.',
            groups: [],
            isCertRequestPage: true
        });
    }
});

// POST / - Show certificate request form with user data
router.post('/', async (req, res) => {
    const { userData, validationToken } = req.body;
    let username, email, displayName;
    
    if (!userData || !validationToken) {
        return res.render('cert-request-form', {
            title: 'Request Certificate',
            error: 'Missing required parameters',
            groups: [],
            isCertRequestPage: true
        });
    }

    try {
        const user = JSON.parse(userData);
        username = user.username;
        email = user.email;
        displayName = user.displayName || username;

        // Verify validation token
        const request = await userRequestService.findByChallengeToken(validationToken);
        if (!request) {
            return res.render('cert-request-form', {
                title: 'Request Certificate',
                error: 'Invalid or expired validation token',
                groups: [],
                isCertRequestPage: true
            });
        }

        // Get user groups
        const groups = await userAdminService.getUserGroups(username);
        
        return res.render('cert-request-form', {
            title: 'Request Certificate',
            error: null,
            username,
            email,
            displayName,
            validationToken,
            groups: groups || [],
            isCertRequestPage: true
        });
    } catch (error) {
        logger.error('Error processing certificate request form:', error);
        return res.render('cert-request-form', {
            title: 'Request Certificate',
            error: 'An error occurred while processing your request',
            groups: [],
            isCertRequestPage: true
        });
    }
});

// GET /success - Show certificate request success page
router.get('/success', (req, res) => {
    res.render('cert-request-success', {
        title: 'Certificate Request Submitted',
        isCertRequestPage: true
    });
});

// POST /api/cert-request - API endpoint for certificate requests
router.post('/api/cert-request', async (req, res) => {
    const { username, email, validationToken, csr } = req.body;
    
    if (!username || !email || !validationToken || !csr) {
        return res.status(400).json({
            error: 'Missing required parameters'
        });
    }
    
    try {
        // Verify validation token
        const request = await userRequestService.findByChallengeToken(validationToken);
        if (!request) {
            return res.status(400).json({
                error: 'Invalid or expired validation token'
            });
        }
        
        // Submit CSR to the cert-admin service for signing
        const response = await axios.post(
            `${config.certAdminUrl}/csr/sign`,
            {
                csr: csr,
                userId: request.id,
                username: username,
                email: email
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
        
        return res.json({
            status: 'success',
            message: 'Certificate request submitted successfully',
            certificate: response.data.certificate,
            serialNumber: response.data.serialNumber,
            redirectUrl: '/request/cert-request/success'
        });
    } catch (error) {
        const errorDetails = {
            message: error.response?.data?.error?.message || error.message,
            status: error.response?.status,
            path: error.config?.url
        };
        logger.error('Error submitting certificate request:', errorDetails);
        return res.status(500).json({
            error: 'An error occurred while processing your certificate request'
        });
    }
});

// POST /api/sign-certificate - Certificate signing endpoint
router.post('/api/sign-certificate', async (req, res) => {
    try {
        const { csr, username, validationToken } = req.body;
        
        if (!csr || !username) {
            return res.status(400).json({ error: 'Missing CSR or username' });
        }

        logger.info('Received certificate signing request', {
            username,
            validationToken: validationToken ? 'Present' : 'Missing'
        });

        // Verify validation token if provided
        if (validationToken) {
            try {
                const request = await userRequestService.findByChallengeToken(validationToken);
                if (!request) {
                    return res.status(400).json({ error: 'Invalid or expired validation token' });
                }
                logger.info('Validation token verified successfully');
            } catch (error) {
                logger.error('Error verifying validation token:', error);
                return res.status(400).json({ error: 'Error verifying validation token' });
            }
        }

        // Fetch user details from user-admin
        const userData = await userAdminService.getUserDetails(username);
        logger.info('Fetched user details', { username });

        // Parse and verify the CSR
        const csrObj = forge.pki.certificationRequestFromPem(csr);
        logger.info('CSR parsed successfully');

        if (!csrObj.verify()) {
            return res.status(400).json({ error: 'Invalid CSR' });
        }
        logger.info('CSR verified successfully');

        // Submit certificate request to cert-admin
        const response = await submitCertificateRequest(username, csr, validationToken);
        
        return res.json({
            status: 'success',
            message: 'Certificate signed successfully',
            certificate: response.certificate,
            serialNumber: response.serialNumber
        });
    } catch (error) {
        const errorDetails = {
            message: error.response?.data?.error?.message || error.message,
            status: error.response?.status,
            path: error.config?.url
        };
        logger.error('Error signing certificate:', errorDetails);
        return res.status(500).json({
            error: 'An error occurred while signing the certificate'
        });
    }
});

/**
 * Generate a CSR for the certificate request
 * @param {string} username - The username
 * @param {string} email - The email address
 * @param {string|null} group - The group name (optional)
 * @returns {Promise<string>} - The CSR in PEM format
 */
async function generateCSR(username, email, group) {
    // For now, we'll use a placeholder CSR
    // In a real implementation, this would generate a proper CSR
    // If group is null or undefined, we'll generate a CSR without group information
    const groupInfo = group ? `Group: ${group}` : 'No group selected';
    
    return `-----BEGIN CERTIFICATE REQUEST-----
MIICvDCCAaQCAQAwdzELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQH
Ew1TYW4gRnJhbmNpc2NvMRMwEQYDVQQKEwpFeGFtcGxlIEluYy4xFzAVBgNVBAsT
DkV4YW1wbGUgR3JvdXAgMTESMBAGA1UEAxMJZXhhbXBsZS5jb20wggEiMA0GCSqG
SIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7VJTUt9Us8cKllMjeYH9HlN0H3hz1+8J
-----END CERTIFICATE REQUEST-----`;
}

/**
 * Submit a certificate request to the cert-admin service
 * @param {string} username - The username
 * @param {string} csr - The CSR in PEM format
 * @param {string} validationToken - The validation token
 * @returns {Promise<Object>} - The response from the cert-admin service
 */
async function submitCertificateRequest(username, csr, validationToken) {
    try {
        // Get the user's request using the validation token
        const userRequest = await userRequestService.findByChallengeToken(validationToken);
        if (!userRequest) {
            throw new Error('User request not found');
        }

        // Parse and verify the CSR
        const csrObj = forge.pki.certificationRequestFromPem(csr);
        if (!csrObj.verify()) {
            throw new Error('Invalid CSR');
        }

        // Generate a fingerprint from the CSR
        const fingerprint = crypto
            .createHash('sha256')
            .update(csr)
            .digest('hex');

        // Create the certificate request in the format expected by cert-admin
        const certificateRequest = {
            username: username,
            commonname: username,
            email: userRequest.email,
            fingerprint: fingerprint,
            userid: userRequest.id,
            status: 'pending',
            code_version: require('../../package.json').version,
            createdat: new Date(),
            is_first_certificate: true
        };

        // Submit the request to cert-admin
        const response = await axios.post(
            `${config.certAdminUrl}/certificate`,
            certificateRequest,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        const errorDetails = {
            message: error.response?.data?.error?.message || error.message,
            status: error.response?.status,
            path: error.config?.url
        };
        logger.error('Error submitting certificate request:', errorDetails);
        throw error;
    }
}

module.exports = {
    router
}; 