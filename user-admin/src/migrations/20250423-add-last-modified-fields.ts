import {LifeCycleObserver, inject, bind} from '@loopback/core';
import {juggler} from '@loopback/repository';

/**
 * Add last_modified fields to users and request tables
 */
@bind({tags: ['migrations']})
export class AddLastModifiedFieldsMigration implements LifeCycleObserver {
  constructor(
    @inject('datasources.postgres') private dataSource: juggler.DataSource,
  ) {}

  async start(): Promise<void> {
    console.log('Running migration: AddLastModifiedFieldsMigration');
    try {
      // Add last_modified_at and last_modified_by columns to users table
      await this.dataSource.execute(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_modified_by TEXT;
      `);
      console.log('Added columns to users table');

      // Add last_modified_at and last_modified_by columns to request table
      await this.dataSource.execute(`
        ALTER TABLE request 
        ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_modified_by TEXT;
      `);
      console.log('Added columns to request table');

      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }
} 