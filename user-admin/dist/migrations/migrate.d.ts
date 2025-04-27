/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { juggler } from '@loopback/repository';
export interface MigrationScript {
    up(): Promise<void>;
    down(): Promise<void>;
}
export declare abstract class BaseMigrationScript implements MigrationScript {
    protected dataSource: juggler.DataSource;
    constructor(dataSource: juggler.DataSource);
    protected execute(sql: string): Promise<void>;
    abstract up(): Promise<void>;
    abstract down(): Promise<void>;
}
export declare function migrate(): Promise<void>;
