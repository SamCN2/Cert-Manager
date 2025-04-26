"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Group = void 0;
const tslib_1 = require("tslib");
const repository_1 = require("@loopback/repository");
const user_model_1 = require("./user.model");
const user_group_model_1 = require("./user-group.model");
let Group = class Group extends repository_1.Entity {
    constructor(data) {
        super(data);
    }
};
exports.Group = Group;
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        id: true,
        generated: false,
        required: true,
        postgresql: {
            columnName: 'name',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], Group.prototype, "name", void 0);
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
], Group.prototype, "displayName", void 0);
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
], Group.prototype, "responsibleParty", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: false,
        postgresql: {
            columnName: 'description',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], Group.prototype, "description", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'date',
        required: true,
        postgresql: {
            columnName: 'created_at',
            dataType: 'timestamp with time zone',
        }
    }),
    tslib_1.__metadata("design:type", String)
], Group.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'date',
        required: false,
        postgresql: {
            columnName: 'last_modified_at',
            dataType: 'timestamp with time zone',
        }
    }),
    tslib_1.__metadata("design:type", String)
], Group.prototype, "lastModifiedAt", void 0);
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
], Group.prototype, "lastModifiedBy", void 0);
tslib_1.__decorate([
    (0, repository_1.hasMany)(() => user_model_1.User, {
        through: {
            model: () => user_group_model_1.UserGroup,
            keyFrom: 'groupName',
            keyTo: 'username'
        }
    }),
    tslib_1.__metadata("design:type", Array)
], Group.prototype, "users", void 0);
exports.Group = Group = tslib_1.__decorate([
    (0, repository_1.model)({
        settings: {
            postgresql: {
                schema: 'public',
                table: 'groups'
            },
            indexes: {
                uniqueGroupName: {
                    keys: { name: 1 },
                    options: { unique: true }
                }
            }
        }
    }),
    tslib_1.__metadata("design:paramtypes", [Object])
], Group);
//# sourceMappingURL=group.model.js.map