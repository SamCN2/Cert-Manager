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
import {Group, GroupRelations, User, UserGroup} from '../models';
import {UserGroupRepository} from './user-group.repository';
import {UserRepository} from './user.repository';

export class GroupRepository extends DefaultCrudRepository<
  Group,
  typeof Group.prototype.name,
  GroupRelations
> {
  public readonly users: HasManyThroughRepositoryFactory<
    User,
    typeof User.prototype.username,
    UserGroup,
    typeof Group.prototype.name
  >;

  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
    @repository.getter('UserGroupRepository')
    protected userGroupRepositoryGetter: Getter<UserGroupRepository>,
    @repository.getter('UserRepository')
    protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(Group, dataSource);

    this.users = this.createHasManyThroughRepositoryFactoryFor(
      'users',
      userRepositoryGetter,
      userGroupRepositoryGetter,
    );

    this.registerInclusionResolver('users', this.users.inclusionResolver);
  }

  /**
   * Create a new group with optional user assignments
   */
  async createWithUsers(
    groupData: Pick<Group, 'name' | 'displayName' | 'description' | 'responsibleParty'>,
    usernames: string[],
    responsibleParty: string,
  ): Promise<Group> {
    const now = new Date().toISOString();
    const group = new Group({
      ...groupData,
      createdAt: now,
    });
    
    const createdGroup = await this.create(group);

    if (usernames.length > 0) {
      const userGroupRepo = await this.userGroupRepositoryGetter();
      await Promise.all(
        usernames.map(username =>
          userGroupRepo.create({
            username,
            groupName: createdGroup.name,
            responsibleParty,
            createdAt: now,
          }),
        ),
      );
    }

    return this.findById(createdGroup.name, {
      include: [{relation: 'users'}],
    });
  }

  /**
   * Update group's user memberships
   */
  async updateUsers(
    groupName: string,
    usernames: string[],
    responsibleParty: string,
  ): Promise<void> {
    const userGroupRepo = await this.userGroupRepositoryGetter();
    
    // Remove existing user memberships
    await userGroupRepo.deleteAll({groupName});

    // Add new user memberships
    if (usernames.length > 0) {
      const now = new Date().toISOString();
      await Promise.all(
        usernames.map(username =>
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