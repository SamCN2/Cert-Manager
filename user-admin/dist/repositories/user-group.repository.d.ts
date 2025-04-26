/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { DefaultCrudRepository } from '@loopback/repository';
import { PostgresDataSource } from '../datasources/postgres.datasource';
import { UserGroup, UserGroupRelations } from '../models';
export declare class UserGroupRepository extends DefaultCrudRepository<UserGroup, typeof UserGroup.prototype.username, UserGroupRelations> {
    constructor(dataSource: PostgresDataSource);
}
