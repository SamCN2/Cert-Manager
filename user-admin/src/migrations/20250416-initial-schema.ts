/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {UserAdminApplication} from '../application';
import {juggler} from '@loopback/repository';

/**
 * Initial schema migration for user-admin service
 */
export async function initialSchema(app: UserAdminApplication) {
  // Get the datasource
  const dataSource = await app.get<juggler.DataSource>('datasources.postgres');
  
  // Enable UUID extension if not already enabled
  await dataSource.execute(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  
  // Create users table
  await dataSource.execute(`
    CREATE TABLE IF NOT EXISTS public.users (
      username TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      responsible_party TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      last_modified_at TIMESTAMP WITH TIME ZONE,
      last_modified_by TEXT
    )
  `);

  // Create groups table
  await dataSource.execute(`
    CREATE TABLE IF NOT EXISTS public.groups (
      name TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      responsible_party TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      last_modified_at TIMESTAMP WITH TIME ZONE,
      last_modified_by TEXT
    )
  `);

  // Create user_groups table for many-to-many relationship
  await dataSource.execute(`
    CREATE TABLE IF NOT EXISTS public.user_groups (
      username TEXT NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
      group_name TEXT NOT NULL REFERENCES public.groups(name) ON DELETE CASCADE,
      responsible_party TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      PRIMARY KEY (username, group_name)
    )
  `);

  // Create indexes
  await dataSource.execute(`
    CREATE INDEX IF NOT EXISTS idx_users_responsible_party ON public.users(responsible_party);
    CREATE INDEX IF NOT EXISTS idx_groups_responsible_party ON public.groups(responsible_party);
    CREATE INDEX IF NOT EXISTS idx_user_groups_group_name ON public.user_groups(group_name);
    CREATE INDEX IF NOT EXISTS idx_user_groups_username ON public.user_groups(username);
  `);

  // Create requests table (if not exists)
  await dataSource.execute(`
    CREATE TABLE IF NOT EXISTS public.request (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username TEXT NOT NULL,
      displayname TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      challenge TEXT,
      createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index on challenge for faster lookups
  await dataSource.execute(`
    CREATE INDEX IF NOT EXISTS idx_request_challenge ON public.request(challenge);
  `);

  console.log('Migration: Created initial schema for user-admin service');
} 