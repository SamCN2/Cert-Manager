/**
 * Copyright (c) 2025 ogt11.com, llc
 * Central configuration for all certM3 services
 */

const BASE_URL = process.env.BASE_URL || (process.env.NODE_ENV === 'production'
    ? 'https://urp.ogt11.com'
    : 'http://localhost');

const SERVICE_PORTS = {
    'user-admin': 3004,
    'user-request': 3006,
    'user-manager': 3005,
    'cert-admin': 3000
};

const config = {
    BASE_URL,
    SERVICE_PORTS,
    // Service URLs
    userAdminUrl: process.env.USER_ADMIN_URL || `${BASE_URL}/api/user-admin`,
    userRequestUrl: process.env.USER_REQUEST_URL || `${BASE_URL}/request`,
    userManagerUrl: process.env.USER_MANAGER_URL || `${BASE_URL}/manager`,
    certAdminUrl: process.env.CERT_ADMIN_URI || `${BASE_URL}/cert-admin`,
    // Helper function to get service URL
    getServiceUrl: (serviceName) => {
        const port = SERVICE_PORTS[serviceName];
        return process.env.NODE_ENV === 'production'
            ? config[`${serviceName.replace(/-/g, '')}Url`]
            : `${BASE_URL}:${port}`;
    }
};

module.exports = config;
//# sourceMappingURL=config.js.map
