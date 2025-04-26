# Email Processing Service

A service for queuing and sending emails via AWS SES with a PostgreSQL-backed queue.

## Features

- Queue emails for sending
- Process queued emails via AWS SES
- Track email status and retry failed sends
- API endpoints for queue management and status
- PostgreSQL for reliable queue storage

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Create PostgreSQL database:
   ```sql
   CREATE DATABASE email_process;
   ```

4. Build the TypeScript code:
   ```bash
   npm run build
   ```

5. Start the service:
   ```bash
   npm start
   ```

## API Endpoints

### Queue an Email
```http
POST /api/email/queue
Content-Type: application/json

{
  "to": "recipient@example.com",
  "from": "sender@yourdomain.com",
  "subject": "Test Email",
  "text": "Plain text content",
  "html": "<p>HTML content</p>"
}
```

### Check Email Status
```http
GET /api/email/status/:id
```

### Get Queue Statistics
```http
GET /api/email/stats
```

## Configuration

The service uses the following environment variables:

- `PORT`: Server port (default: 3007)
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port
- `DB_USER`: PostgreSQL username
- `DB_PASSWORD`: PostgreSQL password
- `DB_NAME`: PostgreSQL database name
- `AWS_REGION`: AWS region for SES
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

## Development

Run in development mode with auto-reload:
```bash
npm run dev
``` 