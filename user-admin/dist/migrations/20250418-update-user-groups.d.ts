import { juggler } from '@loopback/repository';
export declare abstract class BaseMigrationScript {
    protected dataSource: juggler.DataSource;
    constructor(dataSource: juggler.DataSource);
    protected execute(sql: string): Promise<void>;
    abstract up(): Promise<void>;
    abstract down(): Promise<void>;
}
export declare class UpdateUserGroupsMigration extends BaseMigrationScript {
    up(): Promise<void>;
    down(): Promise<void>;
}
export declare function updateUserGroups(dataSource: juggler.DataSource): Promise<void>;
