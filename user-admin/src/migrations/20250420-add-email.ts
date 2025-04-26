/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {UserAdminApplication} from '../application';
import {juggler} from '@loopback/repository';

/**
 * Migration to add email field to users table
 */
export async function addEmailField(app: UserAdminApplication) {
  // Get the datasource
  const dataSource = await app.get<juggler.DataSource>('datasources.postgres');
  
  // Add email column to users table if it doesn't exist
  await dataSource.execute(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='email'
      ) THEN 
        ALTER TABLE public.users ADD COLUMN email TEXT;
      END IF;
    END $$;
  `);

  console.log('Migration: Added email field to users table');
} 