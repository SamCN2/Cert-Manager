Node and loopback4 application and api to issue, sign, and manage user certificates.


## Features
- Certificate creation and signing with CA support
- Email verification system with secure challenge tokens
- Rate-limited API endpoints
- Unique username/email constraints
- PostgreSQL database integration

## Status
- Cert creation and signing works seamlessly (in Firefox, ymmv)
- Email verification is left to you, as I don't know your mail infra
-- Challenge tokens are written to logs
- Rate limiting works on cert-admin.
-- Cert-create causes more work on the client side, so is it's own rate limit
- Username management not entirely sorted, LDAP, anyone?
- Puts everything in certificate table.  Could use sqlite3 easily enough.

## Components
- cert-create, an nodejs SPA for cert creating and requesting a signature.
-- Important!  cert-create creates cert in browser.  key never leaves browser.
- cert-admin, a loopback4 -based api that manages DB calls to track above.

## Installing
-cert-create:  Just npm install
-cert-admin:   Just npm install

Created on a vibecoding weekend in Cursor with Claude.
FWIW, I've never done frontend programming of any sort before.
I'm a server and command-line kind of individual.  Sure, I can
write a basic web form and pair that with a cgi, but yecch!

I've started to write user apps before, but I always bog down
in the insane verbosity of Java or JavaScript (node or Angular)
and just go back to being productive in the space I can.  I've
been fortunate that I've been able to contract the FE work out
when I've been on my own projects, or had an excellent FE staff
when I'm at a big company.

But I just had to try Cursor when I learned about it.  This isn't
half bad if I do say so myself.  I have always built this little
app as a cgi wherever I go to make cert generation easier without
having to install some huge IDM. If I needed an IDM, it'd already
be there...  But I decided to target this on the vibe.  I got 
really good at prompt engineering if nothing else.

I'm planning on dressing this up a bit, because I remain convinced
that certs are the only MFA that are going to survive, if any do.

I'll get some helper config here shortly, but the idea is, put
the CA's public cert in the webserver config and set to demand 
certificates from users.  Have the users use cert-create to get
a server and request a userid.  They'll store the downloaded cert
to their cert-store in their browser, and when they go to your
website protected as above, the browser will prompt for the cert 
PIN/Passwd and they're in.

Yes, it's a little harder than take your phone an snap a photo
of a QR code.  But again, I'm reading too much about the auth apps
to be too comfortable in the long term.  And to that, I'm going
to use this to manage ssh keys as certs eventually.

Webcerts, ssh keys, and api certs or keys is all the auth I think
is needed, and I think this is complete enough to be useful and 
small enough to be usable.

Cheers!
