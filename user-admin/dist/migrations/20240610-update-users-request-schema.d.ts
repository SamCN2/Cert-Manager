import { UserAdminApplication } from '../application';
/**
 * Migration to update users and request schema:
 * - Add UUID id as primary key to users
 * - Make username unique (not PK)
 * - Drop last_modified_at and last_modified_by from request if they exist
 */
export declare function updateUsersRequestSchema(app: UserAdminApplication): Promise<void>;
