/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { Getter } from '@loopback/core';
import { DefaultCrudRepository } from '@loopback/repository';
import { PostgresDataSource } from '../datasources/postgres.datasource';
import { Group, GroupRelations, User } from '../models';
import { UserGroupRepository } from './user-group.repository';
import { UserRepository } from './user.repository';
export interface GroupWithUsers extends Group {
    users?: User[];
}
export declare class GroupRepository extends DefaultCrudRepository<Group, typeof Group.prototype.name, GroupRelations> {
    protected userGroupRepositoryGetter: Getter<UserGroupRepository>;
    protected userRepositoryGetter: Getter<UserRepository>;
    constructor(dataSource: PostgresDataSource, userGroupRepositoryGetter: Getter<UserGroupRepository>, userRepositoryGetter: Getter<UserRepository>);
    /**
     * Create a new group with optional user assignments
     */
    createWithUsers(groupData: Pick<Group, 'name' | 'displayName' | 'description' | 'responsibleParty'>, userIds: string[], responsibleParty: string): Promise<GroupWithUsers>;
    /**
     * Update group's user memberships
     */
    updateUsers(groupName: string, userIds: string[], responsibleParty: string): Promise<void>;
    /**
     * Find group by name with users
     */
    findByNameWithUsers(name: string): Promise<GroupWithUsers>;
}
