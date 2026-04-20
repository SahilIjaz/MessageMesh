# MessageMesh

A real-time chat application built with a modern microservices architecture. Features include one-to-one messaging, group chats, real-time presence tracking, media sharing, and push notifications.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/SahilIjaz/MessageMesh.git
cd MessageMesh

# Start all services
cd infra
docker-compose up --build
```

Services will be available at:
- **API Gateway:** http://localhost:3000
- **RabbitMQ UI:** http://localhost:15672
- **MailHog (Email):** http://localhost:8025
- **MinIO (S3):** http://localhost:9001

## Architecture

MessageMesh uses 7 independent microservices, each with its own database and responsibility:

```
┌─────────────────────────────────────────────┐
│            API Gateway (Port 3000)          │
│  (Auth validation, routing, WebSockets)     │
└────────────┬────────────────────────────────┘
             │
      ┌──────┴──────────────────────────────────────────────┐
      │                                                     │
  ┌───▼──────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐
  │   Auth   │  │  User/   │  │ Messaging  │  │ Presence │
  │ Service  │  │ Profile  │  │  Service   │  │ Service  │
  │(3001)    │  │(3002)    │  │  (3003)    │  │ (3004)   │
  │          │  │          │  │            │  │ Redis    │
  │PostgreSQL│  │PostgreSQL│  │ PostgreSQL │  │  based   │
  └──────────┘  └──────────┘  └────────────┘  └──────────┘

  ┌────────────┐  ┌──────────┐  ┌──────────────┐
  │Notification│  │  Media   │  │  RabbitMQ    │
  │ Service    │  │ Service  │  │  (Events)    │
  │  (3005)    │  │  (3006)  │  │              │
  │PostgreSQL  │  │S3/MinIO  │  │  Publisher   │
  └────────────┘  └──────────┘  │  & Broker    │
                                 └──────────────┘
```

## Services

| Service | Port | Database | Purpose |
|---------|------|----------|---------|
| **Auth** | 3001 | PostgreSQL | Registration, login, JWT tokens |
| **User/Profile** | 3002 | PostgreSQL | Profiles, contacts, blocking |
| **Messaging** | 3003 | PostgreSQL | Conversations, messages, history |
| **Presence** | 3004 | Redis | Online status, typing indicators |
| **Notification** | 3005 | PostgreSQL | Push notifications, emails |
| **Media** | 3006 | S3/MinIO | Image uploads, file storage |
| **API Gateway** | 3000 | Redis | Routing, auth, WebSocket mgmt |

## Tech Stack

- **Runtime:** Node.js
- **API Framework:** Express.js / Fastify
- **Databases:** PostgreSQL (relational), Redis (cache)
- **Message Broker:** RabbitMQ
- **File Storage:** AWS S3 / MinIO
- **Containerization:** Docker & Docker Compose
- **Authentication:** JWT (access + refresh tokens)
- **Real-time:** WebSockets

## Key Features

✅ **Real-time messaging** — WebSocket-based instant message delivery  
✅ **Presence tracking** — See who's online (sub-100ms latency)  
✅ **Group chats** — Create conversations with multiple participants  
✅ **Media sharing** — Upload images and files  
✅ **Message delivery status** — Sent, delivered, read receipts  
✅ **Typing indicators** — See when someone is typing  
✅ **Push notifications** — Send notifications to offline users  
✅ **Contact management** — Add, remove, and block users  
✅ **Scalable** — Independent service scaling, load balancing  

## Documentation

- **[PROJECT_SPECIFICATION.md](./PROJECT_SPECIFICATION.md)** — Complete architecture and detailed service contracts
- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** — How to develop locally, test APIs, and extend services
- **[CLAUDE.md](./CLAUDE.md)** — Quick project context for AI assistants

## Project Structure

```
MessageMesh/
├── services/                    # Microservices
│   ├── auth-service/
│   ├── user-service/
│   ├── messaging-service/
│   ├── presence-service/
│   ├── notification-service/
│   ├── media-service/
│   └── api-gateway/
├── shared/                      # Shared libraries
│   ├── middleware/              # Authentication, error handling
│   ├── events/                  # Event definitions and schemas
│   └── utils/                   # Common utilities
├── infra/                       # Infrastructure
│   ├── docker-compose.yml       # Local development environment
│   └── k8s/                     # Kubernetes manifests (production)
├── docs/                        # Documentation
│   └── api-specs/               # OpenAPI specifications per service
├── PROJECT_SPECIFICATION.md     # Complete system design
├── DEVELOPMENT_GUIDE.md         # Developer onboarding
└── CLAUDE.md                    # AI assistant context

```

## Development Workflow

### 1. Local Setup

```bash
cd infra
docker-compose up --build
```

This starts:
- All 7 microservices
- PostgreSQL, Redis, RabbitMQ
- MinIO (local S3), MailHog (local email)

### 2. Explore a Service

```bash
cd services/auth-service
npm install
npm run dev
```

### 3. Test an Endpoint

```bash
# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Test123!"}'
```

### 4. Send a Real-Time Message (WebSocket)

```javascript
const socket = new WebSocket('ws://localhost:3000/ws?token=YOUR_TOKEN');

socket.send(JSON.stringify({
  type: 'message:send',
  conversationId: 'conv-id',
  content: 'Hello!'
}));
```

## Database Schemas

Each service manages its own PostgreSQL tables. See [PROJECT_SPECIFICATION.md](./PROJECT_SPECIFICATION.md#11-database-schema-summary) for complete schema.

**Example — Messaging Service:**
```sql
-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  type ENUM ('direct', 'group'),
  name VARCHAR(200),
  created_by UUID,
  created_at TIMESTAMP
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID,
  content TEXT,
  status ENUM ('sent', 'delivered', 'read'),
  created_at TIMESTAMP
);

CREATE INDEX idx_conv_messages ON messages(conversation_id, created_at DESC);
```

## Event-Driven Architecture

Services communicate via RabbitMQ events:

| Event | Publisher | Consumers |
|-------|-----------|-----------|
| `USER_REGISTERED` | Auth | User/Profile (creates profile) |
| `NEW_MESSAGE` | Messaging | Notification (sends push) |
| `USER_BLOCKED` | User/Profile | Messaging (blocks messages) |
| `USER_ONLINE` | Presence | Notification (cancels delay) |

See [PROJECT_SPECIFICATION.md #5](./PROJECT_SPECIFICATION.md#5-event-catalog) for complete event catalog.

## Testing

Each service includes unit and integration tests:

```bash
cd services/[service-name]
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

Target: **80% code coverage minimum**

## Performance & Monitoring

- **Presence Service SLA:** <10ms response time (Redis-backed)
- **Message Latency:** <100ms for online users
- **Centralized Logging:** ELK stack or Datadog
- **Distributed Tracing:** `X-Request-Id` across all services
- **Health Checks:** `GET /health` from every service
- **Alerts:** Error rates >1%, Presence latency >50ms, queue depth >10k

## Security

- **Authentication:** JWT with 15-minute access token expiry
- **Encryption:** HTTPS/WSS + AES-256 at rest
- **Rate Limiting:** 5 requests/sec for messaging, 3/min for registration
- **Input Validation:** All inputs sanitized (Joi/Zod)
- **Authorization:** API Gateway validates tokens, services trust gateway

## Deployment

**Development:** Docker Compose (all-in-one)  
**Staging:** Docker containers on single server  
**Production:** Kubernetes with:
- Separate deployments per service
- Horizontal Pod Autoscaling
- Persistent volumes for databases
- ConfigMaps for configuration
- Secrets for credentials

See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for production deployment steps.

## Contributing

1. Assign yourself to a service
2. Write OpenAPI/Swagger spec before coding
3. Implement with 80% test coverage
4. Update documentation
5. Create a pull request

## Phases

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **1** | Weeks 1-3 | Auth + User/Profile + Gateway |
| **2** | Weeks 4-6 | Messaging + Presence + WebSocket |
| **3** | Weeks 7-8 | Group chats + Media Service |
| **4** | Weeks 9-10 | Notifications + Receipts + Typing |
| **5** | Weeks 11-12 | Polish + Testing + Deployment |

## Useful Links

- [Architecture Overview](./PROJECT_SPECIFICATION.md)
- [Development Setup](./DEVELOPMENT_GUIDE.md)
- [API Endpoints Documentation](./docs/api-specs/)
- [Event Schemas](./shared/events/)

## FAQ

**Q: Can services call each other's databases directly?**  
A: No. Each service owns its database. Use REST APIs for inter-service communication.

**Q: What if a service goes down?**  
A: API Gateway returns 503. Use circuit breakers (Phase 2 feature) to gracefully degrade.

**Q: How do I trace a user request across all services?**  
A: API Gateway sets `X-Request-Id`. All services log and forward this ID.

**Q: Why Redis for Presence and not PostgreSQL?**  
A: Presence queries are latency-critical (<10ms). Redis delivers sub-millisecond performance.

**Q: Can I develop a service without Docker?**  
A: Yes, but you'll need PostgreSQL/Redis running locally. Docker Compose is recommended.

## License

MIT

## Authors

- **Sahil Ijaz** — Project Lead

---

**Last updated:** April 20, 2026  
**Status:** Foundation phase — Services scaffold complete, ready for implementation
