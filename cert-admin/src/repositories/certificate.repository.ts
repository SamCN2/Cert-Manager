/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {Certificate, CertificateRelations} from '../models/certificate.model';
import {DbDataSource} from '../datasources';

export class CertificateRepository extends DefaultCrudRepository<
  Certificate,
  typeof Certificate.prototype.serialNumber,
  CertificateRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Certificate, dataSource);
  }
}
