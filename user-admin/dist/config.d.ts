/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { ApplicationConfig } from '@loopback/core';
export interface UserAdminConfig extends ApplicationConfig {
    port: number;
    baseUrl: string;
    serviceUrl: string;
}
declare const config: UserAdminConfig;
export default config;
