/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {BaseMigrationScript} from './migrate';

/**
 * Add codeVersion field to track which version of the code created each certificate
 */
export class AddCodeVersionMigration extends BaseMigrationScript {
  async up(): Promise<void> {
    // Execute each statement separately to ensure proper order
    try {
      // 1. First add the column as nullable
      await this.dataSource.execute(
        `ALTER TABLE public.certificate ADD COLUMN IF NOT EXISTS "codeVersion" TEXT`
      );

      // 2. Update existing records with a default value
      await this.dataSource.execute(
        `UPDATE public.certificate SET "codeVersion" = 'pre-versioning' WHERE "codeVersion" IS NULL`
      );

      // 3. Only after all records have a value, make it NOT NULL
      await this.dataSource.execute(
        `ALTER TABLE public.certificate ALTER COLUMN "codeVersion" SET NOT NULL`
      );

      console.log('Successfully added codeVersion column and migrated existing data');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async down(): Promise<void> {
    try {
      await this.dataSource.execute(
        `ALTER TABLE public.certificate DROP COLUMN IF EXISTS "codeVersion"`
      );
      console.log('Successfully removed codeVersion column');
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
} 