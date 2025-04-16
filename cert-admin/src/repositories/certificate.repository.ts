/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresDataSource} from '../datasources';
import {Certificate, CertificateRelations} from '../models';

export class CertificateRepository extends DefaultCrudRepository<
  Certificate,
  typeof Certificate.prototype.serialNumber,
  CertificateRelations
> {
  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
  ) {
    super(Certificate, dataSource);
  }
}
