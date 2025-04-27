/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {inject, Getter} from '@loopback/core';
import {
  DefaultCrudRepository,
  repository,
} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {PostgresDataSource} from '../datasources/postgres.datasource';
import {User, UserRelations, Group} from '../models';
import {UserGroupRepository} from './user-group.repository';
import {GroupRepository} from './group.repository';
import {RequestRepository} from './request.repository';

export interface UserWithGroups extends User {
  groups?: Group[];
}

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {
  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
    @repository.getter('UserGroupRepository')
    protected userGroupRepositoryGetter: Getter<UserGroupRepository>,
    @repository.getter('GroupRepository')
    protected groupRepositoryGetter: Getter<GroupRepository>,
    @repository.getter('RequestRepository')
    protected requestRepositoryGetter: Getter<RequestRepository>,
  ) {
    super(User, dataSource);
  }

  /**
   * Override create to ensure users can only be created from requests
   */
  async create(entity: Partial<User>, options?: object): Promise<User> {
    const requestRepo = await this.requestRepositoryGetter();
    const request = await requestRepo.findOne({
      where: {
        username: entity.username,
        id: entity.id,
      },
    });

    if (!request) {
      throw new HttpErrors.UnprocessableEntity(
        `Cannot create user without a corresponding request. No request found for username ${entity.username} and id ${entity.id}`,
      );
    }

    return super.create(entity, options);
  }

  /**
   * Create a new user with optional group assignments
   */
  async createWithGroups(
    userData: Pick<User, 'id' | 'username' | 'displayName' | 'responsibleParty' | 'createdAt' | 'status'>,
    groupNames: string[],
    responsibleParty: string,
  ): Promise<UserWithGroups> {
    const user = new User(userData);
    
    const createdUser = await this.create(user);

    if (groupNames.length > 0) {
      const userGroupRepo = await this.userGroupRepositoryGetter();
      await Promise.all(
        groupNames.map(groupName =>
          userGroupRepo.create({
            userId: createdUser.id,
            username: createdUser.username,
            groupName,
            responsibleParty,
            createdAt: userData.createdAt,
          }),
        ),
      );
    }

    // Get the user's groups manually
    const userGroupRepo = await this.userGroupRepositoryGetter();
    const groupRepo = await this.groupRepositoryGetter();
    const userGroups = await userGroupRepo.find({where: {userId: createdUser.id}});
    const groups = await Promise.all(
      userGroups.map(ug => groupRepo.findById(ug.groupName))
    );

    return Object.assign(createdUser, { groups });
  }

  /**
   * Update user's group memberships
   */
  async updateGroups(
    userId: string,
    groupNames: string[],
    responsibleParty: string,
  ): Promise<void> {
    const userGroupRepo = await this.userGroupRepositoryGetter();
    
    // Get the user to access their username
    const user = await this.findById(userId);
    
    // Remove existing group memberships
    await userGroupRepo.deleteAll({userId});

    // Add new group memberships
    if (groupNames.length > 0) {
      const now = new Date();
      await Promise.all(
        groupNames.map(groupName =>
          userGroupRepo.create({
            userId,
            username: user.username,
            groupName,
            responsibleParty,
            createdAt: now,
          }),
        ),
      );
    }
  }

  /**
   * Find user by ID with groups
   */
  async findByIdWithGroups(
    id: string,
  ): Promise<UserWithGroups> {
    const user = await this.findById(id);
    const userGroupRepo = await this.userGroupRepositoryGetter();
    const groupRepo = await this.groupRepositoryGetter();
    const userGroups = await userGroupRepo.find({where: {userId: id}});
    const groups = await Promise.all(
      userGroups.map(ug => groupRepo.findById(ug.groupName))
    );

    return Object.assign(user, { groups });
  }
} 