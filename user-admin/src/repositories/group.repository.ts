/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {inject, Getter} from '@loopback/core';
import {
  DefaultCrudRepository,
  repository,
} from '@loopback/repository';
import {PostgresDataSource} from '../datasources/postgres.datasource';
import {Group, GroupRelations, User} from '../models';
import {UserGroupRepository} from './user-group.repository';
import {UserRepository} from './user.repository';

export interface GroupWithUsers extends Group {
  users?: User[];
}

export class GroupRepository extends DefaultCrudRepository<
  Group,
  typeof Group.prototype.name,
  GroupRelations
> {
  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
    @repository.getter('UserGroupRepository')
    protected userGroupRepositoryGetter: Getter<UserGroupRepository>,
    @repository.getter('UserRepository')
    protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(Group, dataSource);
  }

  /**
   * Create a new group with optional user assignments
   */
  async createWithUsers(
    groupData: Pick<Group, 'name' | 'displayName' | 'description' | 'responsibleParty'>,
    userIds: string[],
    responsibleParty: string,
  ): Promise<GroupWithUsers> {
    const now = new Date();
    const group = new Group({
      ...groupData,
      createdAt: now,
    });
    
    const createdGroup = await this.create(group);

    if (userIds.length > 0) {
      const userGroupRepo = await this.userGroupRepositoryGetter();
      await Promise.all(
        userIds.map(userId =>
          userGroupRepo.create({
            userId,
            groupName: createdGroup.name,
            responsibleParty,
            createdAt: now,
          }),
        ),
      );
    }

    return this.findByNameWithUsers(createdGroup.name);
  }

  /**
   * Update group's user memberships
   */
  async updateUsers(
    groupName: string,
    userIds: string[],
    responsibleParty: string,
  ): Promise<void> {
    const userGroupRepo = await this.userGroupRepositoryGetter();
    
    // Remove existing user memberships
    await userGroupRepo.deleteAll({groupName});

    // Add new user memberships
    if (userIds.length > 0) {
      const now = new Date();
      await Promise.all(
        userIds.map(userId =>
          userGroupRepo.create({
            userId,
            groupName,
            responsibleParty,
            createdAt: now,
          }),
        ),
      );
    }
  }

  /**
   * Find group by name with users
   */
  async findByNameWithUsers(
    name: string,
  ): Promise<GroupWithUsers> {
    const group = await this.findById(name);
    const userGroupRepo = await this.userGroupRepositoryGetter();
    const userRepo = await this.userRepositoryGetter();
    const userGroups = await userGroupRepo.find({where: {groupName: name}});
    const users = await Promise.all(
      userGroups.map(ug => userRepo.findById(ug.userId))
    );

    return Object.assign(group, { users });
  }
} 