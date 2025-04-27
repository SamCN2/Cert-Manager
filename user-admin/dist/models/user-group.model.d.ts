/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { Entity } from '@loopback/repository';
import { User } from './user.model';
import { Group } from './group.model';
export declare class UserGroup extends Entity {
    userId: string;
    username: string;
    groupName: string;
    responsibleParty: string;
    createdAt: Date;
    constructor(data?: Partial<UserGroup>);
}
export interface UserGroupRelations {
    user?: User;
    group?: Group;
}
export type UserGroupWithRelations = UserGroup & UserGroupRelations;
