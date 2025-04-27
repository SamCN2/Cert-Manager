"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupRepository = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@loopback/core");
const repository_1 = require("@loopback/repository");
const postgres_datasource_1 = require("../datasources/postgres.datasource");
const models_1 = require("../models");
let GroupRepository = class GroupRepository extends repository_1.DefaultCrudRepository {
    constructor(dataSource, userGroupRepositoryGetter, userRepositoryGetter) {
        super(models_1.Group, dataSource);
        this.userGroupRepositoryGetter = userGroupRepositoryGetter;
        this.userRepositoryGetter = userRepositoryGetter;
    }
    /**
     * Create a new group with optional user assignments
     */
    async createWithUsers(groupData, userIds, responsibleParty) {
        const now = new Date();
        const group = new models_1.Group({
            ...groupData,
            createdAt: now,
        });
        const createdGroup = await this.create(group);
        if (userIds.length > 0) {
            const userGroupRepo = await this.userGroupRepositoryGetter();
            await Promise.all(userIds.map(userId => userGroupRepo.create({
                userId,
                groupName: createdGroup.name,
                responsibleParty,
                createdAt: now,
            })));
        }
        return this.findByNameWithUsers(createdGroup.name);
    }
    /**
     * Update group's user memberships
     */
    async updateUsers(groupName, userIds, responsibleParty) {
        const userGroupRepo = await this.userGroupRepositoryGetter();
        // Remove existing user memberships
        await userGroupRepo.deleteAll({ groupName });
        // Add new user memberships
        if (userIds.length > 0) {
            const now = new Date();
            await Promise.all(userIds.map(userId => userGroupRepo.create({
                userId,
                groupName,
                responsibleParty,
                createdAt: now,
            })));
        }
    }
    /**
     * Find group by name with users
     */
    async findByNameWithUsers(name) {
        const group = await this.findById(name);
        const userGroupRepo = await this.userGroupRepositoryGetter();
        const userRepo = await this.userRepositoryGetter();
        const userGroups = await userGroupRepo.find({ where: { groupName: name } });
        const users = await Promise.all(userGroups.map(ug => userRepo.findById(ug.userId)));
        return Object.assign(group, { users });
    }
};
exports.GroupRepository = GroupRepository;
exports.GroupRepository = GroupRepository = tslib_1.__decorate([
    tslib_1.__param(0, (0, core_1.inject)('datasources.postgres')),
    tslib_1.__param(1, repository_1.repository.getter('UserGroupRepository')),
    tslib_1.__param(2, repository_1.repository.getter('UserRepository')),
    tslib_1.__metadata("design:paramtypes", [postgres_datasource_1.PostgresDataSource, Function, Function])
], GroupRepository);
//# sourceMappingURL=group.repository.js.map