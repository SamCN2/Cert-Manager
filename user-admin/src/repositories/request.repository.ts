import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresDataSource} from '../datasources';
import {Request} from '../models';

export class RequestRepository extends DefaultCrudRepository<
  Request,
  typeof Request.prototype.id
> {
  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
  ) {
    super(Request, dataSource);
  }
} 