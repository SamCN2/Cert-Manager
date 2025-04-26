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
    const { token } = req.params;
    logger.info('Starting email validation:', { token });
    
    try {
        // Get the request record by challenge token and validate it
        const request = await userAdminService.validateEmailToken(token);
        
        // Create the user from the request
        const userData = await userAdminService.createUserFromRequest(request);
        
        // Generate a new validation token for cert-create
        const validationToken = generateValidationToken(userData.email);
        
        // Store the validation token with a short expiry
        await userAdminService.storeValidationToken(userData.email, validationToken);

        // Redirect to success page
        return res.redirect('/validation-success');

    } catch (error) {
        logger.error('Email validation error:', {
            message: error.message,
            token,
            responseStatus: error.response?.status,
            responseData: error.response?.data
        });
        
        // Determine the appropriate error message
        let message = 'Error processing validation';
        if (error.message === 'No request found for token') {
            message = 'Invalid or expired validation token';
        } else if (error.response?.status === 404) {
            message = 'Request not found';
        } else if (error.message === 'Request is not in pending status') {
            message = 'Already Validated';
        } else if (error.response?.data?.error) {
            message = error.response.data.error;
        }
        
        res.render('validation-error', { error: message });
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