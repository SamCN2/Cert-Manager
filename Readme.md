Nodejs (Express and Loopback4) and Postgresql app to issue/create/users/certificates.
An opinionalted user/group + certificate management system for weblogin, ssh, and others.

## Features
- self service
- email validation (for authentication)
- user creation (with username de-conflicting, first come, first claimed)
- separate group management
- user+groups an independent table (user_groups) that is a flat intersection of users and groups (for speed)
- If web app is configured correctly (with just the CA's public cert) then the server is not necessary to validate a user's identity.
- optionally, role names (group names) are loaded into the SAN fields of the v3 cert.  An app can pull group identity without having to do server group ID /membership lookups.  The info is righ there in the signed cert.


## Operating flow:
- User comes to base url and gets a welcome form with instruction and links
- User initiates a username request, spins on that page until available username is found, and submits emil and "Display Name"  Email is sent to address to validate user.  In test just to a file.
- User takes token and validates and is then redirected to a certificate request.
- user inters a passphrase for their certificate, and using the context of the validtion key, the system generates a CSR within the browser (key never leaves) and sends that to the server for signing.
- server signs the CSR, deposits key facets into the database for later lookup, and returns the cert to the users
- user's browser accepts the cert, wraps the cert and the key (protected by the password) in a pkcs12 wrapper and offers to save it to the user's filesystem.
- user stores the cert into their browser.
- SSL sites use the CA that signed the user's cert to set the TLS contition that cert presentation is optional or mandatory, and may make requests of our APIs to facilitate app logins or decorations.  

