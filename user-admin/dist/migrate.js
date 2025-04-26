"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = void 0;
async function migrate(app) {
    const ds = app.getSync('datasources.postgres');
    await ds.automigrate();
    console.log('Migration: Created initial schema for user-admin service');
}
exports.migrate = migrate;
// Standalone migration script
if (require.main === module) {
    const { UserAdminApplication } = require('./application');
    const app = new UserAdminApplication();
    app.boot().then(() => {
        const args = process.argv;
        const existingSchema = args.includes('--rebuild') ? 'drop' : 'alter';
        console.log('Migrating schemas (%s existing schema)', existingSchema);
        return app.migrateSchema();
    }).then(() => {
        process.exit(0);
    }).catch((err) => {
        console.error('Cannot migrate database schema', err);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate.js.map