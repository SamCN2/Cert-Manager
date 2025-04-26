import { DefaultCrudRepository } from '@loopback/repository';
import { PostgresDataSource } from '../datasources';
import { Request } from '../models';
export declare class RequestRepository extends DefaultCrudRepository<Request, typeof Request.prototype.id> {
    constructor(dataSource: PostgresDataSource);
}
