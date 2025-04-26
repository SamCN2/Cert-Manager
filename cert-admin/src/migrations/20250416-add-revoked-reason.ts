/**
 * Copyright (c) 2025 ogt11.com, llc
 */

/**
 * Add revoked_reason column to certificate table
 */
export async function addRevokedReason(app: any) {
  const ds = app.dataSource;
  
  // Add revoked_reason column
  await ds.execute(
    'ALTER TABLE public.certificate ADD COLUMN IF NOT EXISTS revoked_reason text'
  );
  
  console.log('Migration: Added revoked_reason column to certificate table');
} 