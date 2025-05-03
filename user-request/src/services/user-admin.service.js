/**
 * Copyright (c) 2025 ogt11.com, llc
 * 
 * @fileoverview Reference implementation for OGT11 microservices API conventions.
 * This service's URL structure and patterns serve as the canonical standard
 * that all other services must follow.
 * 
 * IMPORTANT DEBUGGING NOTE:
 * The system uses three distinct IDs in the user creation flow:
 * 1. Request ID: Internal database ID for the request record
 * 2. Challenge Token: Sent in validation emails, used to look up requests
 * 3. User ID: Created when a request is converted to a user
 * 
 * When debugging user creation issues:
 * - Focus first on the logic of request-to-user transformation
 * - Verify correct ID usage in each step
 * - URL structure issues are rarely the root cause
 * - Check request state and data integrity before assuming API issues
 * 
 * Service Boundaries and URL Patterns:
 * 1. User Admin Service (config.userAdminUrl)
 *    - Uses _buildUrl() which adds /api/user-admin prefix
 *    - Example: /api/user-admin/users/check-username/:username
 *    - Used for: username checks, user management
 * 
 * 2. Request Service (config.serviceUrl)
 *    - Web Form: Direct POST to /request/ 
 *    - API Endpoints: /api/user-admin/api/requests/...
 *    - Used for: request creation, status updates, challenge verification
 * 
 * Convention:
 * - All endpoints MUST be prefixed with /api
 * - Resource names MUST be plural
 * - Actions MUST use kebab-case
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../logger');
const { v4: uuidv4 } = require('uuid');
const UserRequestService = require('./user-request.service');

class UserAdminService {
  constructor() {
    // Remove trailing slash if present
    this.baseUrl = config.userAdminUrl.replace(/\/$/, '');
    this.apiPrefix = '/api/user-admin'; // API path prefix
    this.validationTokens = new Map(); // In-memory store for validation tokens
    this.userRequestService = new UserRequestService();
    logger.info('UserAdminService initialized with baseUrl: ' + this.baseUrl);
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
   * Store a validation token with expiry
   * @param {string} email 
   * @param {string} token 
   */
  async storeValidationToken(email, token) {
    try {
      // Create a new request with the validation token as the challenge
      const request = await this.userRequestService.createRequest({
        email,
        challenge: token,
        status: 'pending'
      });
      
      logger.info('Stored validation token in request:', {
        requestId: request.id,
        email,
        token
      });
      
      return request;
    } catch (error) {
      logger.error('Error storing validation token:', error);
      throw error;
    }
  }

  /**
   * Verify a validation token
   * @param {string} token 
   * @returns {Promise<boolean>}
   */
  async verifyValidationToken(token) {
    try {
      // Use the UserRequestService to find the request by challenge token
      const request = await this.userRequestService.findByChallengeToken(token);
      if (!request) {
        return false;
      }

      // Check if token is expired (24 hours)
      const tokenAge = Date.now() - new Date(request.createdAt).getTime();
      if (tokenAge > 24 * 60 * 60 * 1000) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying validation token:', error);
      return false;
    }
  }

  /**
   * Clean up expired tokens
   * @private
   */
  _cleanupExpiredTokens() {
    const now = Date.now();
    for (const [token, data] of this.validationTokens.entries()) {
      if (now > data.expires) {
        this.validationTokens.delete(token);
      }
    }
  }

  /**
   * Get user by email
   * @param {string} email 
   * @returns {Promise<Object>}
   */
  async getUserByEmail(email) {
    try {
      const response = await axios.get(this._buildUrl(`users/by-email/${email}`));
      return response.data;
    } catch (error) {
      logger.error('Error fetching user by email:', error);
      return null;
    }
  }

  /**
   * Validate email token
   * @param {string} token 
   * @returns {Promise<Object>}
   */
  async validateEmailToken(token) {
    try {
      logger.info('validateEmailToken: Starting validation for token:', { token });
      // First find the request by challenge token
      logger.info('validateEmailToken: Finding request by challenge token');
      const request = await this.findByChallengeToken(token);
      logger.info('validateEmailToken: Found request:', {
        requestId: request?.id,  // Request ID is directly on the object
        username: request?.username,
        status: request?.status,
        challenge: request?.challenge
      });
      if (!request) {
        logger.error('validateEmailToken: No request found for token');
        throw new Error('No request found for token');
      }
      // Create the user from the request (while still pending)
      const userData = await this.createUserFromRequest(request);
      logger.info('validateEmailToken: User created from request:', userData);
      // Now update the request status to completed
      const requestId = request.id;
      if (!requestId) {
        logger.error('validateEmailToken: No request ID found in response');
        throw new Error('No request ID found in response');
      }
      logger.info('validateEmailToken: Updating request status to completed:', { requestId });
      await this.updateRequestStatus(requestId, 'completed');
      // Fetch the full request object after status update
      const fullRequest = await this.getRequestById(requestId);
      logger.info('validateEmailToken: Full request after status update:', fullRequest);
      return fullRequest;
    } catch (error) {
      logger.error('validateEmailToken: Error occurred:', {
        message: error.message,
        stack: error.stack,
        token,
        statusCode: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Send validation email
   * @param {string} email 
   * @returns {Promise<boolean>}
   */
  async sendValidationEmail(email) {
    try {
      await axios.post(this._buildUrl('users/send-validation'), { email });
      return true;
    } catch (error) {
      logger.error('Error sending validation email:', error);
      return false;
    }
  }

  /**
   * Check username availability
   * Following API conventions:
   * - All endpoints MUST be prefixed with /api
   * - Resource names MUST be plural
   * - Actions MUST use kebab-case
   */
  async checkUsername(username) {
    try {
      const url = this._buildUrl(`users/check-username/${username}`);
      logger.info('Checking username availability:', { username, url });
      const response = await axios.get(url);
      const isAvailable = response.data.available === true;
      logger.info('Username availability result:', { 
        username,
        isAvailable,
        data: response.data,
        statusCode: response.status
      });
      return isAvailable;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        username,
        url: error.config?.url,
        statusCode: error.response?.status,
        data: error.response?.data
      };
      logger.error('Error checking username availability:', errorDetails);
      // If we get a 404, the endpoint doesn't exist
      if (error.response?.status === 404) {
        throw new Error(`Username check endpoint not found: ${error.response?.data?.error?.message}`);
      }
      throw error;
    }
  }

  async generateUsername(firstName, lastName) {
    try {
      const url = this._buildUrl('users/generate-username');
      const response = await axios.post(url, { firstName, lastName });
      return response.data.username;
    } catch (error) {
      logger.error('Error generating username:', error);
      throw new Error('Error generating username');
    }
  }

  /**
   * Create a pending user request
   * Uses the request service directly via config.serviceUrl
   * Successful response will include:
   * - id: The request ID (not the challenge token)
   * - challenge: A unique token for email validation
   * - status: Initial status (usually 'pending')
   * @param {Object} userData 
   * @returns {Promise<Object>}
   */
  async createPendingUser(userData) {
    try {
      // Use the API endpoint for request creation
      const url = this._buildUrl('api/requests');
      
      logger.info('Attempting to create pending user request:', { 
        url,
        username: userData.username,
        email: userData.email
      });
      
      const response = await axios.post(url, userData);
      
      // Log the full response to understand its structure
      logger.info('Received response from request creation:', {
        status: response.status,
        headers: response.headers,
        data: JSON.stringify(response.data, null, 2)
      });
      
      // Verify the request was created by checking the response
      if (!response.data) {
        logger.error('Request creation failed - no response data');
        throw new Error('Failed to create request - no response data');
      }

      // The response might be HTML or a redirect - check content type
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('text/html')) {
        logger.error('Received HTML response instead of JSON:', {
          contentType,
          data: response.data
        });
        throw new Error('Received HTML response instead of expected JSON');
      }
      
      // Now check for the ID
      if (!response.data.id) {
        logger.error('Request creation response missing ID:', {
          data: response.data
        });
        throw new Error('Failed to create request - no request ID returned');
      }
      
      logger.info('Successfully created pending user request:', { 
        requestId: response.data.id,
        username: userData.username,
        status: response.data.status,
        challenge: response.data.challenge
      });
      
      // Verify we can find the created request
      try {
        const verifyUrl = this._buildUrl(`api/requests/findByChallenge/${response.data.challenge}`);
        const verifyResponse = await axios.get(verifyUrl);
        logger.info('Verified request exists:', {
          requestId: verifyResponse.data.id,
          status: verifyResponse.data.status
        });
      } catch (verifyError) {
        logger.error('Failed to verify request after creation:', {
          requestId: response.data.id,
          error: verifyError.message
        });
        // Don't throw here, since the request might have been created successfully
      }
      
      return response.data;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        username: userData.username,
        url: error.config?.url,
        statusCode: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      };
      logger.error('Error creating pending user:', errorDetails);
      throw new Error('Error creating pending user: ' + error.message);
    }
  }

  async updateUserStatus(userId, status) {
    try {
      const url = this._buildUrl(`users/${userId}/status`);
      const response = await axios.put(url, { status });
      return response.data;
    } catch (error) {
      logger.error('Error updating user status:', error);
      throw new Error('Error updating user status');
    }
  }

  /**
   * Standard error handler for request service operations
   * @private
   * @param {Error} error - The caught error
   * @param {string} operation - The operation being performed
   * @param {Object} context - Additional context for logging
   * @throws {Error} Rethrows with a standardized message
   */
  _handleRequestError(error, operation, context = {}) {
    const errorDetails = {
      message: error.message,
      url: error.config?.url,
      statusCode: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      ...context
    };
    logger.error(`Error in ${operation}:`, errorDetails);
    throw new Error(`Error in ${operation}: ${error.message}`);
  }

  /**
   * Find a request using its challenge token
   * Uses the request service directly via config.serviceUrl
   * @param {string} challenge - The challenge token from email validation
   * @returns {Promise<Object>} The request object if found
   */
  async findByChallengeToken(token) {
    try {
      logger.info('findByChallengeToken: Starting', { challenge: token });
      
      // Use _buildUrl for consistency with createPendingUser verification
      const url = this._buildUrl(`api/requests/findByChallenge/${token}`);
      logger.info('findByChallengeToken: Attempting request', { 
        url,
        challenge: token,
        serviceUrl: config.serviceUrl
      });
      
      const response = await axios.get(url);
      logger.info('findByChallengeToken: Request successful', { 
        requestId: response.data?.id,
        challenge: token,
        status: response.data?.status,
        username: response.data?.username,
        responseStatus: response.status
      });
      return response.data;
    } catch (error) {
      logger.error('findByChallengeToken: Request failed', {
        challenge: token,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      this._handleRequestError(error, 'findByChallengeToken', { challenge: token });
    }
  }

  /**
   * Update the status of a request
   * Uses the request service directly via config.serviceUrl
   * @param {string} requestId - The request ID (not the challenge token)
   * @param {string} status - The new status
   * @returns {Promise<Object>} The updated request
   */
  async updateRequestStatus(requestId, status) {
    try {
      // Remove any trailing slash from userAdminUrl before appending path
      const baseUrl = config.userAdminUrl.replace(/\/$/, '');
      const url = `${baseUrl}/api/user-admin/api/requests/${requestId}/status`;
      logger.info('Updating request status:', { requestId, status, url });
      const response = await axios.patch(url, { status });
      logger.info('Request status updated:', { 
        requestId, 
        status,
        data: response.data,
        statusCode: response.status 
      });
      return response.data;
    } catch (error) {
      this._handleRequestError(error, 'updateRequestStatus', { requestId, status });
    }
  }

  /**
   * Create a new user from a validated request
   * 
   * Critical Path:
   * 1. Request is found by challenge token (in validateEmailToken)
   * 2. Request status is updated to 'completed'
   * 3. This method creates the actual user
   * 
   * ID Flow:
   * - Input request.id is the request ID from the database
   * - Challenge token is only used for validation lookup
   * - New user ID will be generated by the user service
   * 
   * Common Issues:
   * - Request might not be in 'completed' status
   * - Request data might be incomplete
   * - Username might have become unavailable
   * 
   * @param {Object} request - The validated request object
   * @param {string} request.id - The request ID
   * @param {string} request.username - The requested username
   * @param {string} request.displayName - The user's display name
   * @param {string} request.email - The validated email address
   * @param {string} request.status - Should be 'completed'
   * @returns {Promise<Object>} The created user
   * @throws {Error} If user creation fails
   */
  async createUserFromRequest(request) {
    try {
      // Validate request state
      if (!request.id || !request.username || !request.email) {
        throw new Error('Invalid request data: missing required fields');
      }
      
      if (request.status !== 'pending') {
        throw new Error(`Invalid request status: ${request.status}, expected 'pending'`);
      }

      // Remove any trailing slash from userAdminUrl before appending path
      const baseUrl = config.userAdminUrl.replace(/\/$/, '');
      const url = `${baseUrl}/api/user-admin/api/requests/${request.id}/create-user`;
      const userData = {
        username: request.username,
        displayName: request.displayName,
        email: request.email
      };
      
      logger.info('Creating user from request:', { 
        requestId: request.id, 
        userData: JSON.stringify(userData),
        requestStatus: request.status
      });
      
      const response = await axios.post(url, userData);
      
      logger.info('User created:', {
        requestId: request.id,
        userId: response.data?.id,  // Log the new user ID
        username: response.data?.username,
        status: response.data?.status,
        responseStatus: response.status
      });
      
      return response.data;
    } catch (error) {
      this._handleRequestError(error, 'createUserFromRequest', { 
        requestId: request.id,
        username: request.username,
        requestStatus: request.status
      });
    }
  }

  async getRequestById(requestId) {
    const baseUrl = config.userAdminUrl.replace(/\/$/, '');
    const url = `${baseUrl}/api/user-admin/api/requests/${requestId}`;
    const response = await axios.get(url);
    return response.data;
  }

  /**
   * Find a user by their validation token
   * @param {string} token - The validation token
   * @returns {Promise<Object|null>} - The user object or null if not found
   */
  async findUserByValidationToken(token) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/validation-tokens/${token}/user`);
      return response.data;
    } catch (error) {
      logger.error('Error finding user by validation token:', {
        error: error.message,
        stack: error.stack,
        token
      });
      return null;
    }
  }

  /**
   * Find a user by their email address
   * @param {string} email - The email address to search for
   * @returns {Promise<Object|null>} - The user object or null if not found
   */
  async findUserByEmail(email) {
    try {
      logger.info('findUserByEmail: Starting', { email });
      
      const url = this._buildUrl(`users/by-email/${encodeURIComponent(email)}`);
      logger.info('findUserByEmail: Attempting request', { 
        url,
        email
      });
      
      const response = await axios.get(url);
      logger.info('findUserByEmail: Request successful', { 
        email,
        userId: response.data?.id,
        username: response.data?.username,
        responseStatus: response.status
      });
      return response.data;
    } catch (error) {
      logger.error('Error finding user by email:', {
        error: error.message,
        stack: error.stack,
        email,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data
      });
      return null;
    }
  }

  /**
   * Get user groups by username
   * @param {string} username - The username to get groups for
   * @returns {Promise<Array>} - Array of group objects
   */
  async getUserGroups(username) {
    try {
      logger.info('getUserGroups: Starting', { username });
      
      const url = this._buildUrl(`api/users/${username}/groups`);
      logger.info('getUserGroups: Attempting request', { 
        url,
        username,
        serviceUrl: config.serviceUrl
      });
      
      const response = await axios.get(url);
      logger.info('getUserGroups: Request successful', { 
        username,
        groupCount: response.data?.length || 0,
        responseStatus: response.status
      });
      return response.data || [];
    } catch (error) {
      logger.error('getUserGroups: Request failed', {
        username,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      // Instead of throwing an error, return an empty array
      // This allows the flow to continue even if the user has no groups
      return [];
    }
  }

  /**
   * Get available groups for certificate requests
   * @returns {Promise<string[]>}
   */
  async getAvailableGroups() {
    try {
      const response = await axios.get(this._buildUrl('groups/available'));
      return response.data.groups || [];
    } catch (error) {
      logger.error('Error fetching available groups:', error);
      return [];
    }
  }

  /**
   * Get the certificate status for a user
   * @param {string} username - The username to check
   * @returns {Promise<Object>} The certificate status object
   */
  async getCertificateStatus(username) {
    try {
      const response = await this._makeRequest('GET', `/api/users/${username}/certificate-status`);
      return response.data;
    } catch (error) {
      logger.error('Error getting certificate status:', error);
      return {
        valid: false,
        expired: false,
        invalid: true
      };
    }
  }
}

// Export the class instead of an instance
module.exports = UserAdminService; 