/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { LifeCycleObserver } from '@loopback/core';
import { juggler } from '@loopback/repository';
export declare class PostgresDataSource extends juggler.DataSource implements LifeCycleObserver {
    static dataSourceName: string;
    static readonly defaultConfig: {
        name: string;
        connector: string;
        host: string;
        user: string;
        database: string;
        ssl: boolean;
        schema: string;
    };
    constructor(dsConfig?: object);
}
