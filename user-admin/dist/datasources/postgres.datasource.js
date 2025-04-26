"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresDataSource = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@loopback/core");
const repository_1 = require("@loopback/repository");
const config = {
    name: 'postgres',
    connector: 'postgresql',
    host: '/var/run/postgresql',
    user: 'samcn2',
    database: 'useradmin',
    ssl: false,
    schema: 'public'
};
let PostgresDataSource = class PostgresDataSource extends repository_1.juggler.DataSource {
    constructor(dsConfig = config) {
        super(dsConfig);
    }
};
exports.PostgresDataSource = PostgresDataSource;
PostgresDataSource.dataSourceName = 'postgres';
PostgresDataSource.defaultConfig = config;
exports.PostgresDataSource = PostgresDataSource = tslib_1.__decorate([
    (0, core_1.lifeCycleObserver)('datasource'),
    tslib_1.__param(0, (0, core_1.inject)('datasources.config.postgres', { optional: true })),
    tslib_1.__metadata("design:paramtypes", [Object])
], PostgresDataSource);
//# sourceMappingURL=postgres.datasource.js.map