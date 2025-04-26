/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  del,
  requestBody,
  response,
  HttpErrors,
} from '@loopback/rest';
import {User} from '../models';
import {UserRepository} from '../repositories';
import {RequestRepository} from '../repositories';

interface CreateUserRequest {
  username: string;
  displayName: string;
  responsibleParty: string;
  groupNames?: string[];
}

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(RequestRepository)
    public requestRepository: RequestRepository,
  ) {}

  @post('/users')
  @response(200, {
    description: 'User model instance',
    content: {'application/json': {schema: getModelSchemaRef(User)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username', 'displayName', 'responsibleParty'],
            properties: {
              username: {
                type: 'string',
                pattern: '^[a-zA-Z0-9_-]+$',
                minLength: 3,
                maxLength: 50,
              },
              displayName: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              responsibleParty: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              groupNames: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    })
    userData: CreateUserRequest,
  ): Promise<User> {
    // Validate username format
    if (!/^[a-zA-Z0-9_-]+$/.test(userData.username)) {
      throw new HttpErrors.BadRequest(
        'Username must contain only letters, numbers, underscores, and hyphens',
      );
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: {username: userData.username},
    });

    if (existingUser) {
      throw new HttpErrors.Conflict(
        `User with username ${userData.username} already exists`,
      );
    }

    return this.userRepository.createWithGroups(
      userData,
      userData.groupNames ?? [],
      userData.responsibleParty,
    );
  }

  @get('/users/count')
  @response(200, {
    description: 'User model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(User) where?: Where<User>): Promise<Count> {
    return this.userRepository.count(where);
  }

  @get('/users')
  @response(200, {
    description: 'Array of User model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(User, {includeRelations: true}),
        },
      },
    },
  })
  async find(@param.filter(User) filter?: Filter<User>): Promise<User[]> {
    return this.userRepository.find(filter);
  }

  @get('/users/check-username/{username}')
  @response(200, {
    description: 'Check if a username is available',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            available: {
              type: 'boolean'
            }
          }
        }
      }
    }
  })
  async checkUsername(
    @param.path.string('username') username: string,
  ): Promise<{available: boolean}> {
    try {
      // Validate username format
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        throw new HttpErrors.BadRequest('Username must contain only letters, numbers, underscores, and hyphens');
      }

      // Check users table
      const existingUser = await this.userRepository.findOne({
        where: {
          username: username
        },
      });

      // Check requests table
      const existingRequest = await this.requestRepository.findOne({
        where: {
          username: username
        },
      });

      return {available: !existingUser && !existingRequest};
    } catch (error) {
      if (error instanceof HttpErrors.BadRequest) {
        throw error;
      }
      console.error('Error checking username availability:', error);
      throw new HttpErrors.InternalServerError('Database error while checking username availability');
    }
  }

  @get('/users/{username}')
  @response(200, {
    description: 'User model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(User, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('username') username: string,
    @param.filter(User, {exclude: 'where'})
    filter?: FilterExcludingWhere<User>,
  ): Promise<User> {
    return this.userRepository.findById(username, filter);
  }

  @patch('/users/{username}')
  @response(204, {
    description: 'User PATCH success',
  })
  async updateById(
    @param.path.string('username') username: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              displayName: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              groupNames: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    })
    user: Partial<User> & {groupNames?: string[]},
  ): Promise<void> {
    const now = new Date().toISOString();
    
    // Update user details if provided
    if (user.displayName) {
      await this.userRepository.updateById(username, {
        ...user,
        lastModifiedAt: now,
        lastModifiedBy: user.lastModifiedBy ?? 'system',
      });
    }

    // Update group memberships if provided
    if (user.groupNames) {
      await this.userRepository.updateGroups(
        username,
        user.groupNames,
        user.lastModifiedBy ?? 'system',
      );
    }
  }

  @del('/users/{username}')
  @response(204, {
    description: 'User DELETE success',
  })
  async deleteById(@param.path.string('username') username: string): Promise<void> {
    await this.userRepository.deleteById(username);
  }

  @patch('/users/{username}/validate-email')
  @response(200, {
    description: 'Update user email after validation',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            }
          }
        }
      }
    }
  })
  async validateEmail(
    @param.path.string('username') username: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email'],
            properties: {
              email: {
                type: 'string',
                format: 'email'
              }
            }
          }
        }
      }
    })
    data: {email: string},
  ): Promise<{success: boolean}> {
    try {
      // Find the user
      const user = await this.userRepository.findById(username);
      if (!user) {
        throw new HttpErrors.NotFound(`User ${username} not found`);
      }

      // Update the email
      await this.userRepository.updateById(username, {
        email: data.email,
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: 'email-validation'
      });

      return {success: true};
    } catch (error) {
      console.error('Error updating user email:', error);
      throw new HttpErrors.InternalServerError('Error updating user email');
    }
  }
} 