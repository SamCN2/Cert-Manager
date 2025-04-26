/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {Application} from '@loopback/core';
import {PostgresDataSource} from './datasources';

export async function migrate(app: Application) {
  const ds = app.getSync('datasources.postgres') as PostgresDataSource;
  await ds.automigrate();
  console.log('Migration: Created initial schema for user-admin service');
}

// Standalone migration script
if (require.main === module) {
  const {UserAdminApplication} = require('./application');
  const app = new UserAdminApplication();
  app.boot().then(() => {
    const args = process.argv;
    const existingSchema = args.includes('--rebuild') ? 'drop' : 'alter';
    console.log('Migrating schemas (%s existing schema)', existingSchema);
    return app.migrateSchema();
  }).then(() => {
    process.exit(0);
  }).catch((err: Error) => {
    console.error('Cannot migrate database schema', err);
    process.exit(1);
  });
} 