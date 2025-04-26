"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserGroup = void 0;
const tslib_1 = require("tslib");
const repository_1 = require("@loopback/repository");
let UserGroup = class UserGroup extends repository_1.Entity {
    constructor(data) {
        super(data);
    }
};
exports.UserGroup = UserGroup;
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: true,
        id: true,
        postgresql: {
            columnName: 'username',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], UserGroup.prototype, "username", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: true,
        id: true,
        postgresql: {
            columnName: 'group_name',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], UserGroup.prototype, "groupName", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: true,
        postgresql: {
            columnName: 'responsible_party',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], UserGroup.prototype, "responsibleParty", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'date',
        required: true,
        postgresql: {
            columnName: 'created_at',
            dataType: 'timestamp with time zone',
        }
    }),
    tslib_1.__metadata("design:type", Date)
], UserGroup.prototype, "createdAt", void 0);
exports.UserGroup = UserGroup = tslib_1.__decorate([
    (0, repository_1.model)({
        settings: {
            postgresql: {
                schema: 'public',
                table: 'user_groups'
            },
            indexes: {
                uniqueUserGroup: {
                    keys: {
                        username: 1,
                        groupName: 1
                    },
                    options: {
                        unique: true
                    }
                }
            }
        }
    }),
    tslib_1.__metadata("design:paramtypes", [Object])
], UserGroup);
//# sourceMappingURL=user-group.model.js.map