/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {
  post,
  requestBody,
  response,
  HttpErrors,
} from '@loopback/rest';
import {inject} from '@loopback/core';
import {CertificateService} from '../services/certificate.service';
import * as crypto from 'crypto';
import {authenticate} from '@loopback/authentication';

interface CSRRequest {
  csr: string;
  email: string;
  username: string;
}

@authenticate('jwt')
export class CSRController {
  constructor(
    @inject('services.CertificateService')
    private certificateService: CertificateService,
  ) {}

  @post('/csr/sign')
  @response(200, {
    description: 'Sign CSR and return certificate',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            certificate: {type: 'string'},
            caCertificate: {type: 'string'},
            serialNumber: {type: 'string'},
          },
        },
      },
    },
  })
  async signCSR(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['csr', 'email', 'username'],
            properties: {
              csr: {type: 'string'},
              email: {type: 'string'},
              username: {type: 'string'},
            },
          },
        },
      },
    })
    request: CSRRequest,
  ): Promise<{certificate: string; caCertificate: string; serialNumber: string}> {
    try {
      // Validate CSR format
      if (!request.csr.includes('-----BEGIN CERTIFICATE REQUEST-----') || 
          !request.csr.includes('-----END CERTIFICATE REQUEST-----')) {
        throw new HttpErrors.BadRequest('Invalid CSR format: Missing PEM headers');
      }

      // Generate certificate
      const {certificate, caCertificate} = await this.certificateService.generateCertificate(
        request.csr,
      );

      // Get serial number from certificate
      const x509 = new crypto.X509Certificate(certificate);

      return {
        certificate,
        caCertificate,
        serialNumber: x509.serialNumber,
      };
    } catch (error) {
      console.error('CSR signing error:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.BadRequest(
        `Failed to sign CSR: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
} 