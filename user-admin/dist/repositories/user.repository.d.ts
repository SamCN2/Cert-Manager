/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { Getter } from '@loopback/core';
import { DefaultCrudRepository } from '@loopback/repository';
import { PostgresDataSource } from '../datasources/postgres.datasource';
import { User, UserRelations, Group } from '../models';
import { UserGroupRepository } from './user-group.repository';
import { GroupRepository } from './group.repository';
import { RequestRepository } from './request.repository';
export interface UserWithGroups extends User {
    groups?: Group[];
}
export declare class UserRepository extends DefaultCrudRepository<User, typeof User.prototype.id, UserRelations> {
    protected userGroupRepositoryGetter: Getter<UserGroupRepository>;
    protected groupRepositoryGetter: Getter<GroupRepository>;
    protected requestRepositoryGetter: Getter<RequestRepository>;
    constructor(dataSource: PostgresDataSource, userGroupRepositoryGetter: Getter<UserGroupRepository>, groupRepositoryGetter: Getter<GroupRepository>, requestRepositoryGetter: Getter<RequestRepository>);
    /**
     * Override create to ensure users can only be created from requests
     */
    create(entity: Partial<User>, options?: object): Promise<User>;
    /**
     * Create a new user with optional group assignments
     */
    createWithGroups(userData: Pick<User, 'id' | 'username' | 'displayName' | 'responsibleParty' | 'createdAt' | 'status'>, groupNames: string[], responsibleParty: string): Promise<UserWithGroups>;
    /**
     * Update user's group memberships
     */
    updateGroups(userId: string, groupNames: string[], responsibleParty: string): Promise<void>;
    /**
     * Find user by ID with groups
     */
    findByIdWithGroups(id: string): Promise<UserWithGroups>;
}
