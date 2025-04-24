/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {Entity, model, property} from '@loopback/repository';

@model()
export class Certificate extends Entity {
  @property({
    type: 'string',
    id: true,
    postgresql: {
      dataType: 'text'
    }
  })
  serialNumber: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      dataType: 'text',
    },
  })
  codeVersion: string;

  @property({
    type: 'string',
    required: true,
  })
  username: string;

  @property({
    type: 'string',
  })
  commonName?: string;

  @property({
    type: 'string',
    required: false,
  })
  email: string;

  @property({
    type: 'boolean',
    required: false,
    default: false,
  })
  emailVerified: boolean;

  @property({
    type: 'string',
    required: false,
    postgresql: {
      columnName: 'email_challenge',
      dataType: 'text',
      nullable: true
    }
  })
  emailChallenge?: string;

  @property({
    type: 'date',
    required: false,
    postgresql: {
      columnName: 'challenge_generated_at',
      dataType: 'timestamp',
      nullable: true
    }
  })
  challengeGeneratedAt?: string;

  @property({
    type: 'string',
    required: false,
    postgresql: {
      columnName: 'fingerprint',
      dataType: 'text',
      nullable: true
    }
  })
  fingerprint?: string;

  @property({
    type: 'date',
    required: false,
  })
  issuedAt: string;

  @property({
    type: 'date',
    required: false,
  })
  expiresAt: string;

  @property({
    type: 'boolean',
    required: false,
    default: false,
  })
  revoked: boolean;

  @property({
    type: 'date',
  })
  revokedAt?: string;

  @property({
    type: 'string',
    required: false,
    postgresql: {
      columnName: 'revoked_reason',
      dataType: 'text',
      nullable: true
    }
  })
  revokedReason?: string;

  @property({
    type: 'array',
    itemType: 'string',
    required: false,
    default: ['user'],
  })
  roles: string[];


  constructor(data?: Partial<Certificate>) {
    super(data);
  }
}

export interface CertificateRelations {
  // describe navigational properties here
}

export type CertificateWithRelations = Certificate & CertificateRelations;
