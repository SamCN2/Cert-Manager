/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const path = require('path');

module.exports = {
  port: process.env.PORT || 3006,
  baseUrl: process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://urp.ogt11.com' : 'http://localhost:3006'),
  serviceUrl: process.env.SERVICE_URL || (process.env.NODE_ENV === 'production' ? 'https://urp.ogt11.com/request' : 'http://localhost:3006'),
  userAdminUrl: process.env.USER_ADMIN_URL || (process.env.NODE_ENV === 'production' ? 'https://urp.ogt11.com' : 'http://localhost:3004'),
  certRequestUrl: process.env.CERT_REQUEST_URL || (process.env.NODE_ENV === 'production' ? 'https://urp.ogt11.com/cert-request' : 'http://localhost:3007'),
  certAdminUrl: process.env.CERT_ADMIN_URL || (process.env.NODE_ENV === 'production' ? 'https://urp.ogt11.com/api/cert-admin' : 'http://localhost:3000'),
  validationSecret: process.env.VALIDATION_SECRET || 'development-secret-key',
  
  // SMTP settings
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  },
  
  // Email settings
  email: {
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    subject: process.env.EMAIL_SUBJECT || 'Complete your registration',
    testDir: process.env.TEST_EMAIL_DIR || path.join('/var/spool/certM3/test-emails')
  }
}; 