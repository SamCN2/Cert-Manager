"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = void 0;
async function migrate() {
    console.log('No migrations to run.');
}
exports.migrate = migrate;
if (require.main === module) {
    migrate().catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate.js.map