import { LifeCycleObserver } from '@loopback/core';
import { juggler } from '@loopback/repository';
/**
 * Add last_modified fields to users and request tables
 */
export declare class AddLastModifiedFieldsMigration implements LifeCycleObserver {
    private dataSource;
    constructor(dataSource: juggler.DataSource);
    start(): Promise<void>;
}
