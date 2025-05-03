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
  put,
  del,
  requestBody,
  response,
  HttpErrors,
} from '@loopback/rest';
import {Certificate} from '../models';
import {CertificateRepository} from '../repositories';
import * as crypto from 'crypto';
import {bind, inject} from '@loopback/core';
import {rateLimiter} from '../middleware/rate-limiter.middleware';
import {VersionService} from '../services/version.service';
import { v7 as uuidv7 } from 'uuid';

// Add this interface near the top of the file
interface SearchCriteria {
  codeVersion?: string;
  fingerprint?: string;
}

/**
 * Generate a unique serial number suitable for X.509 certificates.
 * Format: <timestamp><3-digit-random><3-digit-counter>
 * This ensures:
 * 1. Uniqueness through timestamp and counter
 * 2. Proper positive integer format for X.509
 * 3. Reasonable length (within 20 octets)
 * 4. Some randomness for security
 */
function generateSerialNumber(counter: number): string {
  // Use a smaller scale to avoid scientific notation
  // Format: YYYYMMDDHHmmss (14 digits) + RRR (3 digits) + CCC (3 digits)
  const now = new Date();
  const timestamp = now.getFullYear() * 10000000000 +  // YYYY0000000000
                   (now.getMonth() + 1) * 100000000 +  // 0000MM00000000
                   now.getDate() * 1000000 +           // 000000DD000000
                   now.getHours() * 10000 +            // 00000000HH0000
                   now.getMinutes() * 100 +            // 0000000000mm00
                   now.getSeconds();                   // 000000000000ss
  
  const random = Math.floor(Math.random() * 1000);    // RRR (000-999)
  const counterNum = counter % 1000;                  // CCC (000-999)
  
  // Combine all parts into a 20-digit number
  const serialInt = BigInt(timestamp) * BigInt(1000000) + // Shift left 6 digits
                   BigInt(random * 1000 + counterNum);     // Add RRR and CCC
  
  console.log('Generating serial number:');
  console.log('- Date components:', {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds()
  });
  console.log('- Timestamp:', timestamp);
  console.log('- Random:', random);
  console.log('- Counter:', counterNum);
  console.log('- Final serial:', serialInt.toString());
  
  return serialInt.toString();
}

@bind()
export class CertificateController {
  constructor(
    @repository(CertificateRepository)
    public certificateRepository : CertificateRepository,
    @inject('services.VersionService')
    private versionService: VersionService,
  ) {}

  // Helper function to generate a serial number using UUIDv7
  private async generateSerialNumber(): Promise<string> {
    return uuidv7();
  }

  @post('/certificate')
  @response(200, {
    description: 'Certificate model instance',
    content: {'application/json': {schema: getModelSchemaRef(Certificate)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Certificate, {
            title: 'NewCertificate',
            exclude: ['serialNumber', 'not_before', 'not_after'],
          }),
        },
      },
    })
    certificate: Certificate,
  ): Promise<Certificate> {
    let retryCount = 0;
    let lastError;
    let lastSerialNumber;

    while (retryCount < 3) {
      try {
        // Add a small delay between retries
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
        }

        const serialNumber = await this.generateSerialNumber();
        lastSerialNumber = serialNumber;
        const now = new Date();
        const oneYear = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        
        const newCertificate = {
          ...certificate,
          serialNumber,
          not_before: now,
          not_after: oneYear,
          status: 'active' as const,
          userid: certificate.userid,
          code_version: this.versionService.getCurrentVersion(),
          createdat: now,
          is_first_certificate: false,
        };

        return await this.certificateRepository.create(newCertificate);
      } catch (error) {
        lastError = error;
        // Retry on any unique violation, as we're generating a new serial number each time
        if (error.code === '23505') {
          const constraint = error.detail?.match(/Key \((.*)\)=/)?.at(1) || 'unknown';
          console.error(`Unique violation detected. Attempt ${retryCount + 1}, Constraint: ${constraint}, Serial: ${lastSerialNumber}`);
          retryCount++;
          continue;
        }
        // For any other error, throw it immediately
        throw error;
      }
    }

    // If we get here, we've exhausted our retries
    const constraint = lastError?.detail?.match(/Key \((.*)\)=/)?.at(1) || 'unknown';
    console.error(`Failed to create certificate after ${retryCount} attempts. Last constraint: ${constraint}, Last serial: ${lastSerialNumber}`);
    throw new HttpErrors.Conflict(
      `Failed to create certificate after multiple attempts. Last constraint: ${constraint}, Last serial: ${lastSerialNumber}`
    );
  }

  @get('/certificate/count')
  @response(200, {
    description: 'Certificate model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Certificate) where?: Where<Certificate>,
  ): Promise<Count> {
    return this.certificateRepository.count(where);
  }

  @get('/certificate')
  @response(200, {
    description: 'Array of Certificate model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Certificate, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Certificate) filter?: Filter<Certificate>,
  ): Promise<Certificate[]> {
    return this.certificateRepository.find(filter);
  }

  @patch('/certificate')
  @response(200, {
    description: 'Certificate PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Certificate, {partial: true}),
        },
      },
    })
    certificate: Certificate,
    @param.where(Certificate) where?: Where<Certificate>,
  ): Promise<Count> {
    return this.certificateRepository.updateAll(certificate, where);
  }

  @get('/certificate/{id}')
  @response(200, {
    description: 'Certificate model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Certificate, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Certificate, {exclude: 'where'}) filter?: FilterExcludingWhere<Certificate>
  ): Promise<Certificate> {
    return this.certificateRepository.findById(id, filter);
  }

  @patch('/certificate/{id}')
  @response(204, {
    description: 'Certificate PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Certificate, {partial: true}),
        },
      },
    })
    certificate: Certificate,
  ): Promise<void> {
    await this.certificateRepository.updateById(id, certificate);
  }

  @put('/certificate/{id}')
  @response(204, {
    description: 'Certificate PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() certificate: Certificate,
  ): Promise<void> {
    await this.certificateRepository.replaceById(id, certificate);
  }

  @del('/certificate/{id}')
  @response(204, {
    description: 'Certificate DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.certificateRepository.deleteById(id);
  }

  @get('/certificate/search')
  @response(200, {
    description: 'Search certificates by version or fingerprint',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Certificate),
        },
      },
    },
  })
  async search(
    @param.query.string('version') version?: string,
    @param.query.string('fingerprint') fingerprint?: string,
  ): Promise<Certificate[]> {
    const criteria: SearchCriteria = {};
    
    // Build search criteria
    if (version) criteria.codeVersion = version;
    if (fingerprint) criteria.fingerprint = fingerprint;

    // If no criteria provided, throw an error
    if (Object.keys(criteria).length === 0) {
      throw new HttpErrors.BadRequest(
        'At least one search criterion (version or fingerprint) must be provided'
      );
    }

    // Create WHERE clause for all provided criteria
    const where = {
      and: Object.entries(criteria).map(([key, value]) => ({
        [key]: value
      }))
    };

    return this.certificateRepository.find({
      where,
      order: ['not_before DESC']
    });
  }
}