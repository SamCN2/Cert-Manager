/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {inject, Getter} from '@loopback/core';
import {
  DefaultCrudRepository,
  repository,
  HasManyThroughRepositoryFactory,
} from '@loopback/repository';
import {PostgresDataSource} from '../datasources/postgres.datasource';
import {User, UserRelations, Group, UserGroup} from '../models';
import {UserGroupRepository} from './user-group.repository';
import {GroupRepository} from './group.repository';

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.username,
  UserRelations
> {
  public readonly groups: HasManyThroughRepositoryFactory<
    Group,
    typeof Group.prototype.name,
    UserGroup,
    typeof User.prototype.username
  >;

  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
    @repository.getter('UserGroupRepository')
    protected userGroupRepositoryGetter: Getter<UserGroupRepository>,
    @repository.getter('GroupRepository')
    protected groupRepositoryGetter: Getter<GroupRepository>,
  ) {
    super(User, dataSource);

    this.groups = this.createHasManyThroughRepositoryFactoryFor(
      'groups',
      groupRepositoryGetter,
      userGroupRepositoryGetter,
    );

    this.registerInclusionResolver('groups', this.groups.inclusionResolver);
  }

  /**
   * Create a new user with optional group assignments
   */
  async createWithGroups(
    userData: Pick<User, 'username' | 'displayName' | 'responsibleParty'>,
    groupNames: string[],
    responsibleParty: string,
  ): Promise<User> {
    const now = new Date();
    const user = new User({
      ...userData,
      createdAt: now,
    });
    
    const createdUser = await this.create(user);

    if (groupNames.length > 0) {
      const userGroupRepo = await this.userGroupRepositoryGetter();
      await Promise.all(
        groupNames.map(groupName =>
          userGroupRepo.create({
            username: createdUser.username,
            groupName,
            responsibleParty,
            createdAt: now,
          }),
        ),
      );
    }

    return this.findById(createdUser.username, {
      include: [{relation: 'groups'}],
    });
  }

  /**
   * Update user's group memberships
   */
  async updateGroups(
    username: string,
    groupNames: string[],
    responsibleParty: string,
  ): Promise<void> {
    const userGroupRepo = await this.userGroupRepositoryGetter();
    
    // Remove existing group memberships
    await userGroupRepo.deleteAll({username});

    // Add new group memberships
    if (groupNames.length > 0) {
      const now = new Date();
      await Promise.all(
        groupNames.map(groupName =>
          userGroupRepo.create({
            username,
            groupName,
            responsibleParty,
            createdAt: now,
          }),
        ),
      );
    }
  }
} 