/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {
  post,
  requestBody,
  response,
  HttpErrors,
} from '@loopback/rest';
import {repository} from '@loopback/repository';
import {Certificate} from '../models';
import {CertificateRepository} from '../repositories';
import {bind, inject} from '@loopback/core';
import {VersionService} from '../services/version.service';
import { v7 as uuidv7 } from 'uuid';
import * as forge from 'node-forge';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Type definition for node-forge
declare module 'node-forge' {
  export namespace pki {
    export function certificationRequestFromPem(pem: string): any;
    export function createCertificate(): any;
    export function certificateToPem(cert: any): string;
    export function certificateToAsn1(cert: any): any;
    export function certificateFromPem(pem: string): any;
  }
  export namespace util {
    export function encode64(bytes: string): string;
  }
}

interface CertAttribute {
    name: string;
    value: string;
    valueTagClass?: number;
    type?: string;
    shortName?: string;
}

interface CSRRequest {
  csr: string; // PEM encoded CSR
  userId: string;
  username: string;
  email?: string;
}

@bind()
export class CSRController {
  private caKey: any;
  private caCert: any;

  constructor(
    @repository(CertificateRepository)
    public certificateRepository: CertificateRepository,
    @inject('services.VersionService')
    public versionService: VersionService,
  ) {
    // Load CA key and certificate
    try {
      this.caKey = forge.pki.privateKeyFromPem(
        fs.readFileSync(path.join(__dirname, '../../../ca/private/ca-key.pem'), 'utf8')
      );
      this.caCert = forge.pki.certificateFromPem(
        fs.readFileSync(path.join(__dirname, '../../../ca/certs/ca-cert.pem'), 'utf8')
      );
      
      // Validate CA key and certificate
      if (!this.caKey || !this.caCert) {
        throw new Error('Failed to load CA key or certificate');
      }
      
      // Verify CA certificate
      if (!this.caCert.verify(this.caCert)) {
        throw new Error('CA certificate verification failed');
      }
      
      console.log('CA key and certificate loaded successfully');
    } catch (error) {
      console.error('Error loading CA credentials:', error);
      throw error;
    }
  }

  @post('/csr/sign')
  @response(200, {
    description: 'Sign a CSR and create a certificate',
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
            required: ['csr', 'userId', 'username'],
            properties: {
              csr: {type: 'string'},
              userId: {type: 'string'},
              username: {type: 'string'},
              email: {type: 'string'},
            },
          },
        },
      },
    })
    request: CSRRequest,
  ): Promise<{certificate: string; caCertificate: string; serialNumber: string}> {
    try {
      // Validate request
      if (!request.csr || !request.userId || !request.username) {
        console.error('Missing required parameters:', {
          hasCSR: !!request.csr,
          hasUserId: !!request.userId,
          hasUsername: !!request.username
        });
        throw new HttpErrors.BadRequest('Missing required parameters');
      }

      // Parse the CSR
      let csr;
      try {
        csr = forge.pki.certificationRequestFromPem(request.csr);
        console.log('CSR parsed successfully');
      } catch (error) {
        console.error('CSR parsing failed:', error);
        throw new HttpErrors.BadRequest('Invalid CSR format');
      }
      
      // Validate the CSR
      if (!csr.verify()) {
        console.error('CSR verification failed');
        throw new HttpErrors.BadRequest('Invalid CSR signature');
      }
      console.log('CSR verified successfully');

      // Create a certificate from the CSR
      const cert = forge.pki.createCertificate();
      cert.publicKey = csr.publicKey;
      cert.serialNumber = uuidv7();
      console.log('Certificate created with serial number:', cert.serialNumber);
      
      // Set validity period (1 year)
      const now = new Date();
      cert.validity.notBefore = now;
      cert.validity.notAfter = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      console.log('Validity period set:', cert.validity.notBefore, 'to', cert.validity.notAfter);
      
      // Copy subject from CSR
      try {
          console.log('CSR subject attributes:', JSON.stringify(csr.subject.attributes, null, 2));
          // Normalize subject attributes to use consistent valueTagClass
          const subjectAttrs = csr.subject.attributes.map((attr: CertAttribute) => ({
              name: attr.name,
              value: attr.value,
              valueTagClass: attr.name === 'emailAddress' ? 22 : 12  // Use same valueTagClass as issuer
          }));
          cert.setSubject(subjectAttrs);
          console.log('Subject set successfully');
      } catch (error) {
          console.error('Error setting subject:', error);
          throw new HttpErrors.InternalServerError('Failed to set certificate subject');
      }
      
      // Set issuer from CA certificate
      try {
          console.log('CA certificate subject attributes:', JSON.stringify(this.caCert.subject.attributes, null, 2));
          const issuerAttrs = this.caCert.subject.attributes.map((attr: CertAttribute) => ({
              name: attr.name,
              value: attr.value,
              valueTagClass: attr.name === 'emailAddress' ? 22 : 12
          }));
          cert.setIssuer(issuerAttrs);
          console.log('Issuer set successfully');
      } catch (error) {
          console.error('Error setting issuer:', error);
          throw new HttpErrors.InternalServerError('Failed to set certificate issuer');
      }
      
      // Add extensions
      try {
          cert.setExtensions([
              {
                  name: 'basicConstraints',
                  cA: false,
              },
              {
                  name: 'keyUsage',
                  digitalSignature: true,
                  nonRepudiation: true,
                  keyEncipherment: true,
              },
              {
                  name: 'extKeyUsage',
                  serverAuth: true,
                  clientAuth: true,
                  emailProtection: true,
              },
              {
                  name: 'subjectKeyIdentifier',
              },
              {
                  name: 'authorityKeyIdentifier',
                  keyid: true,
                  issuer: true,
              }
          ]);
          console.log('Extensions set successfully');
      } catch (error) {
          console.error('Error setting extensions:', error);
          throw new HttpErrors.InternalServerError('Failed to set certificate extensions');
      }

      // Sign with CA key
      cert.sign(this.caKey, forge.md.sha256.create());
      console.log('Certificate signed successfully');

      try {
          // Convert to PEM format with standard 64-character line wrapping
          console.log('Converting certificate to ASN.1...');
          const certAsn1 = forge.pki.certificateToAsn1(cert);
          
          console.log('Converting ASN.1 to DER...');
          const derBytes = forge.asn1.toDer(certAsn1).getBytes();
          console.log('DER bytes length:', derBytes.length);
          
          console.log('Encoding certificate in base64...');
          const base64Cert = forge.util.encode64(derBytes);
          console.log('Base64 length:', base64Cert.length);
          
          const pemLines = ['-----BEGIN CERTIFICATE-----'];
          for (let i = 0; i < base64Cert.length; i += 64) {
              pemLines.push(base64Cert.substr(i, 64));
          }
          pemLines.push('-----END CERTIFICATE-----');
          const pem = pemLines.join('\n');
          console.log('PEM format created successfully');

          // Verify the generated certificate
          console.log('Verifying generated certificate...');
          try {
              const verifiedCert = forge.pki.certificateFromPem(pem);
              if (!verifiedCert) {
                  throw new Error('Failed to parse generated certificate');
              }
              console.log('Certificate verification successful');
              
              // Include CA certificate in the response
              const caPem = forge.pki.certificateToPem(this.caCert);
              
              // Store certificate in database
              try {
                  await this.certificateRepository.create({
                      userid: request.userId,
                      username: request.username,
                      email: request.email,
                      serialNumber: cert.serialNumber,
                      fingerprint: forge.md.sha256.create().update(derBytes).digest().toHex(),
                      status: 'active',
                      createdat: new Date(),
                      not_after: cert.validity.notAfter,
                      not_before: cert.validity.notBefore,
                      code_version: this.versionService.getCurrentVersion(),
                      is_first_certificate: false
                  });
                  console.log('Certificate stored in database');
              } catch (dbError) {
                  console.error('Database error:', dbError);
                  // Continue even if database storage fails
                  console.log('Continuing despite database error');
              }
              
              return {
                  certificate: pem,
                  caCertificate: caPem,
                  serialNumber: cert.serialNumber,
              };
          } catch (verifyError) {
              console.error('Certificate verification failed:', verifyError);
              throw new HttpErrors.InternalServerError(`Failed to verify generated certificate: ${verifyError.message}`);
          }
      } catch (error) {
          console.error('Failed to generate certificate:', error);
          throw new HttpErrors.InternalServerError(`Failed to generate certificate: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in signCSR:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError('Failed to sign CSR: ' + error.message);
    }
  }
} 