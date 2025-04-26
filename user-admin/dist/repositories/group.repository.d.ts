/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { Getter } from '@loopback/core';
import { DefaultCrudRepository, HasManyThroughRepositoryFactory } from '@loopback/repository';
import { PostgresDataSource } from '../datasources/postgres.datasource';
import { Group, GroupRelations, User, UserGroup } from '../models';
import { UserGroupRepository } from './user-group.repository';
import { UserRepository } from './user.repository';
export declare class GroupRepository extends DefaultCrudRepository<Group, typeof Group.prototype.name, GroupRelations> {
    protected userGroupRepositoryGetter: Getter<UserGroupRepository>;
    protected userRepositoryGetter: Getter<UserRepository>;
    readonly users: HasManyThroughRepositoryFactory<User, typeof User.prototype.username, UserGroup, typeof Group.prototype.name>;
    constructor(dataSource: PostgresDataSource, userGroupRepositoryGetter: Getter<UserGroupRepository>, userRepositoryGetter: Getter<UserRepository>);
    /**
     * Create a new group with optional user assignments
     */
    createWithUsers(groupData: Pick<Group, 'name' | 'displayName' | 'description' | 'responsibleParty'>, usernames: string[], responsibleParty: string): Promise<Group>;
    /**
     * Update group's user memberships
     */
    updateUsers(groupName: string, usernames: string[], responsibleParty: string): Promise<void>;
}
