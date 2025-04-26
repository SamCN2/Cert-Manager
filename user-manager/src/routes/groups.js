/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const express = require('express');
const router = express.Router();
const api = require('../services/api');

// List groups
router.get('/', async (req, res) => {
    try {
        const groups = await api.getGroups();
        res.render('groups/list', { groups });
    } catch (error) {
        res.render('groups/list', { error: error.message });
    }
});

// New group form
router.get('/new', (req, res) => {
    res.render('groups/form', { group: {}, isNew: true });
});

// Create group
router.post('/', async (req, res) => {
    try {
        const groupData = {
            name: req.body.name,
            displayName: req.body.displayName,
            description: req.body.description,
            responsibleParty: req.body.responsibleParty,
            members: req.body.members ? req.body.members.split(',').map(m => m.trim()) : []
        };
        await api.createGroup(groupData);
        res.redirect('/groups');
    } catch (error) {
        res.render('groups/form', {
            group: req.body,
            isNew: true,
            error: error.message
        });
    }
});

// Edit group form
router.get('/:name/edit', async (req, res) => {
    try {
        const group = await api.getGroups({ where: { name: req.params.name }});
        res.render('groups/form', { group: group[0], isNew: false });
    } catch (error) {
        res.redirect('/groups');
    }
});

// Update group
router.post('/:name', async (req, res) => {
    try {
        const groupData = {
            displayName: req.body.displayName,
            description: req.body.description,
            responsibleParty: req.body.responsibleParty,
            members: req.body.members ? req.body.members.split(',').map(m => m.trim()) : []
        };
        await api.updateGroup(req.params.name, groupData);
        res.redirect('/groups');
    } catch (error) {
        res.render('groups/form', {
            group: { ...req.body, name: req.params.name },
            isNew: false,
            error: error.message
        });
    }
});

// Delete group
router.post('/:name/delete', async (req, res) => {
    try {
        await api.deleteGroup(req.params.name);
        res.redirect('/groups');
    } catch (error) {
        res.render('groups/list', { error: error.message });
    }
});

module.exports = router; 