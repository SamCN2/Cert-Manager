/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { Entity } from '@loopback/repository';
import { User } from './user.model';
export declare class Group extends Entity {
    name: string;
    displayName: string;
    responsibleParty: string;
    description?: string;
    createdAt: string;
    lastModifiedAt?: string;
    lastModifiedBy?: string;
    users: User[];
    constructor(data?: Partial<Group>);
}
export interface GroupRelations {
    users?: User[];
}
export type GroupWithRelations = Group & GroupRelations;
