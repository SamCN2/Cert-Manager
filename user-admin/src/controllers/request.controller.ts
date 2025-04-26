import {
  repository,
} from '@loopback/repository';
import {
  post,
  requestBody,
  response,
  HttpErrors,
  get,
  getModelSchemaRef,
  param,
  patch,
} from '@loopback/rest';
import { Request } from '../models';
import { RequestRepository } from '../repositories';
import { UserRepository } from '../repositories';

export class RequestController {
  constructor(
    @repository(RequestRepository)
    public requestRepository: RequestRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {}

  @post('/api/requests')
  @response(200, {
    description: 'Request model instance',
    content: {'application/json': {schema: {type: 'object'}}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username', 'displayName', 'email'],
            properties: {
              username: {
                type: 'string',
                pattern: '^[a-z0-9\\-]{2,30}$',
              },
              displayName: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              email: {
                type: 'string',
                format: 'email',
              },
              status: {
                type: 'string',
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending',
              },
              challenge: {
                type: 'string',
              },
            },
          },
        },
      },
    })
    request: Omit<Request, 'id'>,
  ): Promise<Request> {
    try {
      console.log('\n=== Creating Request ===');
      console.log('Received request data:', request);
      
      // Let the model handle the timestamp with its default value
      request.status = request.status || 'pending';

      // Create the request
      const savedRequest = await this.requestRepository.create(request);
      
      console.log('Saved request:', savedRequest);
      console.log('===========================\n');
      
      return savedRequest;
    } catch (error) {
      console.error('Error creating request:', error);
      throw new HttpErrors.InternalServerError('Failed to create request');
    }
  }

  @get('/api/requests/findByChallenge/{challenge}')
  async findByChallenge(
    @param.path.string('challenge') challenge: string,
  ): Promise<Request | null> {
    console.log('\n=== Finding Request by Challenge ===');
    console.log('Challenge token:', challenge);
    
    const request = await this.requestRepository.findOne({
      where: {
        challenge: challenge
      }
    });

    if (request) {
      console.log('Found request:', request);
    } else {
      console.log('No request found for challenge token');
    }
    console.log('===========================\n');

    return request;
  }

  @patch('/api/requests/{id}')
  @response(204, {
    description: 'Request PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['pending', 'completed', 'rejected']
              },
              lastModifiedAt: {
                type: 'string',
                format: 'date-time'
              }
            }
          }
        }
      }
    })
    request: Partial<Request>,
  ): Promise<void> {
    try {
      console.log('\n=== Updating Request ===');
      console.log('Request ID:', id);
      console.log('Update data:', request);

      await this.requestRepository.updateById(id, request);

      console.log('Request updated successfully');
      console.log('===========================\n');
    } catch (error) {
      console.error('Error updating request:', error);
      throw new HttpErrors.InternalServerError('Failed to update request');
    }
  }

  @post('/api/requests/{id}/create-user')
  @response(200, {
    description: 'Create user from request',
    content: {'application/json': {schema: {type: 'object'}}},
  })
  async createUser(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username', 'displayName', 'email'],
            properties: {
              username: {
                type: 'string',
                pattern: '^[a-z0-9\\-]{2,30}$',
              },
              displayName: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              email: {
                type: 'string',
                format: 'email',
              },
            },
          },
        },
      },
    })
    userData: {
      username: string;
      displayName: string;
      email: string;
    },
  ): Promise<void> {
    try {
      console.log('\n=== Creating User from Request ===');
      console.log('Request ID:', id);
      console.log('User data:', userData);

      // Get the request
      const request = await this.requestRepository.findById(id);
      if (!request) {
        throw new HttpErrors.NotFound('Request not found');
      }

      // Verify the request is pending
      if (request.status !== 'pending') {
        throw new HttpErrors.BadRequest('Request is not in pending status');
      }

      // Verify the user data matches the request
      if (request.username !== userData.username ||
          request.displayName !== userData.displayName ||
          request.email !== userData.email) {
        throw new HttpErrors.BadRequest('User data does not match request');
      }

      // Create the user
      await this.userRepository.create({
        username: userData.username,
        displayName: userData.displayName,
        email: userData.email,
        status: 'active',
        responsibleParty: 'user-request',
        createdAt: new Date(),
      });

      // Update request status
      await this.requestRepository.updateById(id, {
        status: 'completed',
        lastModifiedAt: new Date(),
      });

      console.log('User created successfully');
      console.log('===========================\n');
    } catch (error) {
      console.error('Error creating user from request:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError('Failed to create user from request');
    }
  }

  @get('/request/validate/{id}')
  @response(200, {
    description: 'Validate request by ID',
    content: {'application/json': {schema: getModelSchemaRef(Request)}},
  })
  async validateRequest(
    @param.path.string('id') id: string,
  ): Promise<Request> {
    console.log('\n=== Validating Request ===');
    console.log('Request ID:', id);
    
    const request = await this.requestRepository.findOne({
      where: {
        challenge: id,
        status: 'pending'
      }
    });

    if (!request) {
      console.log('No pending request found for challenge token');
      throw new HttpErrors.NotFound('Request not found or already processed');
    }

    console.log('Found request:', request);
    console.log('===========================\n');

    return request;
  }

  @patch('/api/requests/{id}/status')
  @response(200, {
    description: 'Update request status',
    content: {'application/json': {schema: {type: 'object'}}},
  })
  async updateStatusById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['status'],
            properties: {
              status: {type: 'string'},
            },
          },
        },
      },
    })
    body: {status: string},
  ): Promise<object> {
    try {
      console.log('\n=== Updating Request Status ===');
      console.log('Request ID:', id);
      console.log('New status:', body.status);

      await this.requestRepository.updateById(id, {
        status: body.status,
        lastModifiedAt: new Date(),
      });

      console.log('Request status updated successfully');
      console.log('===========================\n');
      return {id, status: body.status};
    } catch (error) {
      console.error('Error updating request status:', error);
      throw new HttpErrors.InternalServerError('Failed to update request status');
    }
  }

  @get('/api/requests/{id}')
  @response(200, {
    description: 'Get request by ID',
    content: {'application/json': {schema: getModelSchemaRef(Request)}},
  })
  async getById(
    @param.path.string('id') id: string,
  ): Promise<Request> {
    const request = await this.requestRepository.findById(id);
    if (!request) {
      throw new HttpErrors.NotFound('Request not found');
    }
    return request;
  }
} 