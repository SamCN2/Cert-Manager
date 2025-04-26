# OGT11 Microservices Architecture

## API Conventions and Standards

### URL Structure
All microservices in this architecture MUST follow these URL structure conventions:

```
https://{domain}/{service-name}/api/{resource}/{action}
```

Example:
```
https://urp.ogt11.com/request/api/users/check-username/{username}
```

### Canonical Service
The `user-admin` service is designated as the canonical reference implementation for API conventions. All other services MUST conform to its patterns and conventions, including:

1. All API endpoints MUST be prefixed with `/api`
2. Resource names MUST be plural (e.g., `/users`, `/requests`)
3. Actions MUST use kebab-case (e.g., `check-username`, `update-status`)

### Service Configuration
When configuring service URLs:
- Base URLs should NOT include the `/api` prefix
- The `/api` prefix should be part of the endpoint paths
- Example configuration:
  ```javascript
  userAdminUrl: 'https://urp.ogt11.com/request'  // Correct
  endpoint: '/api/users/check-username'          // Correct
  ```

## Architecture Decision Records (ADR)

### ADR-001: API URL Structure
- Status: Accepted
- Context: Need for consistent API URL structure across microservices
- Decision: Adopt user-admin service's URL structure as the canonical pattern
- Consequences: All services must conform to this pattern; existing services may need updates

## Services

### user-admin
- Primary service implementing user management and authentication
- **Reference Implementation** for API conventions
- Base path: `/request/api/*`

### user-request
- Handles user registration requests
- Must conform to user-admin API conventions
- Base path: `/request/api/*`

## Development Guidelines

1. Always refer to user-admin's implementation when adding new endpoints
2. Maintain consistent URL structure across all services
3. Use the provided configuration patterns for service URLs
4. Document any deviations with proper justification in service-specific README 