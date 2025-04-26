"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAdminApplication = void 0;
const tslib_1 = require("tslib");
const boot_1 = require("@loopback/boot");
const repository_1 = require("@loopback/repository");
const rest_1 = require("@loopback/rest");
const rest_explorer_1 = require("@loopback/rest-explorer");
const service_proxy_1 = require("@loopback/service-proxy");
const path_1 = tslib_1.__importDefault(require("path"));
const _20250423_add_last_modified_fields_1 = require("./migrations/20250423-add-last-modified-fields");
const _20250423_add_status_field_1 = require("./migrations/20250423-add-status-field");
const sequence_1 = require("./sequence");
const datasources_1 = require("./datasources");
class UserAdminApplication extends (0, boot_1.BootMixin)((0, service_proxy_1.ServiceMixin)((0, repository_1.RepositoryMixin)(rest_1.RestApplication))) {
    constructor(options = {}) {
        super(options);
        // Set up the custom sequence
        this.sequence(sequence_1.MySequence);
        // Configure the PostgreSQL datasource
        const ds = new datasources_1.PostgresDataSource();
        this.dataSource(ds, 'postgres');
        // Set up bindings
        this.bind('migrations.AddLastModifiedFieldsMigration').toClass(_20250423_add_last_modified_fields_1.AddLastModifiedFieldsMigration);
        this.bind('migrations.AddStatusFieldMigration').toClass(_20250423_add_status_field_1.AddStatusFieldMigration);
        // Set up home page
        this.static('/', path_1.default.join(__dirname, '../public'));
        // Customize @loopback/rest-explorer configuration here
        this.configure(rest_explorer_1.RestExplorerBindings.COMPONENT).to({
            path: '/explorer',
        });
        this.component(rest_explorer_1.RestExplorerComponent);
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
    async migrate() {
        const lastModifiedMigration = await this.get('migrations.AddLastModifiedFieldsMigration');
        await lastModifiedMigration.start();
        const statusMigration = await this.get('migrations.AddStatusFieldMigration');
        await statusMigration.start();
    }
    async boot() {
        await super.boot();
        await this.migrate();
    }
}
exports.UserAdminApplication = UserAdminApplication;
//# sourceMappingURL=application.js.map