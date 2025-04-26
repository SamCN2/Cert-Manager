/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { Count, Filter, FilterExcludingWhere, Where } from '@loopback/repository';
import { Group } from '../models';
import { GroupRepository } from '../repositories';
interface CreateGroupRequest {
    name: string;
    displayName: string;
    description?: string;
    responsibleParty: string;
    usernames?: string[];
}
export declare class GroupController {
    groupRepository: GroupRepository;
    constructor(groupRepository: GroupRepository);
    create(groupData: CreateGroupRequest): Promise<Group>;
    count(where?: Where<Group>): Promise<Count>;
    find(filter?: Filter<Group>): Promise<Group[]>;
    findById(name: string, filter?: FilterExcludingWhere<Group>): Promise<Group>;
    updateById(name: string, group: Partial<Group> & {
        usernames?: string[];
    }): Promise<void>;
    deleteById(name: string): Promise<void>;
}
export {};
