/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const express = require('express');
const router = express.Router();
const userAdminService = require('../services/user-admin.service');
const logger = require('../logger');

// Home page route
router.get('/', (req, res) => {
    res.render('home', {
        certStatus: req.certStatus,
        user: req.user || {}
    });
});

// Email validation route
router.post('/validate-email', async (req, res) => {
    const { email } = req.body;
    
    try {
        // Check if user exists
        const user = await userAdminService.getUserByEmail(email);
        
        if (user) {
            // User exists, send validation email
            await userAdminService.sendValidationEmail(email);
            res.render('check-email', { email });
        } else {
            // User doesn't exist, redirect to request
            res.redirect('/request');
        }
    } catch (error) {
        logger.error('Error in email validation:', error);
        res.status(500).render('error', {
            message: 'Error processing email validation'
        });
    }
});

module.exports = router; 