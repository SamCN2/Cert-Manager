/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {Entity, model, property} from '@loopback/repository';

@model({
  name: 'certificate',
  settings: {
    postgresql: {
      schema: 'public',
      table: 'certificate'
    },
    strict: true
  }
})
export class Certificate extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      columnName: 'serial_number',
      dataType: 'uuid',
    },
  })
  serialNumber: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'code_version',
      dataType: 'text',
    },
  })
  code_version: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'username',
      dataType: 'text',
    },
  })
  username: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'commonname',
      dataType: 'text',
    },
  })
  commonname?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'email',
      dataType: 'text',
    },
  })
  email?: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'fingerprint',
      dataType: 'text',
    },
  })
  fingerprint: string;

  @property({
    type: 'date',
    required: true,
    postgresql: {
      columnName: 'not_before',
      dataType: 'timestamp with time zone',
    },
  })
  not_before: Date;

  @property({
    type: 'date',
    required: true,
    postgresql: {
      columnName: 'not_after',
      dataType: 'timestamp with time zone',
    },
  })
  not_after: Date;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'userid',
      dataType: 'uuid',
    },
  })
  userid: string;

  @property({
    type: 'string',
    required: true,
    default: 'absent',
    postgresql: {
      columnName: 'status',
      dataType: 'text',
    },
  })
  status: 'absent' | 'present' | 'active' | 'revoked';

  @property({
    type: 'date',
    postgresql: {
      columnName: 'revokedat',
      dataType: 'timestamp with time zone',
    },
  })
  revokedat?: Date;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'roles',
      dataType: 'text',
    },
  })
  roles?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'revocation_reason',
      dataType: 'text',
    },
  })
  revocation_reason?: string;

  @property({
    type: 'date',
    required: true,
    default: () => new Date(),
    postgresql: {
      columnName: 'createdat',
      dataType: 'timestamp with time zone',
    },
  })
  createdat: Date;

  @property({
    type: 'boolean',
    required: true,
    default: false,
    postgresql: {
      columnName: 'is_first_certificate',
      dataType: 'boolean',
    },
  })
  is_first_certificate: boolean;

  constructor(data?: Partial<Certificate>) {
    super(data);
  }
}

export interface CertificateRelations {
  // describe navigational properties here
}

export type CertificateWithRelations = Certificate & CertificateRelations;
