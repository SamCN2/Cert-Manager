"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = void 0;
const _20250416_initial_schema_1 = require("./20250416-initial-schema");
const _20250420_add_email_1 = require("./20250420-add-email");
const _20240610_update_users_request_schema_1 = require("./20240610-update-users-request-schema");
async function migrate(app) {
    console.log('Running migrations...');
    await (0, _20250416_initial_schema_1.initialSchema)(app);
    await (0, _20250420_add_email_1.addEmailField)(app);
    await (0, _20240610_update_users_request_schema_1.updateUsersRequestSchema)(app);
    console.log('Migrations completed successfully.');
}
exports.migrate = migrate;
//# sourceMappingURL=migrate.js.map