/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {createBindingFromClass} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {RestExplorerBindings, RestExplorerComponent} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {AddLastModifiedFieldsMigration} from './migrations/20250423-add-last-modified-fields';
import {AddStatusFieldMigration} from './migrations/20250423-add-status-field';
import {MySequence} from './sequence';
import {PostgresDataSource} from './datasources';

export {ApplicationConfig};

export class UserAdminApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Configure the PostgreSQL datasource
    const ds = new PostgresDataSource();
    this.dataSource(ds, 'postgres');

    // Set up bindings
    this.bind('migrations.AddLastModifiedFieldsMigration').toClass(AddLastModifiedFieldsMigration);
    this.bind('migrations.AddStatusFieldMigration').toClass(AddStatusFieldMigration);

    // Set up home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });

    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  async migrate(): Promise<void> {
    const lastModifiedMigration = await this.get<AddLastModifiedFieldsMigration>(
      'migrations.AddLastModifiedFieldsMigration',
    );
    await lastModifiedMigration.start();

    const statusMigration = await this.get<AddStatusFieldMigration>(
      'migrations.AddStatusFieldMigration',
    );
    await statusMigration.start();
  }

  async boot(): Promise<void> {
    await super.boot();
    await this.migrate();
  }
} 