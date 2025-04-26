"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestController = void 0;
const tslib_1 = require("tslib");
const repository_1 = require("@loopback/repository");
const rest_1 = require("@loopback/rest");
const models_1 = require("../models");
const repositories_1 = require("../repositories");
const repositories_2 = require("../repositories");
let RequestController = class RequestController {
    constructor(requestRepository, userRepository) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
    }
    async create(request) {
        try {
            console.log('\n=== Creating Request ===');
            console.log('Received request data:', request);
            // Let the model handle the timestamp with its default value
            request.status = request.status || 'pending';
            // Create the request
            const savedRequest = await this.requestRepository.create(request);
            console.log('Saved request:', savedRequest);
            console.log('===========================\n');
            return savedRequest;
        }
        catch (error) {
            console.error('Error creating request:', error);
            throw new rest_1.HttpErrors.InternalServerError('Failed to create request');
        }
    }
    async findByChallenge(challenge) {
        console.log('\n=== Finding Request by Challenge ===');
        console.log('Challenge token:', challenge);
        const request = await this.requestRepository.findOne({
            where: {
                challenge: challenge
            }
        });
        if (request) {
            console.log('Found request:', request);
        }
        else {
            console.log('No request found for challenge token');
        }
        console.log('===========================\n');
        return request;
    }
    async updateById(id, request) {
        try {
            console.log('\n=== Updating Request ===');
            console.log('Request ID:', id);
            console.log('Update data:', request);
            await this.requestRepository.updateById(id, request);
            console.log('Request updated successfully');
            console.log('===========================\n');
        }
        catch (error) {
            console.error('Error updating request:', error);
            throw new rest_1.HttpErrors.InternalServerError('Failed to update request');
        }
    }
    async createUser(id, userData) {
        try {
            console.log('\n=== Creating User from Request ===');
            console.log('Request ID:', id);
            console.log('User data:', userData);
            // Get the request
            const request = await this.requestRepository.findById(id);
            if (!request) {
                throw new rest_1.HttpErrors.NotFound('Request not found');
            }
            // Verify the request is pending
            if (request.status !== 'pending') {
                throw new rest_1.HttpErrors.BadRequest('Request is not in pending status');
            }
            // Verify the user data matches the request
            if (request.username !== userData.username ||
                request.displayName !== userData.displayName ||
                request.email !== userData.email) {
                throw new rest_1.HttpErrors.BadRequest('User data does not match request');
            }
            // Create the user
            await this.userRepository.create({
                username: userData.username,
                displayName: userData.displayName,
                email: userData.email,
                status: 'active',
                responsibleParty: 'user-request',
                createdAt: new Date(),
            });
            // Update request status
            await this.requestRepository.updateById(id, {
                status: 'completed',
                lastModifiedAt: new Date(),
            });
            console.log('User created successfully');
            console.log('===========================\n');
        }
        catch (error) {
            console.error('Error creating user from request:', error);
            if (error instanceof rest_1.HttpErrors.HttpError) {
                throw error;
            }
            throw new rest_1.HttpErrors.InternalServerError('Failed to create user from request');
        }
    }
    async validateRequest(id) {
        console.log('\n=== Validating Request ===');
        console.log('Request ID:', id);
        const request = await this.requestRepository.findOne({
            where: {
                challenge: id,
                status: 'pending'
            }
        });
        if (!request) {
            console.log('No pending request found for challenge token');
            throw new rest_1.HttpErrors.NotFound('Request not found or already processed');
        }
        console.log('Found request:', request);
        console.log('===========================\n');
        return request;
    }
    async updateStatusById(id, body) {
        try {
            console.log('\n=== Updating Request Status ===');
            console.log('Request ID:', id);
            console.log('New status:', body.status);
            await this.requestRepository.updateById(id, {
                status: body.status,
                lastModifiedAt: new Date(),
            });
            console.log('Request status updated successfully');
            console.log('===========================\n');
            return { id, status: body.status };
        }
        catch (error) {
            console.error('Error updating request status:', error);
            throw new rest_1.HttpErrors.InternalServerError('Failed to update request status');
        }
    }
    async getById(id) {
        const request = await this.requestRepository.findById(id);
        if (!request) {
            throw new rest_1.HttpErrors.NotFound('Request not found');
        }
        return request;
    }
};
exports.RequestController = RequestController;
tslib_1.__decorate([
    (0, rest_1.post)('/api/requests'),
    (0, rest_1.response)(200, {
        description: 'Request model instance',
        content: { 'application/json': { schema: { type: 'object' } } },
    }),
    tslib_1.__param(0, (0, rest_1.requestBody)({
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['username', 'displayName', 'email'],
                    properties: {
                        username: {
                            type: 'string',
                            pattern: '^[a-z0-9\\-]{2,30}$',
                        },
                        displayName: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'approved', 'rejected'],
                            default: 'pending',
                        },
                        challenge: {
                            type: 'string',
                        },
                    },
                },
            },
        },
    })),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "create", null);
tslib_1.__decorate([
    (0, rest_1.get)('/api/requests/findByChallenge/{challenge}'),
    tslib_1.__param(0, rest_1.param.path.string('challenge')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "findByChallenge", null);
tslib_1.__decorate([
    (0, rest_1.patch)('/api/requests/{id}'),
    (0, rest_1.response)(204, {
        description: 'Request PATCH success',
    }),
    tslib_1.__param(0, rest_1.param.path.string('id')),
    tslib_1.__param(1, (0, rest_1.requestBody)({
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['pending', 'completed', 'rejected']
                        },
                        lastModifiedAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                }
            }
        }
    })),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "updateById", null);
tslib_1.__decorate([
    (0, rest_1.post)('/api/requests/{id}/create-user'),
    (0, rest_1.response)(200, {
        description: 'Create user from request',
        content: { 'application/json': { schema: { type: 'object' } } },
    }),
    tslib_1.__param(0, rest_1.param.path.string('id')),
    tslib_1.__param(1, (0, rest_1.requestBody)({
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['username', 'displayName', 'email'],
                    properties: {
                        username: {
                            type: 'string',
                            pattern: '^[a-z0-9\\-]{2,30}$',
                        },
                        displayName: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                        },
                    },
                },
            },
        },
    })),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "createUser", null);
tslib_1.__decorate([
    (0, rest_1.get)('/request/validate/{id}'),
    (0, rest_1.response)(200, {
        description: 'Validate request by ID',
        content: { 'application/json': { schema: (0, rest_1.getModelSchemaRef)(models_1.Request) } },
    }),
    tslib_1.__param(0, rest_1.param.path.string('id')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "validateRequest", null);
tslib_1.__decorate([
    (0, rest_1.patch)('/api/requests/{id}/status'),
    (0, rest_1.response)(200, {
        description: 'Update request status',
        content: { 'application/json': { schema: { type: 'object' } } },
    }),
    tslib_1.__param(0, rest_1.param.path.string('id')),
    tslib_1.__param(1, (0, rest_1.requestBody)({
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['status'],
                    properties: {
                        status: { type: 'string' },
                    },
                },
            },
        },
    })),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "updateStatusById", null);
tslib_1.__decorate([
    (0, rest_1.get)('/api/requests/{id}'),
    (0, rest_1.response)(200, {
        description: 'Get request by ID',
        content: { 'application/json': { schema: (0, rest_1.getModelSchemaRef)(models_1.Request) } },
    }),
    tslib_1.__param(0, rest_1.param.path.string('id')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "getById", null);
exports.RequestController = RequestController = tslib_1.__decorate([
    tslib_1.__param(0, (0, repository_1.repository)(repositories_1.RequestRepository)),
    tslib_1.__param(1, (0, repository_1.repository)(repositories_2.UserRepository)),
    tslib_1.__metadata("design:paramtypes", [repositories_1.RequestRepository,
        repositories_2.UserRepository])
], RequestController);
//# sourceMappingURL=request.controller.js.map