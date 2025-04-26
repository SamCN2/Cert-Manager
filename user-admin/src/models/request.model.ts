import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'request'
    }
  }
})
export class Request extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    postgresql: {
      columnName: 'id',
      dataType: 'uuid',
      dataLength: null,
      dataPrecision: null,
      dataScale: null,
      nullable: 'NO',
    }
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
    pattern: '^[a-z0-9\\-]{2,30}$',
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
      columnName: 'displayname',
      dataType: 'text',
    }
  })
  displayName: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'email',
      dataType: 'text',
    }
  })
  email: string;

  @property({
    type: 'string',
    default: 'pending',
    postgresql: {
      columnName: 'status',
      dataType: 'text',
    }
  })
  status: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'challenge',
      dataType: 'text',
    }
  })
  challenge?: string;

  @property({
    type: 'date',
    default: () => new Date(),
    postgresql: {
      columnName: 'createdat',
      dataType: 'timestamp with time zone',
    }
  })
  createdAt?: Date;

  @property({
    type: 'date',
    postgresql: {
      columnName: 'last_modified_at',
      dataType: 'timestamp with time zone',
    },
  })
  lastModifiedAt?: Date;

  constructor(data?: Partial<Request>) {
    super(data);
  }
} 