/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const crypto = require('crypto');
const UserAdminService = require('../services/user-admin.service');
const logger = require('../logger');
const config = require('../config');
const express = require('express');
const router = express.Router();
const EmailService = require('../services/email.service');
const UserRequestService = require('../services/user-request.service');

// Create instance of UserAdminService
const userAdminService = new UserAdminService();
const emailService = new EmailService();
const userRequestService = new UserRequestService();

/**
 * Generate a validation token
 * @returns {string}
 */
function generateValidationToken() {
    const hmac = crypto.createHmac('sha256', config.validationSecret);
    hmac.update(Date.now().toString());
    return hmac.digest('hex');
}

/**
 * Handle email validation
 */
const validateEmail = async (req, res) => {
    try {
        const { token } = req.params;
        logger.info(`Validating email with token: ${token}`);

        // Find the user request by challenge token
        const request = await userRequestService.findByChallengeToken(token);
        if (!request) {
            logger.warn(`No request found for token: ${token}`);
            return res.render('validate-form', {
                error: 'Invalid or expired validation link. Please request a new one.',
                title: 'Email Validation'
            });
        }

        // Check if token is expired (24 hours)
        const tokenAge = Date.now() - new Date(request.createdAt).getTime();
        if (tokenAge > 24 * 60 * 60 * 1000) {
            logger.warn(`Token expired for request: ${request.id}`);
            return res.render('validate-form', {
                error: 'Validation link has expired. Please request a new one.',
                title: 'Email Validation'
            });
        }

        const formattedUsername = request.username.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Create the user from the request
        try {
            logger.info(`Creating user from request: ${request.id}`);
            const userData = await userAdminService.createUserFromRequest(request);
            logger.info(`User created successfully: ${userData.id}`);
            
            // Update request status to completed
            await userAdminService.updateRequestStatus(request.id, 'completed');
            logger.info(`Request status updated to completed: ${request.id}`);
        } catch (error) {
            logger.error('Error creating user from request:', error);
            return res.render('validate-form', {
                error: 'An error occurred while creating your user account. Please try again.',
                title: 'Email Validation'
            });
        }

        // Check if this is a browser request or API call
        const isBrowserRequest = req.headers.accept?.includes('text/html');

        if (isBrowserRequest) {
            // Browser request - redirect to cert-request form using a hidden form for POST
            const userData = {
                username: formattedUsername,
                email: request.email,
                displayName: request.displayName || formattedUsername
            };
            
            logger.info('Redirecting to cert-request with data:', {
                username: userData.username,
                email: userData.email,
                validationToken: token
            });
            
            // Render a page with a hidden form that auto-submits via POST
            return res.render('redirect-form', {
                title: 'Redirecting to Certificate Request',
                userData: JSON.stringify(userData),
                validationToken: token,
                redirectUrl: '/request/cert-request/',
                isCertRequestPage: true
            });
        } else {
            // API call - return JSON response
            return res.json({
                success: true,
                message: 'Email validated successfully',
                data: {
                    username: formattedUsername,
                    email: request.email,
                    validationToken: token
                }
            });
        }
    } catch (error) {
        logger.error('Error validating email:', error);
        return res.render('validate-form', {
            error: 'An error occurred while validating your email. Please try again.',
            title: 'Email Validation'
        });
    }
};

/**
 * Verify cert-request validation token
 */
async function verifyValidationToken(req, res) {
    const { validationToken } = req.body;
    
    try {
        const request = await userRequestService.findByChallengeToken(validationToken);
        res.json({ valid: !!request });
    } catch (error) {
        logger.error('Token verification error:', error);
        res.status(500).json({ 
            valid: false,
            error: 'Error verifying validation token'
        });
    }
}

// GET / - render the revalidate form
router.get('/', (req, res) => {
  res.render('revalidate', { 
    title: 'Request New Certificate',
    error: null, 
    message: null 
  });
});

// GET /validate - Show validation form
router.get('/validate', (req, res) => {
    res.render('validate-form', {
        title: 'Validate Email',
        error: null,
        message: null
    });
});

// GET /:token - Handle token validation
router.get('/:token', validateEmail);

// POST /validate - Handle form submission
router.post('/validate', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.render('validate-form', {
                title: 'Validate Email',
                error: 'Email is required',
                message: null
            });
        }
        
        const user = await userAdminService.findUserByEmail(email);
        if (!user) {
            return res.render('validate-form', {
                title: 'Validate Email',
                error: 'No user found with this email address',
                message: null
            });
        }

        // Generate validation token
        const validationToken = generateValidationToken();

        // Store the validation token in a new request
        const request = await userAdminService.storeValidationToken(email, validationToken);
        
        if (!request) {
            throw new Error('Failed to store validation token');
        }

        // Send validation email
        await emailService.sendValidationEmail(email, validationToken);

        return res.render('validate-form', {
            title: 'Validate Email',
            error: null,
            message: 'A validation link has been sent to your email address'
        });
    } catch (error) {
        logger.error('Error processing validation request:', error);
        return res.render('validate-form', {
            title: 'Validate Email',
            error: 'An error occurred while processing your request',
            message: null
        });
    }
});

// POST / - handle form submission
router.post('/', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.render('revalidate', { 
      title: 'Request New Certificate',
      error: 'Email is required', 
      message: null 
    });
  }

  try {
    // 1. Check if user exists
    const user = await userAdminService.findUserByEmail(email);
    if (!user) {
      return res.render('revalidate', { 
        title: 'Request New Certificate',
        error: 'No such user. Please <a href="/request">register first</a>.', 
        message: null 
      });
    }

    // 2. Generate a new validation token and send email
    const validationToken = generateValidationToken();
    
    // Create a new request with the validation token as the challenge
    const request = await userRequestService.createRequest({
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        challenge: validationToken
    });
    
    // Send validation email - use username if available, otherwise use email
    const username = user.username || email.split('@')[0];
    await emailService.sendValidationEmail(username, email, validationToken);
    logger.info('Sent validation email for revalidation:', { email, username });

    res.render('revalidate', { 
      title: 'Request New Certificate',
      error: null, 
      message: 'A new validation email has been sent. Please check your inbox.' 
    });
  } catch (err) {
    logger.error('Revalidation error:', {
      error: err.message,
      stack: err.stack,
      email
    });
    res.render('revalidate', { 
      title: 'Request New Certificate',
      error: 'An error occurred. Please try again.', 
      message: null 
    });
  }
});

// Handle redirect to cert-request
router.post('/redirect-to-cert-request', async (req, res) => {
    try {
        const { userData, validationToken } = req.body;
        
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
            user = JSON.parse(userData);
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
        
        // Redirect to cert-request with data as query parameters
        const queryParams = new URLSearchParams({
            username: user.username,
            email: user.email,
            displayName: user.displayName || user.username,
            validationToken: validationToken,
            groups: JSON.stringify(groups)
        });
        
        return res.redirect(`/request/cert-request?${queryParams.toString()}`);
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

exports.validateToken = async (req, res) => {
    try {
        const { token } = req.params;
        logger.info(`Validating token: ${token}`);

        const request = await userRequestService.findByChallengeToken(token);
        if (!request) {
            logger.warn(`No request found for token: ${token}`);
            return res.render('validation-error', {
                error: 'Invalid or expired validation link. Please try again.',
                isCertRequestPage: true
            });
        }

        // Check if token is expired
        const tokenExpiry = new Date(request.challengeExpiry);
        if (tokenExpiry < new Date()) {
            logger.warn(`Token expired for request: ${request.id}`);
            return res.render('validation-error', {
                error: 'Validation link has expired. Please request a new one.',
                isCertRequestPage: true
            });
        }

        // Handle revalidation differently
        if (request.status === 'revalidating') {
            logger.info(`Processing revalidation for request: ${request.id}`);
            return res.render('cert-request-form', {
                userData: JSON.stringify({
                    username: request.username,
                    email: request.email
                }),
                validationToken: token,
                isCertRequestPage: true
            });
        }

        // For new user requests, update status to validated
        await userRequestService.updateStatus(request.id, 'validated');
        logger.info(`Request ${request.id} validated successfully`);

        return res.render('cert-request-form', {
            userData: JSON.stringify({
                username: request.username,
                email: request.email
            }),
            validationToken: token,
            isCertRequestPage: true
        });

    } catch (error) {
        logger.error('Error validating token:', error);
        return res.render('validation-error', {
            error: 'An error occurred while validating your request. Please try again.',
            isCertRequestPage: true
        });
    }
};

// Debug route to access the validate form directly
router.get('/debug', (req, res) => {
    logger.info('Debug route accessed');
    res.render('validate-form', {
        title: 'Debug - Validate Email',
        isDebugMode: true,
        debugMessage: 'This is the debug version of the validation form. Use this to test the validation flow.'
    });
});

module.exports = {
    validateEmail,
    verifyValidationToken,
    router
}; 