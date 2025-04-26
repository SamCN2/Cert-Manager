"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@loopback/core");
const repository_1 = require("@loopback/repository");
const postgres_datasource_1 = require("../datasources/postgres.datasource");
const models_1 = require("../models");
let UserRepository = class UserRepository extends repository_1.DefaultCrudRepository {
    constructor(dataSource, userGroupRepositoryGetter, groupRepositoryGetter) {
        super(models_1.User, dataSource);
        this.userGroupRepositoryGetter = userGroupRepositoryGetter;
        this.groupRepositoryGetter = groupRepositoryGetter;
        this.groups = this.createHasManyThroughRepositoryFactoryFor('groups', groupRepositoryGetter, userGroupRepositoryGetter);
        this.registerInclusionResolver('groups', this.groups.inclusionResolver);
    }
    /**
     * Create a new user with optional group assignments
     */
    async createWithGroups(userData, groupNames, responsibleParty) {
        const now = new Date();
        const user = new models_1.User({
            ...userData,
            createdAt: now,
        });
        const createdUser = await this.create(user);
        if (groupNames.length > 0) {
            const userGroupRepo = await this.userGroupRepositoryGetter();
            await Promise.all(groupNames.map(groupName => userGroupRepo.create({
                username: createdUser.username,
                groupName,
                responsibleParty,
                createdAt: now,
            })));
        }
        return this.findById(createdUser.username, {
            include: [{ relation: 'groups' }],
        });
    }
    /**
     * Update user's group memberships
     */
    async updateGroups(username, groupNames, responsibleParty) {
        const userGroupRepo = await this.userGroupRepositoryGetter();
        // Remove existing group memberships
        await userGroupRepo.deleteAll({ username });
        // Add new group memberships
        if (groupNames.length > 0) {
            const now = new Date();
            await Promise.all(groupNames.map(groupName => userGroupRepo.create({
                username,
                groupName,
                responsibleParty,
                createdAt: now,
            })));
        }
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = tslib_1.__decorate([
    tslib_1.__param(0, (0, core_1.inject)('datasources.postgres')),
    tslib_1.__param(1, repository_1.repository.getter('UserGroupRepository')),
    tslib_1.__param(2, repository_1.repository.getter('GroupRepository')),
    tslib_1.__metadata("design:paramtypes", [postgres_datasource_1.PostgresDataSource, Function, Function])
], UserRepository);
//# sourceMappingURL=user.repository.js.map