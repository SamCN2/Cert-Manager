"use strict";
/**
 * Copyright (c) 2025 ogt11.com, llc
 */
Object.defineProperty(exports, "__esModule", { value: true });
const BASE_URL = process.env.BASE_URL || (process.env.NODE_ENV === 'production'
    ? 'https://urp.ogt11.com'
    : 'http://localhost');
const PORT = parseInt(process.env.PORT || '3004', 10);
const config = {
    port: PORT,
    baseUrl: BASE_URL,
    serviceUrl: process.env.SERVICE_URL || `${BASE_URL}/api/user-admin`,
    rest: {
        port: PORT,
        host: process.env.HOST || '127.0.0.1',
        gracePeriodForClose: 5000,
        openApiSpec: {
            setServersFromRequest: true,
        },
    },
};
exports.default = config;
//# sourceMappingURL=config.js.map