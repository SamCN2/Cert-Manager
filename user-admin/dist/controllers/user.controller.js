"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const tslib_1 = require("tslib");
const repository_1 = require("@loopback/repository");
const rest_1 = require("@loopback/rest");
const models_1 = require("../models");
const repositories_1 = require("../repositories");
const repositories_2 = require("../repositories");
let UserController = class UserController {
    constructor(userRepository, requestRepository) {
        this.userRepository = userRepository;
        this.requestRepository = requestRepository;
    }
    async create(userData) {
        var _a;
        // Validate username format
        if (!/^[a-zA-Z0-9_-]+$/.test(userData.username)) {
            throw new rest_1.HttpErrors.BadRequest('Username must contain only letters, numbers, underscores, and hyphens');
        }
        // Check if user already exists
        const existingUser = await this.userRepository.findOne({
            where: { username: userData.username },
        });
        if (existingUser) {
            throw new rest_1.HttpErrors.Conflict(`User with username ${userData.username} already exists`);
        }
        return this.userRepository.createWithGroups(userData, (_a = userData.groupNames) !== null && _a !== void 0 ? _a : [], userData.responsibleParty);
    }
    async count(where) {
        return this.userRepository.count(where);
    }
    async find(filter) {
        return this.userRepository.find(filter);
    }
    async checkUsername(username) {
        try {
            // Validate username format
            if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                throw new rest_1.HttpErrors.BadRequest('Username must contain only letters, numbers, underscores, and hyphens');
            }
            // Check users table
            const existingUser = await this.userRepository.findOne({
                where: {
                    username: username
                },
            });
            // Check requests table
            const existingRequest = await this.requestRepository.findOne({
                where: {
                    username: username
                },
            });
            return { available: !existingUser && !existingRequest };
        }
        catch (error) {
            if (error instanceof rest_1.HttpErrors.BadRequest) {
                throw error;
            }
            console.error('Error checking username availability:', error);
            throw new rest_1.HttpErrors.InternalServerError('Database error while checking username availability');
        }
    }
    async findById(username, filter) {
        return this.userRepository.findById(username, filter);
    }
    async updateById(username, user) {
        var _a, _b;
        const now = new Date().toISOString();
        // Update user details if provided
        if (user.displayName) {
            await this.userRepository.updateById(username, {
                ...user,
                lastModifiedAt: now,
                lastModifiedBy: (_a = user.lastModifiedBy) !== null && _a !== void 0 ? _a : 'system',
            });
        }
        // Update group memberships if provided
        if (user.groupNames) {
            await this.userRepository.updateGroups(username, user.groupNames, (_b = user.lastModifiedBy) !== null && _b !== void 0 ? _b : 'system');
        }
    }
    async deleteById(username) {
        await this.userRepository.deleteById(username);
    }
    async validateEmail(username, data) {
        try {
            // Find the user
            const user = await this.userRepository.findById(username);
            if (!user) {
                throw new rest_1.HttpErrors.NotFound(`User ${username} not found`);
            }
            // Update the email
            await this.userRepository.updateById(username, {
                email: data.email,
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'email-validation'
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error updating user email:', error);
            throw new rest_1.HttpErrors.InternalServerError('Error updating user email');
        }
    }
};
exports.UserController = UserController;
tslib_1.__decorate([
    (0, rest_1.post)('/users'),
    (0, rest_1.response)(200, {
        description: 'User model instance',
        content: { 'application/json': { schema: (0, rest_1.getModelSchemaRef)(models_1.User) } },
    }),
    tslib_1.__param(0, (0, rest_1.requestBody)({
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['username', 'displayName', 'responsibleParty'],
                    properties: {
                        username: {
                            type: 'string',
                            pattern: '^[a-zA-Z0-9_-]+$',
                            minLength: 3,
                            maxLength: 50,
                        },
                        displayName: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                        },
                        responsibleParty: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                        },
                        groupNames: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                    },
                },
            },
        },
    })),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "create", null);
tslib_1.__decorate([
    (0, rest_1.get)('/users/count'),
    (0, rest_1.response)(200, {
        description: 'User model count',
        content: { 'application/json': { schema: repository_1.CountSchema } },
    }),
    tslib_1.__param(0, rest_1.param.where(models_1.User)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "count", null);
tslib_1.__decorate([
    (0, rest_1.get)('/users'),
    (0, rest_1.response)(200, {
        description: 'Array of User model instances',
        content: {
            'application/json': {
                schema: {
                    type: 'array',
                    items: (0, rest_1.getModelSchemaRef)(models_1.User, { includeRelations: true }),
                },
            },
        },
    }),
    tslib_1.__param(0, rest_1.param.filter(models_1.User)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "find", null);
tslib_1.__decorate([
    (0, rest_1.get)('/users/check-username/{username}'),
    (0, rest_1.response)(200, {
        description: 'Check if a username is available',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        available: {
                            type: 'boolean'
                        }
                    }
                }
            }
        }
    }),
    tslib_1.__param(0, rest_1.param.path.string('username')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "checkUsername", null);
tslib_1.__decorate([
    (0, rest_1.get)('/users/{username}'),
    (0, rest_1.response)(200, {
        description: 'User model instance',
        content: {
            'application/json': {
                schema: (0, rest_1.getModelSchemaRef)(models_1.User, { includeRelations: true }),
            },
        },
    }),
    tslib_1.__param(0, rest_1.param.path.string('username')),
    tslib_1.__param(1, rest_1.param.filter(models_1.User, { exclude: 'where' })),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "findById", null);
tslib_1.__decorate([
    (0, rest_1.patch)('/users/{username}'),
    (0, rest_1.response)(204, {
        description: 'User PATCH success',
    }),
    tslib_1.__param(0, rest_1.param.path.string('username')),
    tslib_1.__param(1, (0, rest_1.requestBody)({
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        displayName: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                        },
                        groupNames: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                    },
                },
            },
        },
    })),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "updateById", null);
tslib_1.__decorate([
    (0, rest_1.del)('/users/{username}'),
    (0, rest_1.response)(204, {
        description: 'User DELETE success',
    }),
    tslib_1.__param(0, rest_1.param.path.string('username')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "deleteById", null);
tslib_1.__decorate([
    (0, rest_1.patch)('/users/{username}/validate-email'),
    (0, rest_1.response)(200, {
        description: 'Update user email after validation',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean'
                        }
                    }
                }
            }
        }
    }),
    tslib_1.__param(0, rest_1.param.path.string('username')),
    tslib_1.__param(1, (0, rest_1.requestBody)({
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email'
                        }
                    }
                }
            }
        }
    })),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "validateEmail", null);
exports.UserController = UserController = tslib_1.__decorate([
    tslib_1.__param(0, (0, repository_1.repository)(repositories_1.UserRepository)),
    tslib_1.__param(1, (0, repository_1.repository)(repositories_2.RequestRepository)),
    tslib_1.__metadata("design:paramtypes", [repositories_1.UserRepository,
        repositories_2.RequestRepository])
], UserController);
//# sourceMappingURL=user.controller.js.map