# MessageMesh Development Guide

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development without Docker)
- Git

### Start All Services

```bash
cd infra
docker-compose up --build
```

This will start:
- All 7 microservices
- PostgreSQL database
- Redis cache
- RabbitMQ message broker
- MinIO S3-compatible storage
- MailHog email testing UI

**Access Points:**
- API Gateway: `http://localhost:3000`
- RabbitMQ UI: `http://localhost:15672` (user: messagemesh, pass: dev_password)
- MailHog: `http://localhost:8025`
- MinIO UI: `http://localhost:9001`

---

## Service Overview

### 1. Auth Service (Port 3001)

**Endpoints:**
```
POST   /auth/register           - Register new user
POST   /auth/login              - User login
POST   /auth/refresh            - Refresh access token
POST   /auth/logout             - Logout user
POST   /auth/forgot-password    - Request password reset
POST   /auth/reset-password     - Reset password with token
GET    /auth/oauth/google       - Google OAuth login
GET    /auth/oauth/google/callback
```

**Setup:**
```bash
cd services/auth-service
npm install
npm run migrate  # Run database migrations
npm run dev
```

---

### 2. User/Profile Service (Port 3002)

**Endpoints:**
```
GET    /users/me                - Get authenticated user profile
PATCH  /users/me                - Update own profile
GET    /users/:userId           - Get public profile
GET    /users/search?q=query    - Search users
POST   /users/contacts          - Add contact
GET    /users/contacts          - List contacts
DELETE /users/contacts/:id      - Remove contact
POST   /users/contacts/:id/block - Block user
```

**Setup:**
```bash
cd services/user-service
npm install
npm run migrate
npm run dev
```

---

### 3. Messaging Service (Port 3003)

**Endpoints:**
```
POST   /conversations                              - Create conversation
GET    /conversations                              - List conversations
GET    /conversations/:id/messages?cursor=&limit=50 - Get messages
POST   /conversations/:id/messages                 - Send message
PATCH  /conversations/:id/messages/:msgId/status   - Update status
DELETE /conversations/:id/messages/:msgId          - Delete message
```

**WebSocket Events:**
```
Client → Server:
  message:send      - Send new message
  message:typing    - User is typing
  message:read      - Mark messages as read

Server → Client:
  message:new       - New message received
  message:status_update - Message status changed
  message:deleted   - Message was deleted
```

**Setup:**
```bash
cd services/messaging-service
npm install
npm run migrate
npm run dev
```

---

### 4. Presence Service (Port 3004)

**Internal Endpoints Only** (for other services):
```
GET    /presence/:userId              - Get user status
GET    /presence/bulk?userIds=id1,id2 - Batch status check
POST   /presence/:userId/online       - Mark online
POST   /presence/:userId/offline      - Mark offline
POST   /presence/:userId/typing       - Set typing indicator
```

**Performance SLA:** <10ms response time (uses Redis).

**Setup:**
```bash
cd services/presence-service
npm install
npm run dev
```

---

### 5. Notification Service (Port 3005)

**Client Endpoints:**
```
POST   /notifications/devices        - Register device token
DELETE /notifications/devices/:id    - Remove device token
GET    /notifications/preferences    - Get preferences
PATCH  /notifications/preferences    - Update preferences
```

**Completely event-driven.** Listens for:
- `NEW_MESSAGE` → sends push notifications
- `PASSWORD_RESET_REQUESTED` → sends reset email
- `USER_ONLINE` → cancels pending emails

**Setup:**
```bash
cd services/notification-service
npm install
npm run migrate
npm run dev
```

---

### 6. Media Service (Port 3006)

**Endpoints:**
```
POST   /media/upload     - Upload file/image
DELETE /media/:id        - Delete file
```

**Upload Rules:**
- Avatar: max 5MB, types: JPEG, PNG, WebP, GIF
- Chat image: max 10MB, types: JPEG, PNG, WebP, GIF
- Chat file: max 25MB, types: PDF, DOCX, XLSX, ZIP, TXT

**Setup:**
```bash
cd services/media-service
npm install
npm run dev
```

---

### 7. API Gateway (Port 3000)

**Responsibilities:**
- Route requests to appropriate service
- Validate JWT tokens
- Rate limiting
- WebSocket connection management
- Request ID propagation (tracing)

**Key Middleware:**
```
X-User-Id       - Added by gateway after token validation
X-Request-Id    - Unique per request for tracing
```

**Setup:**
```bash
cd services/api-gateway
npm install
npm run dev
```

---

## Testing an API Flow

### Example: User Registration and Login

**1. Register a new user:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "rt_abc123...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  }
}
```

**2. Use access token to get your profile:**
```bash
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer eyJhbGc..."

# Response:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "user@example.com",
  "avatarUrl": null,
  "statusMessage": null
}
```

**3. Start a direct conversation:**
```bash
# First, get another user's ID or search
curl "http://localhost:3000/users/search?q=john" \
  -H "Authorization: Bearer eyJhbGc..."

# Then create conversation
curl -X POST http://localhost:3000/conversations \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "direct",
    "participants": ["other-user-id"]
  }'

# Response:
{
  "conversationId": "conv-uuid",
  "type": "direct",
  "participants": [...]
}
```

**4. Send a message (WebSocket):**

Connect to WebSocket:
```javascript
const socket = new WebSocket('ws://localhost:3000/ws?token=YOUR_ACCESS_TOKEN');

socket.onopen = () => {
  socket.send(JSON.stringify({
    type: 'message:send',
    conversationId: 'conv-uuid',
    content: 'Hello there!',
    contentType: 'text'
  }));
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

---

## Database Migrations

Each service manages its own migrations. Use the pattern:

```bash
cd services/[service-name]
npm run migrate        # Apply pending migrations
npm run migrate:down   # Rollback one migration
npm run migrate:fresh  # Drop all and re-apply
```

Migrations live in `/services/[service-name]/migrations`.

---

## Environment Variables

Each service reads from `.env` file. Example for Messaging Service:

```env
NODE_ENV=development
PORT=3003
DATABASE_URL=postgresql://messagemesh:dev_password@localhost:5432/messagemesh
RABBITMQ_URL=amqp://messagemesh:dev_password@localhost:5672
PRESENCE_SERVICE_URL=http://localhost:3004
USER_SERVICE_URL=http://localhost:3002
```

---

## Debugging

### View Service Logs
```bash
# Follow logs from all services
docker-compose logs -f

# Follow logs from one service
docker-compose logs -f messaging-service
```

### Database Queries (PostgreSQL)
```bash
docker exec -it messagemesh-postgres psql -U messagemesh -d messagemesh
\dt                    # List tables
SELECT * FROM messages LIMIT 5;
```

### Redis Commands
```bash
docker exec -it messagemesh-redis redis-cli
KEYS presence:*        # See all online users
HGETALL presence:user-123
```

### RabbitMQ Management
Visit `http://localhost:15672` (user: messagemesh, pass: dev_password)
- View queues
- Monitor message flow
- Check dead-letter exchanges

---

## Common Tasks

### Create a New Service

```bash
mkdir services/my-service
cd services/my-service

# Create package.json
npm init -y

# Install dependencies
npm install express dotenv pg amqplib

# Create basic structure
mkdir -p src/{routes,models,services,middleware}
touch Dockerfile .env .dockerignore
```

### Add Event Handler

In any service, listen for events via RabbitMQ:

```javascript
// src/events/event-consumer.js
const amqp = require('amqplib');

async function consumeEvent(eventName, handler) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  
  // Create exchange
  await channel.assertExchange('messagemesh', 'topic', { durable: true });
  
  // Create queue
  const queue = await channel.assertQueue('', { exclusive: true });
  
  // Bind queue to exchange with routing key
  await channel.bindQueue(queue.queue, 'messagemesh', eventName);
  
  // Consume
  channel.consume(queue.queue, async (msg) => {
    if (msg) {
      const content = JSON.parse(msg.content.toString());
      await handler(content);
      channel.ack(msg);
    }
  });
}

module.exports = { consumeEvent };
```

### Add Integration Test

```javascript
// services/[service]/tests/api.test.js
const request = require('supertest');
const app = require('../src/app');

describe('Auth Service', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
  });
});
```

---

## Troubleshooting

### Services won't start
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :5432

# Clean up containers and volumes
docker-compose down -v
docker-compose up --build
```

### Database connection errors
```bash
# Verify PostgreSQL is running and healthy
docker-compose ps

# Check connection string in .env
# Default: postgresql://messagemesh:dev_password@localhost:5432/messagemesh
```

### RabbitMQ connection errors
```bash
# Check RabbitMQ status
docker-compose logs rabbitmq

# Verify credentials in services' .env
# Default: amqp://messagemesh:dev_password@localhost:5672
```

### WebSocket connection fails
- Ensure API Gateway is running
- Check JWT token is valid (15-minute expiry)
- Verify token is passed correctly: `wss://localhost:3000/ws?token=...`

---

## Code Style & Standards

- **Linting:** `npm run lint` (ESLint)
- **Formatting:** `npm run format` (Prettier)
- **Testing:** `npm run test` (Jest)
- **Type checking:** `npm run type-check` (TypeScript — optional)

---

## Next Steps

1. **Set up one service locally** — follow the "Quick Start" for Auth Service
2. **Write OpenAPI spec** — document your service's API before coding
3. **Build the database schema** — create migrations
4. **Implement core endpoints** — start with CRUD
5. **Add event producers/consumers** — integrate with message broker
6. **Write tests** — unit + integration
7. **Deploy to Docker** — test with docker-compose

---

**Questions?** Check `PROJECT_SPECIFICATION.md` for detailed architecture and service contracts.
