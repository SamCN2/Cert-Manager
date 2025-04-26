/**
 * Copyright (c) 2025 ogt11.com, llc
 * Central configuration for all certM3 services
 */
export type ServiceName = 'user-admin' | 'user-request' | 'user-manager' | 'cert-create';

interface Config {
    BASE_URL: string;
    SERVICE_PORTS: Record<ServiceName, number>;
    userAdminUrl: string;
    userRequestUrl: string;
    userManagerUrl: string;
    certCreateUrl: string;
    getServiceUrl(serviceName: ServiceName): string;
}

declare const config: Config;
export default config;
