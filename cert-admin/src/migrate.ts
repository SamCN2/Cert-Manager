/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {CertAdminApplication} from './application';

export async function migrate(args: string[]) {
  const existingSchema = args.includes('--rebuild') ? 'drop' : 'alter';
  console.log('Migrating schemas (%s existing schema)', existingSchema);

  const app = new CertAdminApplication();
  await app.boot();
  await app.migrateSchema({
    existingSchema,
    models: ['Certificate', 'CertificateRequest']
  });

  // Shutdown application to avoid hanging
  process.exit(0);
}

migrate(process.argv).catch(err => {
  console.error('Cannot migrate database schema', err);
  process.exit(1);
});
