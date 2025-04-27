export * from './application';
export * from './models';
export * from './repositories';
import { UserAdminApplication, ApplicationConfig } from './application';
export declare function main(options?: ApplicationConfig): Promise<UserAdminApplication>;
