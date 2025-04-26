"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Request = void 0;
const tslib_1 = require("tslib");
const repository_1 = require("@loopback/repository");
let Request = class Request extends repository_1.Entity {
    constructor(data) {
        super(data);
    }
};
exports.Request = Request;
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        id: true,
        generated: true,
        postgresql: {
            columnName: 'id',
            dataType: 'uuid',
            dataLength: null,
            dataPrecision: null,
            dataScale: null,
            nullable: 'NO',
        }
    }),
    tslib_1.__metadata("design:type", String)
], Request.prototype, "id", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: true,
        pattern: '^[a-z0-9\\-]{2,30}$',
        postgresql: {
            columnName: 'username',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], Request.prototype, "username", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: true,
        postgresql: {
            columnName: 'displayname',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], Request.prototype, "displayName", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        required: true,
        postgresql: {
            columnName: 'email',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], Request.prototype, "email", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        default: 'pending',
        postgresql: {
            columnName: 'status',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], Request.prototype, "status", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'string',
        postgresql: {
            columnName: 'challenge',
            dataType: 'text',
        }
    }),
    tslib_1.__metadata("design:type", String)
], Request.prototype, "challenge", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'date',
        default: () => new Date(),
        postgresql: {
            columnName: 'createdat',
            dataType: 'timestamp with time zone',
        }
    }),
    tslib_1.__metadata("design:type", Date)
], Request.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, repository_1.property)({
        type: 'date',
        postgresql: {
            columnName: 'last_modified_at',
            dataType: 'timestamp with time zone',
        },
    }),
    tslib_1.__metadata("design:type", Date)
], Request.prototype, "lastModifiedAt", void 0);
exports.Request = Request = tslib_1.__decorate([
    (0, repository_1.model)({
        settings: {
            postgresql: {
                schema: 'public',
                table: 'request'
            }
        }
    }),
    tslib_1.__metadata("design:paramtypes", [Object])
], Request);
//# sourceMappingURL=request.model.js.map