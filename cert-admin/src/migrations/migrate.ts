/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {DataSource} from '@loopback/repository';

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