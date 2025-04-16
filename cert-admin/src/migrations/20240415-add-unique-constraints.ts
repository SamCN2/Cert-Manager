/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {BaseMigrationScript} from './migrate';

/**
 * Add unique constraints for username and email
 */
export class AddUniqueConstraints extends BaseMigrationScript {
  async up(): Promise<void> {
    const statements = [
      // Create unique index for username
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_certificate_username 
       ON public.certificate (username) 
       WHERE revoked = false;`,

      // Create unique index for email
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_certificate_email 
       ON public.certificate (email) 
       WHERE revoked = false;`,
    ];

    for (const statement of statements) {
      await this.execute(statement);
    }
  }

  async down(): Promise<void> {
    const statements = [
      `DROP INDEX IF EXISTS public.idx_certificate_username;`,
      `DROP INDEX IF EXISTS public.idx_certificate_email;`,
    ];

    for (const statement of statements) {
      await this.execute(statement);
    }
  }
} 