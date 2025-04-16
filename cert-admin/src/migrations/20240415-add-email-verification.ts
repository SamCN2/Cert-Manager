/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {BaseMigrationScript} from './migrate';

/**
 * Add email verification fields to certificate table
 */
export class AddEmailVerification extends BaseMigrationScript {
  async up(): Promise<void> {
    const statements = [
      `ALTER TABLE public.certificate 
       ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
       ADD COLUMN email_challenge TEXT,
       ADD COLUMN challenge_generated_at TIMESTAMP;`,
    ];

    for (const statement of statements) {
      await this.execute(statement);
    }
  }

  async down(): Promise<void> {
    const statements = [
      `ALTER TABLE public.certificate 
       DROP COLUMN email_verified,
       DROP COLUMN email_challenge,
       DROP COLUMN challenge_generated_at;`,
    ];

    for (const statement of statements) {
      await this.execute(statement);
    }
  }
} 