/**
 * Copyright (c) 2025 ogt11.com, llc
 */
import { Count, Filter, FilterExcludingWhere, Where } from '@loopback/repository';
import { User } from '../models';
import { UserRepository } from '../repositories';
import { RequestRepository } from '../repositories';
interface CreateUserRequest {
    username: string;
    displayName: string;
    responsibleParty: string;
    groupNames?: string[];
}
export declare class UserController {
    userRepository: UserRepository;
    requestRepository: RequestRepository;
    constructor(userRepository: UserRepository, requestRepository: RequestRepository);
    create(userData: CreateUserRequest): Promise<User>;
    count(where?: Where<User>): Promise<Count>;
    find(filter?: Filter<User>): Promise<User[]>;
    checkUsername(username: string): Promise<{
        available: boolean;
    }>;
    findById(username: string, filter?: FilterExcludingWhere<User>): Promise<User>;
    updateById(username: string, user: Partial<User> & {
        groupNames?: string[];
    }): Promise<void>;
    deleteById(username: string): Promise<void>;
    validateEmail(username: string, data: {
        email: string;
    }): Promise<{
        success: boolean;
    }>;
}
export {};
