/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { Getter } from '@loopback/core';
import { DefaultCrudRepository, HasManyThroughRepositoryFactory } from '@loopback/repository';
import { PostgresDataSource } from '../datasources/postgres.datasource';
import { User, UserRelations, Group, UserGroup } from '../models';
import { UserGroupRepository } from './user-group.repository';
import { GroupRepository } from './group.repository';
export declare class UserRepository extends DefaultCrudRepository<User, typeof User.prototype.username, UserRelations> {
    protected userGroupRepositoryGetter: Getter<UserGroupRepository>;
    protected groupRepositoryGetter: Getter<GroupRepository>;
    readonly groups: HasManyThroughRepositoryFactory<Group, typeof Group.prototype.name, UserGroup, typeof User.prototype.username>;
    constructor(dataSource: PostgresDataSource, userGroupRepositoryGetter: Getter<UserGroupRepository>, groupRepositoryGetter: Getter<GroupRepository>);
    /**
     * Create a new user with optional group assignments
     */
    createWithGroups(userData: Pick<User, 'username' | 'displayName' | 'responsibleParty'>, groupNames: string[], responsibleParty: string): Promise<User>;
    /**
     * Update user's group memberships
     */
    updateGroups(username: string, groupNames: string[], responsibleParty: string): Promise<void>;
}
