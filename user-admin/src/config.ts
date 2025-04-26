/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {ApplicationConfig} from '@loopback/core';

const BASE_URL = process.env.BASE_URL || (
  process.env.NODE_ENV === 'production'
    ? 'https://urp.ogt11.com'
    : 'http://localhost'
);

const PORT = parseInt(process.env.PORT || '3004', 10);

export interface UserAdminConfig extends ApplicationConfig {
  port: number;
  baseUrl: string;
  serviceUrl: string;
}

const config: UserAdminConfig = {
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

export default config; 