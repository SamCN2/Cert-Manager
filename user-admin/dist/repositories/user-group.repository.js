"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserGroupRepository = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@loopback/core");
const repository_1 = require("@loopback/repository");
const postgres_datasource_1 = require("../datasources/postgres.datasource");
const models_1 = require("../models");
let UserGroupRepository = class UserGroupRepository extends repository_1.DefaultCrudRepository {
    constructor(dataSource) {
        super(models_1.UserGroup, dataSource);
    }
};
exports.UserGroupRepository = UserGroupRepository;
exports.UserGroupRepository = UserGroupRepository = tslib_1.__decorate([
    tslib_1.__param(0, (0, core_1.inject)('datasources.postgres')),
    tslib_1.__metadata("design:paramtypes", [postgres_datasource_1.PostgresDataSource])
], UserGroupRepository);
//# sourceMappingURL=user-group.repository.js.map