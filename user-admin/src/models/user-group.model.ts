/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'user_groups'
    },
    indexes: {
      uniqueUserGroup: {
        keys: {
          username: 1,
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
  // describe navigational properties here
}

export type UserGroupWithRelations = UserGroup & UserGroupRelations; 