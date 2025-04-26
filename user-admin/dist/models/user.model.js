"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const tslib_1 = require("tslib");
const repository_1 = require("@loopback/repository");
const group_model_1 = require("./group.model");
const user_group_model_1 = require("./user-group.model");
let User = class User extends repository_1.Entity {
    constructor(data) {
        super(data);
    }
};
exports.User = User;
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        id: true,
        generated: false,
        required: true,
        postgresql: {
            columnName: 'username',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], User.prototype, "username", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: true,
        postgresql: {
            columnName: 'display_name',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], User.prototype, "displayName", void 0);
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
], User.prototype, "responsibleParty", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: false,
        postgresql: {
            columnName: 'email',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], User.prototype, "email", void 0);
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
], User.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'date',
        required: false,
        postgresql: {
            columnName: 'last_modified_at',
            dataType: 'timestamp with time zone',
        }
    }),
    tslib_1.__metadata("design:type", Date)
], User.prototype, "lastModifiedAt", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: false,
        postgresql: {
            columnName: 'last_modified_by',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], User.prototype, "lastModifiedBy", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: true,
        default: 'pending',
        postgresql: {
            columnName: 'status',
        },
    }),
    tslib_1.__metadata("design:type", String)
], User.prototype, "status", void 0);
tslib_1.__decorate([
    (0, repository_1.hasMany)(() => group_model_1.Group, {
        through: {
            model: () => user_group_model_1.UserGroup,
            keyFrom: 'username',
            keyTo: 'groupName',
        }
    }),
    tslib_1.__metadata("design:type", Array)
], User.prototype, "groups", void 0);
exports.User = User = tslib_1.__decorate([
    (0, repository_1.model)({
        settings: {
            postgresql: {
                schema: 'public',
                table: 'users'
            },
            indexes: {
                uniqueUsername: {
                    keys: { username: 1 },
                    options: { unique: true }
                }
            }
        }
    }),
    tslib_1.__metadata("design:paramtypes", [Object])
], User);
//# sourceMappingURL=user.model.js.map