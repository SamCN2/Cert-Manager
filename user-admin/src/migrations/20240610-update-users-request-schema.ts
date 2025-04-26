import {UserAdminApplication} from '../application';
import {juggler} from '@loopback/repository';

/**
 * Migration to update users and request schema:
 * - Add UUID id as primary key to users
 * - Make username unique (not PK)
 * - Drop last_modified_at and last_modified_by from request if they exist
 */
export async function updateUsersRequestSchema(app: UserAdminApplication) {
  const dataSource = await app.get<juggler.DataSource>('datasources.postgres');

  // Add id column to users if it doesn't exist
  await dataSource.execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='id'
      ) THEN
        ALTER TABLE public.users ADD COLUMN id UUID DEFAULT uuid_generate_v4();
      END IF;
    END $$;
  `);

  // Set id as primary key if not already
  await dataSource.execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='users' AND constraint_type='PRIMARY KEY'
      ) THEN
        ALTER TABLE public.users ADD PRIMARY KEY (id);
      END IF;
    END $$;
  `);

  // Make username unique (if not already)
  await dataSource.execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='users' AND constraint_type='UNIQUE' AND constraint_name='users_username_key'
      ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
      END IF;
    END $$;
  `);

  // Drop last_modified_at and last_modified_by from request if they exist
  await dataSource.execute(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='request' AND column_name='last_modified_at'
      ) THEN
        ALTER TABLE public.request DROP COLUMN last_modified_at;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='request' AND column_name='last_modified_by'
      ) THEN
        ALTER TABLE public.request DROP COLUMN last_modified_by;
      END IF;
    END $$;
  `);

  console.log('Migration: Updated users and request schema (id PK, username unique, dropped last_modified columns)');
} 