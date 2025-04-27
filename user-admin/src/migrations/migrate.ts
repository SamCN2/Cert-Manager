/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {juggler} from '@loopback/repository';
import {UpdateUserGroupsMigration} from './20250418-update-user-groups';
import {PostgresDataSource} from '../datasources';

export interface MigrationScript {
  up(): Promise<void>;
  down(): Promise<void>;
}

export abstract class BaseMigrationScript implements MigrationScript {
  constructor(protected dataSource: juggler.DataSource) {}

  protected async execute(sql: string): Promise<void> {
    await this.dataSource.execute(sql);
  }

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;
}

export async function migrate() {
  console.log('Running migrations...');
  
  const dataSource = new PostgresDataSource();
  
  // Wait for the datasource to be ready
  await new Promise<void>((resolve, reject) => {
    dataSource.once('connected', () => resolve());
    dataSource.once('error', err => reject(err));
    dataSource.connect();
  });

  try {
    const updateUserGroups = new UpdateUserGroupsMigration(dataSource);
    await updateUserGroups.up();
    
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await dataSource.disconnect();
  }
}

// Run migrations if this file is run directly
if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
} 