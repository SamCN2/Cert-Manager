/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {Entity, model, property} from '@loopback/repository';
import {User} from './user.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'groups'
    },
    indexes: {
      uniqueGroupName: {
        keys: {name: 1},
        options: {unique: true}
      }
    }
  }
})
export class Group extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
    postgresql: {
      columnName: 'name',
      dataType: 'text',
    }
  })
  name: string;

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
      columnName: 'description',
      dataType: 'text',
    }
  })
  description?: string;

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

  constructor(data?: Partial<Group>) {
    super(data);
  }
}

export interface GroupRelations {
  users?: User[];
}

export type GroupWithRelations = Group & GroupRelations; 