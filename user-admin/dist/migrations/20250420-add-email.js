"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addEmailField = void 0;
/**
 * Migration to add email field to users table
 */
async function addEmailField(app) {
    // Get the datasource
    const dataSource = await app.get('datasources.postgres');
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
exports.addEmailField = addEmailField;
//# sourceMappingURL=20250420-add-email.js.map