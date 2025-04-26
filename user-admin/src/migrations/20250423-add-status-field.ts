import {LifeCycleObserver, inject, bind} from '@loopback/core';
import {juggler} from '@loopback/repository';

/**
 * Add status field to users table
 */
@bind({tags: ['migrations']})
export class AddStatusFieldMigration implements LifeCycleObserver {
  constructor(
    @inject('datasources.postgres') private dataSource: juggler.DataSource,
  ) {}

  async start(): Promise<void> {
    console.log('Running migration: AddStatusFieldMigration');
    try {
      // Add status column to users table
      await this.dataSource.execute(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
      `);
      console.log('Added status column to users table');
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }
} 