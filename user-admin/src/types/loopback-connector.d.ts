declare module 'loopback-connector' {
  export enum IsolationLevel {
    READ_UNCOMMITTED = 'READ UNCOMMITTED',
    READ_COMMITTED = 'READ COMMITTED',
    REPEATABLE_READ = 'REPEATABLE READ',
    SERIALIZABLE = 'SERIALIZABLE'
  }

  export interface Transaction {
    execute(sql: string): Promise<any>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
  }
} 