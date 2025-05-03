/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const BASE_URL = process.env.BASE_URL || 'https://urp.ogt11.com';

module.exports = {
  apps: [
    {
      name: 'user-admin',
      cwd: './user-admin',
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        BASE_URL: BASE_URL,
        SERVICE_URL: `${BASE_URL}/api/user-admin`
      },
      error_file: '/var/spool/certM3/logs/user-admin-error.log',
      out_file: '/var/spool/certM3/logs/user-admin-out.log',
      log_file: '/var/spool/certM3/logs/user-admin-combined.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 5
    },
    {
      name: 'user-request',
      cwd: './user-request',
      script: 'npm',
      args: 'run start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
        BASE_URL: BASE_URL,
        SERVICE_URL: `${BASE_URL}/request`,
        USER_ADMIN_URL: `${BASE_URL}/api/user-admin`,
        CERT_ADMIN_URL: `${BASE_URL}/api/cert-admin`
      },
      error_file: '/var/spool/certM3/logs/user-request-error.log',
      out_file: '/var/spool/certM3/logs/user-request-out.log',
      log_file: '/var/spool/certM3/logs/user-request-combined.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 5
    },
    {
      name: 'user-manager',
      cwd: './user-manager',
      script: 'npm',
      args: 'run start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        BASE_URL: BASE_URL,
        SERVICE_URL: `${BASE_URL}/manager`,
        USER_ADMIN_URL: `${BASE_URL}/api/user-admin`
      },
      error_file: '/var/spool/certM3/logs/user-manager-error.log',
      out_file: '/var/spool/certM3/logs/user-manager-out.log',
      log_file: '/var/spool/certM3/logs/user-manager-combined.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 5
    },
    {
      name: 'cert-admin',
      cwd: './cert-admin',
      script: 'npm',
      args: 'run start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BASE_URL: BASE_URL,
        SERVICE_URL: `${BASE_URL}/api/cert-admin`,
        USER_ADMIN_URL: `${BASE_URL}/api/user-admin`
      },
      error_file: '/var/spool/certM3/logs/cert-admin-error.log',
      out_file: '/var/spool/certM3/logs/cert-admin-out.log',
      log_file: '/var/spool/certM3/logs/cert-admin-combined.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 5
    }
  ]
}; 
