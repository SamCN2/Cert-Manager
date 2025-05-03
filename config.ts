/**
 * Copyright (c) 2025 ogt11.com, llc
 * Central configuration for all certM3 services
 */

export type ServiceName = 'user-admin' | 'user-request' | 'user-manager' | 'cert-request';

const BASE_URL = process.env.BASE_URL || (
  process.env.NODE_ENV === 'production'
    ? 'https://urp.ogt11.com'
    : 'http://localhost'
);

const SERVICE_PORTS: Record<ServiceName, number> = {
  'user-admin': 3004,
  'user-request': 3006,
  'user-manager': 3005,
  'cert-request': 3007
};

interface Config {
  BASE_URL: string;
  SERVICE_PORTS: Record<ServiceName, number>;
  userAdminUrl: string;
  userRequestUrl: string;
  userManagerUrl: string;
  certRequestUrl: string;
  getServiceUrl: (serviceName: ServiceName) => string;
}

const config: Config = {
  BASE_URL,
  SERVICE_PORTS,
  
  // Service URLs
  userAdminUrl: process.env.USER_ADMIN_URL || `${BASE_URL}/api/user-admin`,
  userRequestUrl: process.env.USER_REQUEST_URL || `${BASE_URL}/request`,
  userManagerUrl: process.env.USER_MANAGER_URL || `${BASE_URL}/manager`,
  certRequestUrl: process.env.CERT_REQUEST_URL || `${BASE_URL}/cert-request`,

  // Helper function to get service URL
  getServiceUrl: (serviceName: ServiceName): string => {
    const port = SERVICE_PORTS[serviceName];
    return process.env.NODE_ENV === 'production'
      ? config[`${serviceName.replace(/-/g, '')}Url` as keyof Config] as string
      : `${BASE_URL}:${port}`;
  }
};

export default config; 