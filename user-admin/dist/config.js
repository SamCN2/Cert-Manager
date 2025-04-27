"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
const BASE_URL = (_a = process.env.BASE_URL) !== null && _a !== void 0 ? _a : (process.env.NODE_ENV === 'production'
    ? 'https://urp.ogt11.com'
    : 'http://localhost');
const PORT = parseInt((_b = process.env.PORT) !== null && _b !== void 0 ? _b : '3004', 10);
const config = {
    port: PORT,
    baseUrl: BASE_URL,
    serviceUrl: (_c = process.env.SERVICE_URL) !== null && _c !== void 0 ? _c : `${BASE_URL}/api/user-admin`,
    rest: {
        port: PORT,
        host: (_d = process.env.HOST) !== null && _d !== void 0 ? _d : '127.0.0.1',
        gracePeriodForClose: 5000,
        openApiSpec: {
            setServersFromRequest: true,
        },
    },
};
exports.default = config;
//# sourceMappingURL=config.js.map