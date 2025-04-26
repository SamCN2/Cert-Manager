/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {UserAdminApplication} from '../application';
import {initialSchema} from './20250416-initial-schema';
import {addEmailField} from './20250420-add-email';
import {updateUsersRequestSchema} from './20240610-update-users-request-schema';

export async function migrate(app: UserAdminApplication) {
  console.log('Running migrations...');
  
  await initialSchema(app);
  await addEmailField(app);
  await updateUsersRequestSchema(app);
  
  console.log('Migrations completed successfully.');
} 