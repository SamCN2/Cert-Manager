/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const EmailService = require('../services/email.service');
const UserAdminService = require('../services/user-admin.service');
const { validateEmail, verifyValidationToken, router: validationRouter } = require('../controllers/validation.controller');
const { router: certRequestRouter } = require('../controllers/cert-request.controller');
const logger = require('../logger');
const config = require('../config');
const forge = require('node-forge');
const axios = require('axios');

// Create service instances
const emailService = new EmailService();
const userAdminService = new UserAdminService();

// Use the validation router for revalidate routes
router.use('/revalidate', validationRouter);

// Use the validation router for validate routes
router.use('/validate', validationRouter);

// Use the cert-request router for certificate request routes
router.use('/cert-request', certRequestRouter);

// API endpoints
router.post('/api/cert-request', async (req, res) => {
    try {
        const { username, email, validationToken, csr } = req.body;
        
        if (!username || !email || !validationToken || !csr) {
            return res.status(400).json({
                error: 'Missing required parameters'
            });
        }
        
        try {
            // Verify validation token
            const request = await userAdminService.findByChallengeToken(validationToken);
            if (!request) {
                return res.status(400).json({
                    error: 'Invalid or expired validation token'
                });
            }
            
            // Submit certificate request to the certificate signing endpoint
            const response = await axios.post(
                `${config.certRequestUrl}/api/sign-certificate`,
                {
                    csr: csr,
                    username: username,
                    validationToken: validationToken
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
    } catch (error) {
        logger.error('Error in cert-request API:', error);
        return res.status(500).json({
            error: 'An error occurred while processing your request'
        });
    }
});

// Certificate signing endpoint
router.post('/cert-create/api/sign-certificate', async (req, res) => {
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
                const request = await userAdminService.findByChallengeToken(validationToken);
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

// Debug route
router.get('/debug', (req, res) => {
  res.render('debug', {
    title: 'Debug Information',
    isCertRequestPage: true,
    requestInfo: JSON.stringify({
      url: req.url,
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body
    }, null, 2),
    userData: JSON.stringify({
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User'
    }, null, 2),
    validationToken: 'test-token'
  });
});

// Home page - User request form
router.get('/', (req, res) => {
  res.render('request-form', {
    title: 'Request User Account'
  });
});

// Check username availability - following API conventions
router.get('/api/user-admin/users/check-username/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const available = await userAdminService.checkUsername(username);
    res.json({ available });
  } catch (error) {
    logger.error('Error checking username:', {
      username,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to check username',
      message: error.message
    });
  }
});

// Handle user request submission
router.post('/', async (req, res) => {
  const { displayName, email, username } = req.body;
  logger.info('Processing user request:', { username, email, displayName });

  try {
    // Check username availability one more time
    logger.info('Checking username availability:', { username });
    const available = await userAdminService.checkUsername(username);
    if (!available) {
      logger.info('Username no longer available:', { username });
      return res.render('request-form', {
        title: 'Request User Account',
        error: 'Username is no longer available. Please choose another.',
        displayName,
        email
      });
    }

    // Generate validation token
    logger.info('Generating validation token for:', username);
    const token = emailService.generateValidationToken(username, email);
    logger.info('Generated token:', { username, token: token.substring(0, 8) + '...' });

    // Create pending user in user-admin with the challenge token
    logger.info('Creating pending user:', { username, displayName, email });
    try {
      const userData = {
        username,
        displayName,
        email,
        challenge: token
      };
      const savedRequest = await userAdminService.createPendingUser(userData);
      logger.info('Created pending user request:', { username, requestId: savedRequest.id });
    } catch (error) {
      logger.error('Error creating pending user:', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error('Failed to create pending user: ' + error.message);
    }

    // Send validation email
    logger.info('Sending validation email to:', { username, email });
    try {
      await emailService.sendValidationEmail(username, email, token);
      logger.info('Sent validation email:', { username, email });
    } catch (error) {
      logger.error('Error sending validation email:', {
        error: error.message,
        stack: error.stack,
        username,
        email
      });
      throw new Error('Failed to send validation email: ' + error.message);
    }

    res.render('request-success', {
      title: 'Check Your Email',
      username,
      email
    });
  } catch (error) {
    logger.error('Error processing user request:', {
      phase: error.message.includes('validation email') ? 'email' : 
             error.message.includes('pending user') ? 'create_user' : 'unknown',
      error: error.message,
      stack: error.stack,
      request: { username, email, displayName }
    });
    res.render('request-form', {
      title: 'Request User Account',
      error: error.message || 'Failed to process your request. Please try again.',
      displayName,
      email,
      username
    });
  }
});

// Success page route
router.get('/validation-success', async (req, res) => {
  // Check if we have a validation token in the session or query params
  const validationToken = req.query.token || req.session?.validationToken;
  
  if (validationToken) {
    try {
      // Find the request by challenge token
      const request = await userAdminService.findByChallengeToken(validationToken);
      if (request) {
        // Redirect to cert-request with the required parameters
        const userDataParam = encodeURIComponent(JSON.stringify({
          username: request.username,
          email: request.email,
          displayName: request.displayName || request.username
        }));
        return res.redirect(`${config.certRequestUrl}?userData=${userDataParam}&validationToken=${validationToken}`);
      }
    } catch (error) {
      logger.error('Error redirecting from validation-success:', error);
    }
  }
  
  // If we can't redirect, show the success page
  res.render('validation-success', {
    message: 'Your email has been validated and your account is now active.'
  });
});

// Handle redirect to cert-request
router.get('/redirect-to-cert-request', async (req, res) => {
    try {
        const { userData, validationToken } = req.query;
        
        if (!userData || !validationToken) {
            logger.error('Missing required parameters for cert-request redirect', {
                userData: !!userData,
                validationToken: !!validationToken
            });
            return res.render('validation-error', {
                title: 'Validation Error',
                error: 'Missing required parameters for certificate request'
            });
        }

        let user;
        try {
            user = JSON.parse(decodeURIComponent(userData));
            logger.info('Successfully parsed user data', { 
                username: user.username,
                email: user.email
            });
        } catch (parseError) {
            logger.error('Failed to parse user data', {
                error: parseError.message,
                userData
            });
            return res.render('validation-error', {
                title: 'Validation Error',
                error: 'Invalid user data format'
            });
        }
        
        // Get user groups
        const groups = await userAdminService.getUserGroups(user.username);
        logger.info('Retrieved user groups', { 
            username: user.username,
            groupCount: groups.length
        });
        
        // Render the cert-request form with user data and groups
        return res.render('cert-request-form', {
            title: 'Request Certificate',
            user,
            groups,
            validationToken
        });
    } catch (error) {
        logger.error('Error processing cert-request redirect:', {
            error: error.message,
            stack: error.stack
        });
        return res.render('validation-error', {
            title: 'Validation Error',
            error: 'An error occurred while processing your certificate request'
        });
    }
});

module.exports = router; 