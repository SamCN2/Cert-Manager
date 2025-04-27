/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {Entity, model, property} from '@loopback/repository';
import {User} from './user.model';
import {Group} from './group.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'user_groups'
    },
    indexes: {
      uniqueUserGroup: {
        keys: {
          userId: 1,
          groupName: 1
        },
        options: {
          unique: true
        }
      }
    }
  }
})
export class UserGroup extends Entity {
  @property({
    type: 'string',
    required: true,
    id: true,
    postgresql: {
      columnName: 'user_id',
      dataType: 'uuid',
    }
  })
  userId: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'username',
      dataType: 'text',
    }
  })
  username: string;

  @property({
    type: 'string',
    required: true,
    id: true,
    postgresql: {
      columnName: 'group_name',
      dataType: 'text',
    }
  })
  groupName: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'responsible_party',
      dataType: 'text',
    }
  })
  responsibleParty: string;

  @property({
    type: 'date',
    required: true,
    postgresql: {
      columnName: 'created_at',
      dataType: 'timestamp with time zone',
    }
  })
  createdAt: Date;

  constructor(data?: Partial<UserGroup>) {
    super(data);
  }
}

export interface UserGroupRelations {
  user?: User;
  group?: Group;
}

export type UserGroupWithRelations = UserGroup & UserGroupRelations; 