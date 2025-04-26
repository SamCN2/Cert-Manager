/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const EmailService = require('../services/email.service');
const UserAdminService = require('../services/user-admin.service');
const { validateEmail, verifyValidationToken } = require('../controllers/validation.controller');
const logger = require('../logger');

// Create service instances
const emailService = new EmailService();
const userAdminService = new UserAdminService();

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

// Handle email validation
router.get('/validate/:token', validateEmail);

// Alias for legacy or alternate email links
router.get('/request/validate/:token', validateEmail);

// GET handler for /validate-challenge to prevent 404s
router.get('/validate-challenge', (req, res) => {
  res.redirect('/');
});

// POST handler for manual challenge verification from the request-success page
router.post('/validate-challenge', async (req, res) => {
  const { challenge } = req.body;
  if (!challenge) {
    return res.render('validation-error', { error: 'Challenge token is required.' });
  }
  try {
    req.params = { token: challenge };
    // Call the controller function directly, but capture the result
    // We'll use a custom callback to redirect on success
    const originalRender = res.render;
    res.render = function(view, options) {
      if (view === 'validation-success') {
        // Redirect to a dedicated success page
        return res.redirect('/validation-success');
      }
      // Otherwise, render as normal (for errors)
      return originalRender.call(this, view, options);
    };
    await require('../controllers/validation.controller').validateEmail(req, res);
    res.render = originalRender; // Restore
  } catch (error) {
    logger.error('Error validating challenge token:', {
      error: error.message,
      stack: error.stack,
      challenge
    });
    res.render('validation-error', { error: error.message || 'Failed to validate challenge token.' });
  }
});

// GET handler for /validation-success
router.get('/validation-success', (req, res) => {
  res.render('validation-success', { message: 'Your email has been validated and your account is now active.' });
});

// Validation routes
router.get('/validate/:token', validateEmail);
router.get('/validation-success', (req, res) => {
    res.render('validation-success');
});
router.post('/verify-token', verifyValidationToken);

module.exports = router; 