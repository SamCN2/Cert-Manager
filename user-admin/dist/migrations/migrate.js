"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = exports.BaseMigrationScript = void 0;
const _20250418_update_user_groups_1 = require("./20250418-update-user-groups");
const datasources_1 = require("../datasources");
class BaseMigrationScript {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async execute(sql) {
        await this.dataSource.execute(sql);
    }
}
exports.BaseMigrationScript = BaseMigrationScript;
async function migrate() {
    console.log('Running migrations...');
    const dataSource = new datasources_1.PostgresDataSource();
    // Wait for the datasource to be ready
    await new Promise((resolve, reject) => {
        dataSource.once('connected', () => resolve());
        dataSource.once('error', err => reject(err));
        dataSource.connect();
    });
    try {
        const updateUserGroups = new _20250418_update_user_groups_1.UpdateUserGroupsMigration(dataSource);
        await updateUserGroups.up();
        console.log('Migrations completed successfully.');
    }
    catch (err) {
        console.error('Migration failed:', err);
        throw err;
    }
    finally {
        await dataSource.disconnect();
    }
}
exports.migrate = migrate;
// Run migrations if this file is run directly
if (require.main === module) {
    migrate().catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate.js.map