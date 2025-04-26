/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const express = require('express');
const router = express.Router();
const api = require('../services/api');

// List users
router.get('/', async (req, res) => {
    try {
        const users = await api.getUsers();
        res.render('users/list', { users });
    } catch (error) {
        res.render('users/list', { error: error.message });
    }
});

// New user form
router.get('/new', (req, res) => {
    res.render('users/form', { user: {}, isNew: true });
});

// Create user
router.post('/', async (req, res) => {
    try {
        const userData = {
            username: req.body.username,
            displayName: req.body.displayName,
            responsibleParty: req.body.responsibleParty,
            groupNames: req.body.groupNames ? req.body.groupNames.split(',').map(g => g.trim()) : []
        };
        await api.createUser(userData);
        res.redirect('/users');
    } catch (error) {
        res.render('users/form', {
            user: req.body,
            isNew: true,
            error: error.message
        });
    }
});

// Edit user form
router.get('/:username/edit', async (req, res) => {
    try {
        const user = await api.getUsers({ where: { username: req.params.username }});
        res.render('users/form', { user: user[0], isNew: false });
    } catch (error) {
        res.redirect('/users');
    }
});

// Update user
router.post('/:username', async (req, res) => {
    try {
        const userData = {
            displayName: req.body.displayName,
            groupNames: req.body.groupNames ? req.body.groupNames.split(',').map(g => g.trim()) : []
        };
        await api.updateUser(req.params.username, userData);
        res.redirect('/users');
    } catch (error) {
        res.render('users/form', {
            user: { ...req.body, username: req.params.username },
            isNew: false,
            error: error.message
        });
    }
});

// Delete user
router.post('/:username/delete', async (req, res) => {
    try {
        await api.deleteUser(req.params.username);
        res.redirect('/users');
    } catch (error) {
        res.render('users/list', { error: error.message });
    }
});

module.exports = router; 