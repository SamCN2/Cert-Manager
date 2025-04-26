import { Request } from '../models';
import { RequestRepository } from '../repositories';
import { UserRepository } from '../repositories';
export declare class RequestController {
    requestRepository: RequestRepository;
    userRepository: UserRepository;
    constructor(requestRepository: RequestRepository, userRepository: UserRepository);
    create(request: Omit<Request, 'id'>): Promise<Request>;
    findByChallenge(challenge: string): Promise<Request | null>;
    updateById(id: string, request: Partial<Request>): Promise<void>;
    createUser(id: string, userData: {
        username: string;
        displayName: string;
        email: string;
    }): Promise<void>;
    validateRequest(id: string): Promise<Request>;
    updateStatusById(id: string, body: {
        status: string;
    }): Promise<object>;
    getById(id: string): Promise<Request>;
}
