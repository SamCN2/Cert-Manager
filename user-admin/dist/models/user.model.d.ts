/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { Entity } from '@loopback/repository';
import { Group } from './group.model';
export declare class User extends Entity {
    username: string;
    displayName: string;
    responsibleParty: string;
    email?: string;
    createdAt?: Date;
    lastModifiedAt?: Date;
    lastModifiedBy?: string;
    status: string;
    groups: Group[];
    constructor(data?: Partial<User>);
}
export interface UserRelations {
    groups?: Group[];
}
export type UserWithRelations = User & UserRelations;
