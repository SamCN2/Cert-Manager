import { Entity } from '@loopback/repository';
export declare class Request extends Entity {
    id?: string;
    username: string;
    displayName: string;
    email: string;
    status: string;
    challenge?: string;
    createdAt?: Date;
    lastModifiedAt?: Date;
    constructor(data?: Partial<Request>);
}
