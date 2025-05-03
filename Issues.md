# Known Issues and TODOs

## Test Coverage Gaps

### User Status and Modification Tracking
- Current test suite does not cover status transitions (e.g., pending -> active)
- Last-modified timestamp handling is not tested
- Repository logic may need to be updated to:
  - Enforce valid status transitions
  - Automatically update last-modified timestamps
  - Track who made modifications
  - Ensure status changes are properly audited

### Database Environment Safety
- Need to add environment flag to select between prod/test databases
- Prevent accidental test runs against production data

## Missing Features 

## Debug Code Cleanup

**Priority: High**
**Status: Open**

### Description
The debug page (`/request/debug`) and related code contains sensitive information and testing endpoints that should not be present in production. This includes:

- Debug page with test data generation
- Validation token handling
- Test endpoints and routes
- Detailed error logging

### Tasks
- [ ] Remove debug page (`/request/debug`)
- [ ] Remove test data generation code
- [ ] Remove validation token test endpoints
- [ ] Clean up detailed error logging
- [ ] Remove any test-specific routes
- [ ] Review and remove any other debug-related code

### Notes
- This cleanup should be done before production deployment
- Ensure all necessary logging is preserved for production monitoring
- Consider moving test-specific code to a separate test environment if needed 

## Unified Test API Endpoint

**Priority: Medium**
**Status: Open**

### Description
Create a unified test API endpoint that can be used by both automated scripts and browser-based testing. This will provide a single source of test tokens and validation data.

### Tasks
- [ ] Create new test API endpoint for token generation
- [ ] Implement secure access controls for test endpoints
- [ ] Add environment-based activation (dev/test only)
- [ ] Update test scripts to use new endpoint
- [ ] Update browser debug tools to use new endpoint
- [ ] Document test API usage

### Notes
- Must be disabled in production
- Should integrate with existing test infrastructure
- Consider using environment variables for configuration
- May need to handle different authentication methods for scripts vs browser 