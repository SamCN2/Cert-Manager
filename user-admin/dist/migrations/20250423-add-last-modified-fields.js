"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddLastModifiedFieldsMigration = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@loopback/core");
const repository_1 = require("@loopback/repository");
/**
 * Add last_modified fields to users and request tables
 */
let AddLastModifiedFieldsMigration = class AddLastModifiedFieldsMigration {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async start() {
        console.log('Running migration: AddLastModifiedFieldsMigration');
        try {
            // Add last_modified_at and last_modified_by columns to users table
            await this.dataSource.execute(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_modified_by TEXT;
      `);
            console.log('Added columns to users table');
            // Add last_modified_at and last_modified_by columns to request table
            await this.dataSource.execute(`
        ALTER TABLE request 
        ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_modified_by TEXT;
      `);
            console.log('Added columns to request table');
            console.log('Migration completed successfully');
        }
        catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }
};
exports.AddLastModifiedFieldsMigration = AddLastModifiedFieldsMigration;
exports.AddLastModifiedFieldsMigration = AddLastModifiedFieldsMigration = tslib_1.__decorate([
    (0, core_1.bind)({ tags: ['migrations'] }),
    tslib_1.__param(0, (0, core_1.inject)('datasources.postgres')),
    tslib_1.__metadata("design:paramtypes", [repository_1.juggler.DataSource])
], AddLastModifiedFieldsMigration);
//# sourceMappingURL=20250423-add-last-modified-fields.js.map