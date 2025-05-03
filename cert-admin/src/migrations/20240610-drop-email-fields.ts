/**
 * Migration to drop email-related columns from certificates table
 */
import {PostgresDataSource} from '../datasources';

export async function up(dataSource: PostgresDataSource) {
  const tx = await dataSource.beginTransaction({isolationLevel: 'SERIALIZABLE'});
  try {
    await (tx as any).execute(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='certificates' AND column_name='email_verified'
        ) THEN
          ALTER TABLE certificates DROP COLUMN email_verified;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='certificates' AND column_name='email_challenge'
        ) THEN
          ALTER TABLE certificates DROP COLUMN email_challenge;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='certificates' AND column_name='challenge_generated_at'
        ) THEN
          ALTER TABLE certificates DROP COLUMN challenge_generated_at;
        END IF;
      END $$;
    `);
    await tx.commit();
    console.log('Dropped email-related columns from certificates table (if they existed)');
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function down(dataSource: PostgresDataSource) {
  // No-op: we do not want to re-add these columns
} 