/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../logger');

class UserRequestService {
    constructor() {
        this.baseUrl = config.userAdminUrl.replace(/\/$/, '');
        this.apiPrefix = '/api/user-admin'; // API path prefix
    }

    /**
     * Builds a URL for the API endpoint
     * @private
     * @param {string} path - The path to append to baseUrl
     * @returns {string}
     */
    _buildUrl(path) {
        // Remove any leading slashes from the path
        const cleanPath = path.replace(/^\/+/, '');
        // Combine base URL with API prefix and path
        return `${this.baseUrl}${this.apiPrefix}/${cleanPath}`;
    }

    /**
     * Find a user request by challenge token
     * @param {string} token - The challenge token
     * @returns {Promise<Object|null>} - The user request or null if not found
     */
    async findByChallengeToken(token) {
        try {
            const url = this._buildUrl(`api/requests/findByChallenge/${token}`);
            logger.info('Finding request by challenge token:', { token, url });
            const response = await axios.get(url);
            logger.info('Found request by challenge token:', { 
                token, 
                requestId: response.data?.id,
                username: response.data?.username
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                logger.warn('No request found for challenge token:', { token });
                return null;
            }
            logger.error('Error finding request by challenge token:', {
                token,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Create a new user request
     * @param {Object} requestData - The request data
     * @param {string} requestData.username - The username
     * @param {string} requestData.displayName - The display name
     * @param {string} requestData.email - The email address
     * @param {string} requestData.challenge - The challenge token
     * @returns {Promise<Object>} - The created request
     */
    async createRequest(requestData) {
        try {
            const url = this._buildUrl('api/requests');
            logger.info('Creating new request:', { 
                username: requestData.username,
                email: requestData.email
            });
            const response = await axios.post(url, requestData);
            logger.info('Created new request:', { 
                requestId: response.data?.id,
                username: response.data?.username
            });
            return response.data;
        } catch (error) {
            logger.error('Error creating request:', {
                username: requestData.username,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = UserRequestService; 