/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { Entity } from '@loopback/repository';
export declare class UserGroup extends Entity {
    username: string;
    groupName: string;
    responsibleParty: string;
    createdAt: Date;
    constructor(data?: Partial<UserGroup>);
}
export interface UserGroupRelations {
}
export type UserGroupWithRelations = UserGroup & UserGroupRelations;
