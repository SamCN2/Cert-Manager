/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const EmailService = require('../services/email.service');
const UserAdminService = require('../services/user-admin.service');
const UserRequestService = require('../services/user-request.service');

// Create service instances
const emailService = new EmailService();
const userAdminService = new UserAdminService();
const userRequestService = new UserRequestService();

// GET / - Show revalidation form
router.get('/', (req, res) => {
    res.render('revalidation-form', {
        title: 'Certificate Revalidation',
        error: null
    });
});

// POST / - Process revalidation request
router.post('/', async (req, res) => {
    const { username, email } = req.body;
    
    if (!username || !email) {
        return res.render('revalidation-form', {
            title: 'Certificate Revalidation',
            error: 'Username and email are required',
            username,
            email
        });
    }
    
    try {
        // Check if the user exists
        const user = await userAdminService.getUserByUsername(username);
        if (!user) {
            return res.render('revalidation-form', {
                title: 'Certificate Revalidation',
                error: 'User not found',
                username,
                email
            });
        }
        
        // Check if the email matches
        if (user.email !== email) {
            return res.render('revalidation-form', {
                title: 'Certificate Revalidation',
                error: 'Email does not match the username',
                username,
                email
            });
        }
        
        // Generate validation token
        const token = emailService.generateValidationToken(username, email);
        
        // Create a revalidation request
        const requestData = {
            username,
            email,
            displayName: user.displayName || username,
            challenge: token,
            status: 'revalidating' // Special status for revalidation
        };
        
        // Store the request
        await userRequestService.createRequest(requestData);
        
        // Send validation email
        await emailService.sendRevalidationEmail(username, email, token);
        
        // Show success page
        res.render('revalidation-success', {
            title: 'Check Your Email',
            username,
            email
        });
    } catch (error) {
        logger.error('Error processing revalidation request:', {
            error: error.message,
            stack: error.stack,
            username,
            email
        });
        
        res.render('revalidation-form', {
            title: 'Certificate Revalidation',
            error: 'An error occurred while processing your request',
            username,
            email
        });
    }
});

module.exports = {
    router
}; 