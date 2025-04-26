"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupController = void 0;
const tslib_1 = require("tslib");
const repository_1 = require("@loopback/repository");
const rest_1 = require("@loopback/rest");
const models_1 = require("../models");
const repositories_1 = require("../repositories");
let GroupController = class GroupController {
    constructor(groupRepository) {
        this.groupRepository = groupRepository;
    }
    async create(groupData) {
        var _a;
        // Validate group name format
        if (!/^[a-zA-Z0-9_-]+$/.test(groupData.name)) {
            throw new rest_1.HttpErrors.BadRequest('Group name must contain only letters, numbers, underscores, and hyphens');
        }
        // Check if group already exists
        const existingGroup = await this.groupRepository.findOne({
            where: { name: groupData.name },
        });
        if (existingGroup) {
            throw new rest_1.HttpErrors.Conflict(`Group with name ${groupData.name} already exists`);
        }
        return this.groupRepository.createWithUsers({
            name: groupData.name,
            displayName: groupData.displayName,
            description: groupData.description,
            responsibleParty: groupData.responsibleParty,
        }, (_a = groupData.usernames) !== null && _a !== void 0 ? _a : [], groupData.responsibleParty);
    }
    async count(where) {
        return this.groupRepository.count(where);
    }
    async find(filter) {
        return this.groupRepository.find(filter);
    }
    async findById(name, filter) {
        return this.groupRepository.findById(name, filter);
    }
    async updateById(name, group) {
        var _a, _b;
        const now = new Date().toISOString();
        // Update group details if provided
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (group.displayName || group.description) {
            await this.groupRepository.updateById(name, {
                ...group,
                lastModifiedAt: now,
                lastModifiedBy: (_a = group.lastModifiedBy) !== null && _a !== void 0 ? _a : 'system',
            });
        }
        // Update user memberships if provided
        if (group.usernames) {
            await this.groupRepository.updateUsers(name, group.usernames, (_b = group.lastModifiedBy) !== null && _b !== void 0 ? _b : 'system');
        }
    }
    async deleteById(name) {
        await this.groupRepository.deleteById(name);
    }
};
exports.GroupController = GroupController;
tslib_1.__decorate([
    (0, rest_1.post)('/groups'),
    (0, rest_1.response)(200, {
        description: 'Group model instance',
        content: { 'application/json': { schema: (0, rest_1.getModelSchemaRef)(models_1.Group) } },
    }),
    tslib_1.__param(0, (0, rest_1.requestBody)({
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['name', 'displayName', 'responsibleParty'],
                    properties: {
                        name: {
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
                        description: {
                            type: 'string',
                            maxLength: 500,
                        },
                        responsibleParty: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                        },
                        usernames: {
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
], GroupController.prototype, "create", null);
tslib_1.__decorate([
    (0, rest_1.get)('/groups/count'),
    (0, rest_1.response)(200, {
        description: 'Group model count',
        content: { 'application/json': { schema: repository_1.CountSchema } },
    }),
    tslib_1.__param(0, rest_1.param.where(models_1.Group)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "count", null);
tslib_1.__decorate([
    (0, rest_1.get)('/groups'),
    (0, rest_1.response)(200, {
        description: 'Array of Group model instances',
        content: {
            'application/json': {
                schema: {
                    type: 'array',
                    items: (0, rest_1.getModelSchemaRef)(models_1.Group, { includeRelations: true }),
                },
            },
        },
    }),
    tslib_1.__param(0, rest_1.param.filter(models_1.Group)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "find", null);
tslib_1.__decorate([
    (0, rest_1.get)('/groups/{name}'),
    (0, rest_1.response)(200, {
        description: 'Group model instance',
        content: {
            'application/json': {
                schema: (0, rest_1.getModelSchemaRef)(models_1.Group, { includeRelations: true }),
            },
        },
    }),
    tslib_1.__param(0, rest_1.param.path.string('name')),
    tslib_1.__param(1, rest_1.param.filter(models_1.Group, { exclude: 'where' })),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "findById", null);
tslib_1.__decorate([
    (0, rest_1.patch)('/groups/{name}'),
    (0, rest_1.response)(204, {
        description: 'Group PATCH success',
    }),
    tslib_1.__param(0, rest_1.param.path.string('name')),
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
                        description: {
                            type: 'string',
                            maxLength: 500,
                        },
                        usernames: {
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
], GroupController.prototype, "updateById", null);
tslib_1.__decorate([
    (0, rest_1.del)('/groups/{name}'),
    (0, rest_1.response)(204, {
        description: 'Group DELETE success',
    }),
    tslib_1.__param(0, rest_1.param.path.string('name')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "deleteById", null);
exports.GroupController = GroupController = tslib_1.__decorate([
    tslib_1.__param(0, (0, repository_1.repository)(repositories_1.GroupRepository)),
    tslib_1.__metadata("design:paramtypes", [repositories_1.GroupRepository])
], GroupController);
//# sourceMappingURL=group.controller.js.map