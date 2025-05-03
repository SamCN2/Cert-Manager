# Known Issues

## Resolved Issues

### [ISSUE-002] Manual Validation Form on Request Success Page Not Working
**Status:** Resolved in v0.2.1  
**Priority:** Medium  
**Component:** User Request Service - Manual Validation Form

**Resolution:**  
Fixed validation flow to handle all three validation methods consistently:
1. Manual form submission from request-success page
2. Email link validation via browser
3. Email link validation via curl

Key fixes:
- Corrected validation logic to prevent double user creation
- Proper status checking for already validated requests
- Consistent success/error handling for all validation methods
- Proper redirects to success page

### [ISSUE-001] Direct Validation Token Entry Not Working
**Status:** Resolved in v0.2.0  
**Priority:** Medium  
**Component:** User Request Service - Validation Flow

**Resolution:**  
Fixed in v0.2.0 with proper path handling and validation flow implementation. Email validation now works correctly with proper success page redirection.

## Active Issues
*No active issues at this time.*

# Certificate System Issues

## CSR Field Parameterization
- [ ] Parameterize all CSR subject fields except CN and E
- [ ] Default values:
  - C: US
  - ST: California
  - L: San Francisco
  - O: ogt11
  - OU: Certificate Authority
- [ ] Make these values configurable through environment variables or configuration files

## Group Membership
- [ ] Make users members of the ogt11 group by default
- [ ] Make the default group name configurable
- [ ] Update user creation/management to handle default group membership
- [ ] Ensure group membership is reflected in certificate generation

## Implementation Notes
- Changes needed in:
  - `user-request/src/public/js/csr.js`
  - User management system
  - Certificate generation process
- Consider backward compatibility with existing certificates
- Document configuration options for system administrators 