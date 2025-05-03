import {PostgresDataSource} from '../datasources';

export async function createCertificatesTable(dataSource: PostgresDataSource) {
  const tx = await dataSource.beginTransaction({
    isolationLevel: 'SERIALIZABLE',
  });

  try {
    await (tx as any).execute(`
      CREATE TABLE certificate (
        id UUID PRIMARY KEY,
        serial_number TEXT NOT NULL UNIQUE,
        user_id UUID NOT NULL REFERENCES users(id),
        fingerprint TEXT NOT NULL UNIQUE,
        groups TEXT[] NOT NULL,
        not_before TIMESTAMP WITH TIME ZONE NOT NULL,
        not_after TIMESTAMP WITH TIME ZONE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP WITH TIME ZONE,
        revocation_reason TEXT,
        is_first_certificate BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE INDEX certificate_user_id_idx ON certificate(user_id);
      CREATE INDEX certificate_status_idx ON certificate(status);
      CREATE INDEX certificate_fingerprint_idx ON certificate(fingerprint);
    `);

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function down(dataSource: PostgresDataSource) {
  const tx = await dataSource.beginTransaction({
    isolationLevel: 'SERIALIZABLE',
  });

  try {
    await (tx as any).execute(`
      DROP TABLE IF EXISTS certificate CASCADE;
    `);

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
} 