New Components:
-user-request page/service - peer to user-manager
-Email validation system
-Admin notification system
Workflow:
-User visits user-request
-System attempts to create username via user-admin:
-If username exists, retry with alternatives
-Once successful, proceed to email validation
--System sends email challenge to validate user's email
-Upon email validation:
--User record is created
--Admin is notified of new user
--Admin uses user-manager to:
---Review new user
---Assign to groups (at minimum "user" group)
---User can then use their validated username in cert-create for CSRs
This separates concerns nicely:
-Username creation is managed by the system, not user input
-Email validation happens before admin involvement
-Certificate emails are separate from account email
-Maintains the existing cert-admin group requirements
Goals:
-Basic service structure
-Username generation/validation logic
-Initial API endpoints
-Basic frontend for user requests
