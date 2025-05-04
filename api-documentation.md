# API Documentation for Fresh Approach

## 1. User Admin API

### User Management
- **Base URL**: `/api/user-admin`
- **Authentication**: Required (not shown in current code)

#### Endpoints:

1. **Create User**
   - `POST /users`
   - Creates a new user with validation
   - Required fields:
     - `username` (3-50 chars, alphanumeric + underscore/hyphen)
     - `displayName` (1-100 chars)
     - `responsibleParty` (1-100 chars)
   - Optional fields:
     - `groupNames` (array of strings)

2. **Check Username Availability**
   - `GET /users/check-username/{username}`
   - Returns `{available: boolean}`

3. **Get User**
   - `GET /users/{id}`
   - Returns user details with optional filtering

4. **Update User**
   - `PATCH /users/{id}`
   - Updates user details
   - Can update:
     - `displayName`
     - `groupNames`

5. **Delete User**
   - `DELETE /users/{id}`
   - Removes user from system

6. **Email Validation**
   - `POST /users/{id}/validate-email`
   - Validates user's email address
   - Required: `email` field

7. **Verify Validation Token**
   - `POST /users/verify-validation-token`
   - Verifies email validation token
   - Required: `validationToken` field

### User Model
```typescript
interface User {
  id: string;                    // UUID
  username: string;              // Unique identifier
  displayName: string;           // Human-readable name
  responsibleParty: string;      // Person responsible
  email?: string;                // Optional email
  createdAt: Date;               // Creation timestamp
  lastModifiedAt?: Date;         // Last update timestamp
  lastModifiedBy?: string;       // Who made last change
  status: string;                // 'pending' by default
  groups?: Group[];              // Associated groups
}
```

## 2. Certificate Admin API

### Certificate Management
- **Base URL**: `/api/cert-admin`
- **Authentication**: Required (not shown in current code)

#### Endpoints:

1. **Create Certificate**
   - `POST /certificates`
   - Creates a new certificate record
   - Generates unique serial number
   - Required fields:
     - `code_version`
     - `username`
     - `fingerprint`
     - `not_before`
     - `not_after`
     - `userid`

2. **Get Certificate**
   - `GET /certificates/{id}`
   - Returns certificate details

3. **Search Certificates**
   - `GET /certificates/search`
   - Search by:
     - `version`
     - `fingerprint`

4. **Update Certificate**
   - `PATCH /certificates/{id}`
   - Updates certificate details

5. **Delete Certificate**
   - `DELETE /certificates/{id}`
   - Removes certificate from system

### Certificate Model
```typescript
interface Certificate {
  serialNumber: string;          // UUID
  code_version: string;          // Version identifier
  username: string;              // Associated username
  commonname?: string;           // Optional common name
  email?: string;                // Optional email
  fingerprint: string;           // Certificate fingerprint
  not_before: Date;              // Valid from
  not_after: Date;               // Valid until
  userid: string;                // Associated user ID
  status: 'absent' | 'present' | 'active' | 'revoked';
  revokedat?: Date;              // Revocation date if revoked
  roles?: string;                // Associated roles
  revocation_reason?: string;    // Reason for revocation
  createdat: Date;               // Creation timestamp
  is_first_certificate: boolean; // First certificate flag
}
```

## Key Features for Fresh Approach

1. **User Management**
   - Strict username validation
   - Email verification workflow
   - Group-based access control
   - Audit trail (last modified tracking)

2. **Certificate Management**
   - Unique serial number generation
   - Certificate lifecycle management
   - Revocation support
   - Version tracking
   - First certificate flagging

3. **Integration Points**
   - User-Certificate relationship via `userid`
   - Email validation workflow
   - Group-based access control

4. **Security Considerations**
   - Rate limiting (implemented in cert-admin)
   - UUID-based identifiers
   - Timestamp-based audit trails
   - Status tracking for both users and certificates

## Notes for Fresh Implementation

1. **Authentication & Authorization**
   - Current implementation lacks authentication details
   - Need to implement proper JWT or OAuth2 flow
   - Consider role-based access control

2. **Data Validation**
   - Implement comprehensive input validation
   - Add schema validation middleware
   - Consider using OpenAPI/Swagger for documentation

3. **Error Handling**
   - Implement consistent error response format
   - Add proper error logging
   - Consider error tracking service integration

4. **Testing Strategy**
   - Unit tests for controllers and services
   - Integration tests for API endpoints
   - Performance testing for rate limiting

5. **Documentation**
   - Generate OpenAPI documentation
   - Add inline code documentation
   - Create user guides and API reference

6. **Monitoring & Logging**
   - Implement request logging
   - Add performance monitoring
   - Set up alerting for critical errors

7. **Database Considerations**
   - Current implementation uses PostgreSQL
   - Consider connection pooling
   - Implement proper migrations strategy

8. **Deployment**
   - Containerize the applications
   - Set up CI/CD pipeline
   - Implement proper environment configuration

This documentation provides a foundation for a fresh implementation while maintaining the core functionality of the existing system. The focus should be on improving security, maintainability, and scalability while keeping the essential features intact. 