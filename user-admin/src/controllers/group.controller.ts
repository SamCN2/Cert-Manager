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
import {Group} from '../models';
import {GroupRepository} from '../repositories';

interface CreateGroupRequest {
  name: string;
  displayName: string;
  description?: string;
  responsibleParty: string;
  usernames?: string[];
}

export class GroupController {
  constructor(
    @repository(GroupRepository)
    public groupRepository: GroupRepository,
  ) {}

  @post('/groups')
  @response(200, {
    description: 'Group model instance',
    content: {'application/json': {schema: getModelSchemaRef(Group)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'displayName', 'responsibleParty'],
            properties: {
              name: {
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
              description: {
                type: 'string',
                maxLength: 500,
              },
              responsibleParty: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              usernames: {
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
    groupData: CreateGroupRequest,
  ): Promise<Group> {
    // Validate group name format
    if (!/^[a-zA-Z0-9_-]+$/.test(groupData.name)) {
      throw new HttpErrors.BadRequest(
        'Group name must contain only letters, numbers, underscores, and hyphens',
      );
    }

    // Check if group already exists
    const existingGroup = await this.groupRepository.findOne({
      where: {name: groupData.name},
    });

    if (existingGroup) {
      throw new HttpErrors.Conflict(
        `Group with name ${groupData.name} already exists`,
      );
    }

    return this.groupRepository.createWithUsers(
      {
        name: groupData.name,
        displayName: groupData.displayName,
        description: groupData.description,
        responsibleParty: groupData.responsibleParty,
      },
      groupData.usernames ?? [],
      groupData.responsibleParty,
    );
  }

  @get('/groups/count')
  @response(200, {
    description: 'Group model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(Group) where?: Where<Group>): Promise<Count> {
    return this.groupRepository.count(where);
  }

  @get('/groups')
  @response(200, {
    description: 'Array of Group model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Group, {includeRelations: true}),
        },
      },
    },
  })
  async find(@param.filter(Group) filter?: Filter<Group>): Promise<Group[]> {
    return this.groupRepository.find(filter);
  }

  @get('/groups/{name}')
  @response(200, {
    description: 'Group model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Group, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('name') name: string,
    @param.filter(Group, {exclude: 'where'})
    filter?: FilterExcludingWhere<Group>,
  ): Promise<Group> {
    return this.groupRepository.findById(name, filter);
  }

  @patch('/groups/{name}')
  @response(204, {
    description: 'Group PATCH success',
  })
  async updateById(
    @param.path.string('name') name: string,
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
              description: {
                type: 'string',
                maxLength: 500,
              },
              usernames: {
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
    group: Partial<Group> & {usernames?: string[]},
  ): Promise<void> {
    const now = new Date().toISOString();
    
    // Update group details if provided
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (group.displayName || group.description) {
      await this.groupRepository.updateById(name, {
        ...group,
        lastModifiedAt: now,
        lastModifiedBy: group.lastModifiedBy ?? 'system',
      });
    }

    // Update user memberships if provided
    if (group.usernames) {
      await this.groupRepository.updateUsers(
        name,
        group.usernames,
        group.lastModifiedBy ?? 'system',
      );
    }
  }

  @del('/groups/{name}')
  @response(204, {
    description: 'Group DELETE success',
  })
  async deleteById(@param.path.string('name') name: string): Promise<void> {
    await this.groupRepository.deleteById(name);
  }
} 