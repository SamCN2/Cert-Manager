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

// Configuration for email verification
const EMAIL_VERIFICATION_CONFIG = {
  baseUrl: process.env.EMAIL_VERIFICATION_URL || 'http://localhost:3003',
  path: '/certificates',
  expirationMinutes: 30
};

// Add this interface near the top of the file
interface SearchCriteria {
  username?: string;
  email?: string;
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

  // Helper function to generate a secure challenge string and verification URLs
  private generateEmailChallenge(serialNumber: string): { 
    challenge: string, 
    verificationUrl: string,
    negativeUrl: string 
  } {
    // Generate a random 32-byte string and encode as hex
    const challenge = crypto.randomBytes(32).toString('hex');
    
    // Create verification URLs that include serial number and challenge
    const baseUrl = new URL(`${EMAIL_VERIFICATION_CONFIG.path}/${serialNumber}/verify-email`, EMAIL_VERIFICATION_CONFIG.baseUrl);
    baseUrl.searchParams.set('challenge', challenge);
    
    // Create positive verification URL
    const verificationUrl = new URL(baseUrl.toString());
    
    // Create negative verification URL
    const negativeUrl = new URL(baseUrl.toString());
    negativeUrl.searchParams.set('notme', 'true');
    
    return {
      challenge,
      verificationUrl: verificationUrl.toString(),
      negativeUrl: negativeUrl.toString()
    };
  }

  // Helper function to generate a serial number
  private async generateSerialNumber(): Promise<string> {
    const now = new Date();
    const count = await this.certificateRepository.count();
    
    // Format: YYYYMMDDHHmmssRRRCCC
    // where RRR is random and CCC is counter
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Generate 3 random digits
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    // Use counter padded to 3 digits
    const counter = String(count.count + 1).padStart(3, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}${random}${counter}`;
  }

  @post('/certificates')
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
            exclude: ['serialNumber', 'fingerprint', 'issuedAt', 'expiresAt', 'revoked', 'revokedAt', 'emailVerified', 'emailChallenge', 'challengeGeneratedAt'],
          }),
        },
      },
    })
    certificate: Omit<Certificate, 'serialNumber'>,
  ): Promise<Certificate> {
    // Check for existing active certificates with the same username or email
    const existingByUsername = await this.certificateRepository.findOne({
      where: {
        and: [
          { username: certificate.username },
          { revoked: false }
        ]
      }
    });

    if (existingByUsername) {
      throw new HttpErrors.Conflict(
        `An active certificate already exists for username: ${certificate.username}`
      );
    }

    const existingByEmail = await this.certificateRepository.findOne({
      where: {
        and: [
          { email: certificate.email },
          { revoked: false }
        ]
      }
    });

    if (existingByEmail) {
      throw new HttpErrors.Conflict(
        `An active certificate already exists for email: ${certificate.email}`
      );
    }

    const serialNumber = await this.generateSerialNumber();
    const now = new Date();
    
    // Generate email challenge and verification URLs
    const { challenge, verificationUrl, negativeUrl } = this.generateEmailChallenge(serialNumber);
    console.log(`Email validation for ${certificate.email}:`);
    console.log(`- Challenge: ${challenge}`);
    console.log(`- Verification URL: ${verificationUrl}`);
    console.log(`- Negative URL: ${negativeUrl}`);
    
    const newCertificate = {
      ...certificate,
      serialNumber,
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)).toISOString(), // 1 year
      codeVersion: this.versionService.getCurrentVersion(),
      emailVerified: false,
      emailChallenge: challenge,
      challengeGeneratedAt: now.toISOString(),
    };

    try {
      return await this.certificateRepository.create(newCertificate);
    } catch (error) {
      // Handle database-level uniqueness violation
      if (error.code === '23505') { // PostgreSQL unique violation code
        throw new HttpErrors.Conflict(
          'A certificate with this username or email already exists'
        );
      }
      throw error;
    }
  }

  @get('/certificates/{serialNumber}/verify-email')
  @response(200, {
    description: 'Verify email for certificate',
    content: {'text/html': {schema: {type: 'string'}}},
  })
  async verifyEmailGet(
    @param.path.string('serialNumber') serialNumber: string,
    @param.query.string('challenge') challenge: string,
    @param.query.boolean('notme') notme?: boolean,
  ): Promise<string> {
    try {
      const certificate = await this.certificateRepository.findById(serialNumber);
      
      if (!certificate.emailChallenge) {
        return this.renderVerificationPage('This certificate has already been verified or invalidated.', false);
      }

      if (certificate.emailChallenge !== challenge) {
        return this.renderVerificationPage('Invalid verification link.', false);
      }

      const now = new Date();
      const challengeAge = certificate.challengeGeneratedAt
        ? (now.getTime() - new Date(certificate.challengeGeneratedAt).getTime()) / 1000 / 60
        : Number.POSITIVE_INFINITY;

      if (challengeAge > EMAIL_VERIFICATION_CONFIG.expirationMinutes) {
        return this.renderVerificationPage('This verification link has expired.', false);
      }

      // Handle negative confirmation
      if (notme) {
        await this.certificateRepository.updateById(serialNumber, {
          email: 'UNVERIFIED@EMAIL',
          emailChallenge: '',
          emailVerified: false,
          challengeGeneratedAt: undefined,
          revoked: true,
          revokedAt: now.toISOString(),
          revokedReason: 'Email ownership denied by recipient'
        });
        return this.renderVerificationPage(
          'Thank you for letting us know. This certificate has been invalidated and marked for cleanup.',
          true
        );
      }

      // Handle positive confirmation
      await this.certificateRepository.updateById(serialNumber, {
        emailVerified: true,
        emailChallenge: '',
        challengeGeneratedAt: undefined
      });

      return this.renderVerificationPage(
        'Your email has been successfully verified. Your certificate is now active.',
        true
      );

    } catch (error) {
      return this.renderVerificationPage('Certificate not found or verification failed.', false);
    }
  }

  @post('/certificates/{serialNumber}/verify-email')
  @response(200, {
    description: 'Email verification status',
    content: {'application/json': {schema: {type: 'object', properties: {verified: {type: 'boolean'}}}}},
  })
  async verifyEmail(
    @param.path.string('serialNumber') serialNumber: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['challenge'],
            properties: {
              challenge: {
                type: 'string',
              },
            },
          },
        },
      },
    })
    request: {challenge: string},
  ): Promise<{verified: boolean}> {
    const certificate = await this.certificateRepository.findById(serialNumber);
    
    if (!certificate.emailChallenge) {
      throw new HttpErrors.BadRequest('No email challenge found for this certificate');
    }

    if (certificate.emailVerified) {
      throw new HttpErrors.BadRequest('Email already verified');
    }

    // Check if challenge has expired (30 minutes)
    const challengeAge = Date.now() - new Date(certificate.challengeGeneratedAt!).getTime();
    if (challengeAge > EMAIL_VERIFICATION_CONFIG.expirationMinutes * 60 * 1000) {
      throw new HttpErrors.BadRequest('Email challenge has expired');
    }

    if (request.challenge !== certificate.emailChallenge) {
      throw new HttpErrors.BadRequest('Invalid challenge');
    }

    await this.certificateRepository.updateById(serialNumber, {
      emailVerified: true,
      emailChallenge: undefined,
      challengeGeneratedAt: undefined,
    });

    return {verified: true};
  }

  @get('/certificates/count')
  @response(200, {
    description: 'Certificate model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Certificate) where?: Where<Certificate>,
  ): Promise<Count> {
    return this.certificateRepository.count(where);
  }

  @get('/certificates')
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

  @patch('/certificates')
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

  @get('/certificates/{id}')
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

  @patch('/certificates/{id}')
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

  @put('/certificates/{id}')
  @response(204, {
    description: 'Certificate PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() certificate: Certificate,
  ): Promise<void> {
    await this.certificateRepository.replaceById(id, certificate);
  }

  @del('/certificates/{id}')
  @response(204, {
    description: 'Certificate DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.certificateRepository.deleteById(id);
  }

  @get('/certificates/username/{username}')
  @response(200, {
    description: 'Array of Certificates for a specific username',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Certificate),
        },
      },
    },
  })
  async findByUsername(
    @param.path.string('username') username: string
  ): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { username },
      order: ['issuedAt DESC']
    });
  }

  private renderVerificationPage(message: string, success: boolean): string {
    const color = success ? '#28a745' : '#dc3545';
    const icon = success ? '✓' : '✗';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate Email Verification</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.6;
              padding: 2rem;
              max-width: 600px;
              margin: 0 auto;
              text-align: center;
            }
            .message {
              padding: 1rem;
              border-radius: 4px;
              background-color: ${color}15;
              color: ${color};
              margin: 2rem 0;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="icon">${icon}</div>
          <div class="message">${message}</div>
        </body>
      </html>
    `;
  }

  @get('/certificates/search')
  @response(200, {
    description: 'Search certificates by username, email, version, or fingerprint',
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
    @param.query.string('username') username?: string,
    @param.query.string('email') email?: string,
    @param.query.string('version') version?: string,
    @param.query.string('fingerprint') fingerprint?: string,
  ): Promise<Certificate[]> {
    const criteria: SearchCriteria = {};
    
    // Build search criteria
    if (username) criteria.username = username;
    if (email) criteria.email = email;
    if (version) criteria.codeVersion = version;
    if (fingerprint) criteria.fingerprint = fingerprint;

    // If no criteria provided, throw an error
    if (Object.keys(criteria).length === 0) {
      throw new HttpErrors.BadRequest(
        'At least one search criterion (username, email, version, or fingerprint) must be provided'
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
      order: ['issuedAt DESC']
    });
  }
}