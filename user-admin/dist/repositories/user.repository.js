"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@loopback/core");
const repository_1 = require("@loopback/repository");
const rest_1 = require("@loopback/rest");
const postgres_datasource_1 = require("../datasources/postgres.datasource");
const models_1 = require("../models");
let UserRepository = class UserRepository extends repository_1.DefaultCrudRepository {
    constructor(dataSource, userGroupRepositoryGetter, groupRepositoryGetter, requestRepositoryGetter) {
        super(models_1.User, dataSource);
        this.userGroupRepositoryGetter = userGroupRepositoryGetter;
        this.groupRepositoryGetter = groupRepositoryGetter;
        this.requestRepositoryGetter = requestRepositoryGetter;
    }
    /**
     * Override create to ensure users can only be created from requests
     */
    async create(entity, options) {
        const requestRepo = await this.requestRepositoryGetter();
        const request = await requestRepo.findOne({
            where: {
                username: entity.username,
                id: entity.id,
            },
        });
        if (!request) {
            throw new rest_1.HttpErrors.UnprocessableEntity(`Cannot create user without a corresponding request. No request found for username ${entity.username} and id ${entity.id}`);
        }
        return super.create(entity, options);
    }
    /**
     * Create a new user with optional group assignments
     */
    async createWithGroups(userData, groupNames, responsibleParty) {
        const user = new models_1.User(userData);
        const createdUser = await this.create(user);
        if (groupNames.length > 0) {
            const userGroupRepo = await this.userGroupRepositoryGetter();
            await Promise.all(groupNames.map(groupName => userGroupRepo.create({
                userId: createdUser.id,
                username: createdUser.username,
                groupName,
                responsibleParty,
                createdAt: userData.createdAt,
            })));
        }
        // Get the user's groups manually
        const userGroupRepo = await this.userGroupRepositoryGetter();
        const groupRepo = await this.groupRepositoryGetter();
        const userGroups = await userGroupRepo.find({ where: { userId: createdUser.id } });
        const groups = await Promise.all(userGroups.map(ug => groupRepo.findById(ug.groupName)));
        return Object.assign(createdUser, { groups });
    }
    /**
     * Update user's group memberships
     */
    async updateGroups(userId, groupNames, responsibleParty) {
        const userGroupRepo = await this.userGroupRepositoryGetter();
        // Get the user to access their username
        const user = await this.findById(userId);
        // Remove existing group memberships
        await userGroupRepo.deleteAll({ userId });
        // Add new group memberships
        if (groupNames.length > 0) {
            const now = new Date();
            await Promise.all(groupNames.map(groupName => userGroupRepo.create({
                userId,
                username: user.username,
                groupName,
                responsibleParty,
                createdAt: now,
            })));
        }
    }
    /**
     * Find user by ID with groups
     */
    async findByIdWithGroups(id) {
        const user = await this.findById(id);
        const userGroupRepo = await this.userGroupRepositoryGetter();
        const groupRepo = await this.groupRepositoryGetter();
        const userGroups = await userGroupRepo.find({ where: { userId: id } });
        const groups = await Promise.all(userGroups.map(ug => groupRepo.findById(ug.groupName)));
        return Object.assign(user, { groups });
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = tslib_1.__decorate([
    tslib_1.__param(0, (0, core_1.inject)('datasources.postgres')),
    tslib_1.__param(1, repository_1.repository.getter('UserGroupRepository')),
    tslib_1.__param(2, repository_1.repository.getter('GroupRepository')),
    tslib_1.__param(3, repository_1.repository.getter('RequestRepository')),
    tslib_1.__metadata("design:paramtypes", [postgres_datasource_1.PostgresDataSource, Function, Function, Function])
], UserRepository);
//# sourceMappingURL=user.repository.js.map