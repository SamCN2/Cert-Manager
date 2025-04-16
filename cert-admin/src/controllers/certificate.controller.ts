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
import {bind} from '@loopback/core';
import {rateLimiter} from '../middleware/rate-limiter.middleware';

// Configuration for email verification
const EMAIL_VERIFICATION_CONFIG = {
  baseUrl: process.env.EMAIL_VERIFICATION_URL || 'http://localhost:3003',
  path: '/certificates',
  expirationMinutes: 30
};

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
  ) {}

  // Helper function to generate a secure challenge string and verification URL
  private generateEmailChallenge(serialNumber: string): { challenge: string, verificationUrl: string } {
    // Generate a random 32-byte string and encode as hex
    const challenge = crypto.randomBytes(32).toString('hex');
    
    // Create a verification URL that includes both serial number and challenge
    const verificationUrl = new URL(`${EMAIL_VERIFICATION_CONFIG.path}/${serialNumber}/verify-email`, EMAIL_VERIFICATION_CONFIG.baseUrl);
    verificationUrl.searchParams.set('challenge', challenge);
    
    return {
      challenge,
      verificationUrl: verificationUrl.toString()
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

    const now = new Date();
    const serialNumber = await this.generateSerialNumber();
    
    // Generate email challenge and verification URL
    const { challenge, verificationUrl } = this.generateEmailChallenge(serialNumber);
    console.log(`Email validation for ${certificate.email}:`);
    console.log(`- Challenge: ${challenge}`);
    console.log(`- Verification URL: ${verificationUrl}`);
    
    try {
      return await this.certificateRepository.create({
        ...certificate,
        serialNumber,
        issuedAt: now.toISOString(),
        expiresAt: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString(),
        emailVerified: false,
        emailChallenge: challenge,
        challengeGeneratedAt: now.toISOString(),
      });
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
    description: 'Email verification via GET',
    content: {'text/html': {schema: {type: 'string'}}},
  })
  async verifyEmailGet(
    @param.path.string('serialNumber') serialNumber: string,
    @param.query.string('challenge') challenge: string,
  ): Promise<string> {
    const certificate = await this.certificateRepository.findById(serialNumber);
    
    try {
      if (!certificate.emailChallenge) {
        throw new HttpErrors.BadRequest('No email challenge found for this certificate');
      }

      if (certificate.emailVerified) {
        return this.renderVerificationPage('Email already verified', true);
      }

      // Check if challenge has expired (30 minutes)
      const challengeAge = Date.now() - new Date(certificate.challengeGeneratedAt!).getTime();
      if (challengeAge > EMAIL_VERIFICATION_CONFIG.expirationMinutes * 60 * 1000) {
        throw new HttpErrors.BadRequest('Email challenge has expired');
      }

      if (challenge !== certificate.emailChallenge) {
        throw new HttpErrors.BadRequest('Invalid challenge');
      }

      await this.certificateRepository.updateById(serialNumber, {
        emailVerified: true,
        emailChallenge: undefined,
        challengeGeneratedAt: undefined,
      });

      return this.renderVerificationPage('Email verification successful!', true);
    } catch (error) {
      return this.renderVerificationPage(
        error instanceof HttpErrors.HttpError ? error.message : 'Verification failed',
        false
      );
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
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Email Verification</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f8f9fa;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              max-width: 400px;
              width: 90%;
            }
            .message {
              color: ${color};
              font-size: 1.25rem;
              margin: 1rem 0;
            }
            .icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">${success ? '✅' : '❌'}</div>
            <div class="message">${message}</div>
          </div>
        </body>
      </html>
    `;
  }
}
