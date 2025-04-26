"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddStatusFieldMigration = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@loopback/core");
const repository_1 = require("@loopback/repository");
/**
 * Add status field to users table
 */
let AddStatusFieldMigration = class AddStatusFieldMigration {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async start() {
        console.log('Running migration: AddStatusFieldMigration');
        try {
            // Add status column to users table
            await this.dataSource.execute(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
      `);
            console.log('Added status column to users table');
            console.log('Migration completed successfully');
        }
        catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }
};
exports.AddStatusFieldMigration = AddStatusFieldMigration;
exports.AddStatusFieldMigration = AddStatusFieldMigration = tslib_1.__decorate([
    (0, core_1.bind)({ tags: ['migrations'] }),
    tslib_1.__param(0, (0, core_1.inject)('datasources.postgres')),
    tslib_1.__metadata("design:paramtypes", [repository_1.juggler.DataSource])
], AddStatusFieldMigration);
//# sourceMappingURL=20250423-add-status-field.js.map