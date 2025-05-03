declare module 'node-forge' {
  export namespace pki {
    export interface Certificate {
      publicKey: any;
      serialNumber: string;
      validity: {
        notBefore: Date;
        notAfter: Date;
      };
      subject: {
        attributes: any[];
        getField(field: string): { value: string } | null;
      };
      setSubject(attributes: any[]): void;
      setIssuer(attributes: any[]): void;
      setExtensions(extensions: any[]): void;
      sign(privateKey: any, md: any): void;
    }

    export interface CertificationRequest {
      publicKey: any;
      privateKey: any;
      subject: {
        attributes: any[];
      };
      verify(): boolean;
    }

    export function certificationRequestFromPem(pem: string): CertificationRequest;
    export function createCertificate(): Certificate;
    export function certificateToPem(cert: Certificate): string;
    export function certificateFromPem(pem: string): Certificate;
    export function certificateToAsn1(cert: Certificate): any;
    export function privateKeyFromPem(pem: string): any;
  }

  export namespace md {
    export namespace sha256 {
      export function create(): any;
    }
  }

  export namespace asn1 {
    export function toDer(obj: any): { getBytes(): string };
  }
} 