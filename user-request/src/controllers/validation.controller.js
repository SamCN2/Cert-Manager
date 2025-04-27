/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const crypto = require('crypto');
const UserAdminService = require('../services/user-admin.service');
const logger = require('../logger');
const config = require('../config');

// Create instance of UserAdminService
const userAdminService = new UserAdminService();

/**
 * Generate a validation token
 * @param {string} email 
 * @returns {string}
 */
function generateValidationToken(email) {
    const hmac = crypto.createHmac('sha256', config.validationSecret);
    hmac.update(email + Date.now());
    return hmac.digest('hex');
}

/**
 * Handle email validation
 */
async function validateEmail(req, res) {
    // Get token from either params (GET request) or body (POST request)
    const token = req.params.token || req.body.token;
    logger.info('Starting email validation:', { token });
    
    try {
        // Validate the email token and get the updated request
        const request = await userAdminService.validateEmailToken(token);
        logger.info('Email validation successful:', { 
            requestId: request.id,
            username: request.username,
            status: request.status
        });

        // Generate a new validation token for cert-create
        const validationToken = generateValidationToken(request.email);
        
        // Store the validation token with a short expiry
        await userAdminService.storeValidationToken(request.email, validationToken);
        logger.info('Stored validation token for cert-create');

        // Check if this is a browser request or API call (like curl)
        const acceptsHtml = req.accepts('html');
        logger.info('Response type check:', { 
            acceptsHtml, 
            headers: req.headers,
            method: req.method
        });

        if (acceptsHtml) {
            // Browser request - redirect to success page
            logger.info('Redirecting to success page');
            return res.redirect('/request/validation-success');
        } else {
            // API call - return JSON response
            logger.info('Sending JSON success response');
            return res.json({
                status: 'success',
                message: 'Email validated successfully. User account is now active.',
                username: request.username
            });
        }

    } catch (error) {
        logger.error('Email validation error:', {
            message: error.message,
            token,
            responseStatus: error.response?.status,
            responseData: error.response?.data,
            stack: error.stack
        });
        
        // Determine the appropriate error message
        let message = 'Error processing validation';
        if (error.message === 'No request found for token') {
            message = 'Invalid or expired validation token';
        } else if (error.response?.status === 404) {
            message = 'Request not found';
        } else if (error.message.includes('Invalid request status')) {
            message = 'This email has already been validated';
        } else if (error.response?.data?.error) {
            message = error.response.data.error;
        }

        // Check if this is a browser request or API call
        const acceptsHtml = req.accepts('html');
        if (acceptsHtml) {
            // Browser request - render error page
            return res.render('validation-error', { 
                error: message,
                showHomeLink: true 
            });
        } else {
            // API call - return JSON error
            return res.status(400).json({
                status: 'error',
                message: message
            });
        }
    }
}

/**
 * Verify cert-create validation token
 */
async function verifyValidationToken(req, res) {
    const { validationToken } = req.body;
    
    try {
        const isValid = await userAdminService.verifyValidationToken(validationToken);
        res.json({ valid: isValid });
    } catch (error) {
        logger.error('Token verification error:', error);
        res.status(500).json({ 
            valid: false,
            error: 'Error verifying validation token'
        });
    }
}

module.exports = {
    validateEmail,
    verifyValidationToken
}; 