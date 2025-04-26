import { LifeCycleObserver } from '@loopback/core';
import { juggler } from '@loopback/repository';
/**
 * Add status field to users table
 */
export declare class AddStatusFieldMigration implements LifeCycleObserver {
    private dataSource;
    constructor(dataSource: juggler.DataSource);
    start(): Promise<void>;
}
