/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const rootConfig = require('../../config');

module.exports = {
  port: rootConfig.SERVICE_PORTS['user-manager'],
  baseUrl: rootConfig.BASE_URL,
  serviceUrl: rootConfig.userManagerUrl,
  userAdminUrl: rootConfig.userAdminUrl
}; 