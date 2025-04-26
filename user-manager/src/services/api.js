/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const axios = require('axios');

class ApiService {
    constructor(baseURL = 'http://localhost:3004') {
        this.api = axios.create({
            baseURL,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    // Users
    async getUsers(filter = {}) {
        try {
            const response = await this.api.get('/users', { params: { filter } });
            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    }

    async createUser(userData) {
        try {
            const response = await this.api.post('/users', userData);
            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    }

    async updateUser(username, userData) {
        try {
            await this.api.patch(`/users/${username}`, userData);
        } catch (error) {
            throw this._handleError(error);
        }
    }

    async deleteUser(username) {
        try {
            await this.api.delete(`/users/${username}`);
        } catch (error) {
            throw this._handleError(error);
        }
    }

    // Groups
    async getGroups(filter = {}) {
        try {
            const response = await this.api.get('/groups', { params: { filter } });
            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    }

    async createGroup(groupData) {
        try {
            const response = await this.api.post('/groups', groupData);
            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    }

    async updateGroup(name, groupData) {
        try {
            await this.api.patch(`/groups/${name}`, groupData);
        } catch (error) {
            throw this._handleError(error);
        }
    }

    async deleteGroup(name) {
        try {
            await this.api.delete(`/groups/${name}`);
        } catch (error) {
            throw this._handleError(error);
        }
    }

    // Error handling
    _handleError(error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const { status, data } = error.response;
            return new Error(`API Error ${status}: ${data.error?.message || 'Unknown error'}`);
        } else if (error.request) {
            // The request was made but no response was received
            return new Error('No response received from server');
        } else {
            // Something happened in setting up the request
            return new Error('Error setting up request');
        }
    }
}

module.exports = new ApiService(); 