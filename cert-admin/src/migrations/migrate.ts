/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {DataSource} from '@loopback/repository';
import {AddUniqueConstraints} from './20240415-add-unique-constraints';
import {AddEmailVerification} from './20240415-add-email-verification';
import {AddCodeVersionMigration} from './20240415-add-code-version';
import {addRevokedReason} from './20250416-add-revoked-reason';

export interface MigrationScript {
  up(): Promise<void>;
  down(): Promise<void>;
}

export abstract class BaseMigrationScript implements MigrationScript {
  constructor(protected dataSource: DataSource) {}

  protected async execute(sql: string): Promise<void> {
    await this.dataSource.execute(sql);
  }

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;
}

export async function migrate(app: any) {
  console.log('Running migrations...');
  
  const uniqueConstraints = new AddUniqueConstraints(app);
  const emailVerification = new AddEmailVerification(app);
  const codeVersion = new AddCodeVersionMigration(app);
  
  await uniqueConstraints.up();
  await emailVerification.up();
  await codeVersion.up();
  await addRevokedReason(app);
  
  console.log('Migrations completed successfully.');
} 