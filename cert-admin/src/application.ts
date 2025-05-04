/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MySequence} from './sequence';
import {CSRController} from './controllers/csr.controller';
import {CertificateController} from './controllers/certificate.controller';
import {CertificateService} from './services/certificate.service';
import {CertificateRepository} from './repositories/certificate.repository';
import {UserRepository} from './repositories/user.repository';
import {CertificateService as CertificateServiceType} from './types';

export {ApplicationConfig};

export class CertAdminApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    // Configure base path for all routes
    this.basePath('/api/cert-admin');

    // Register controllers
    this.controller(CSRController);
    this.controller(CertificateController);

    // Configure repositories
    this.repository(CertificateRepository);
    this.repository(UserRepository);

    // Configure services
    this.service(CertificateService);

    // Configure bindings
    this.bind('services.CertificateService').toClass(CertificateService);
    this.bind('repositories.CertificateRepository').toClass(CertificateRepository);
    this.bind('repositories.UserRepository').toClass(UserRepository);

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
}
