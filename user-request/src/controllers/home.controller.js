/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const logger = require('../logger');
const UserAdminService = require('../services/user-admin.service');

const userAdminService = new UserAdminService();

exports.getHome = async (req, res) => {
    try {
        // Get user data from session or request
        const user = req.session?.user || req.user;
        
        if (!user) {
            // No user logged in - show request access form
            return res.render('home', {
                certStatus: {
                    valid: false,
                    expired: false,
                    invalid: false
                }
            });
        }

        // Check certificate status through user-admin service
        const certStatus = await userAdminService.getCertificateStatus(user.username);
        
        // Render home page with user data and certificate status
        res.render('home', {
            user: {
                username: user.username,
                email: user.email,
                displayName: user.displayName || user.username
            },
            certStatus
        });
    } catch (error) {
        logger.error('Error in home controller:', error);
        res.render('home', {
            error: 'An error occurred while loading the page',
            certStatus: {
                valid: false,
                expired: false,
                invalid: false
            }
        });
    }
}; 