/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {Entity, model, property} from '@loopback/repository';
import {Group} from './group.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'users'
    },
    indexes: {
      uniqueUsername: {
        keys: {username: 1},
        options: {unique: true}
      }
    }
  }
})
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
    postgresql: {
      columnName: 'id',
      dataType: 'uuid',
    }
  })
  id: string;

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
    postgresql: {
      columnName: 'display_name',
      dataType: 'text',
    }
  })
  displayName: string;

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
    type: 'string',
    required: false,
    postgresql: {
      columnName: 'email',
      dataType: 'text',
    }
  })
  email?: string;

  @property({
    type: 'date',
    required: true,
    postgresql: {
      columnName: 'created_at',
      dataType: 'timestamp with time zone',
    }
  })
  createdAt: Date;

  @property({
    type: 'date',
    required: false,
    postgresql: {
      columnName: 'last_modified_at',
      dataType: 'timestamp with time zone',
    }
  })
  lastModifiedAt?: Date;

  @property({
    type: 'string',
    required: false,
    postgresql: {
      columnName: 'last_modified_by',
      dataType: 'text',
    }
  })
  lastModifiedBy?: string;

  @property({
    type: 'string',
    required: true,
    default: 'pending',
    postgresql: {
      columnName: 'status',
    },
  })
  status: string;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  groups?: Group[];
}

export type UserWithRelations = User & UserRelations; 