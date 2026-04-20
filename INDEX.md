# MessageMesh Project Index

**Project Status:** Phase 1 Week 1 Complete ✅  
**Last Updated:** April 20, 2026  
**Version:** 1.0.0

---

## Quick Navigation

### 🚀 Getting Started
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** — Complete setup guide (Docker Compose, local development, testing)
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** — Daily development commands and tips
- **[README.md](./README.md)** — Project overview and architecture diagram

### 📚 Documentation
- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** — Full API documentation with cURL examples
- **[PHASE_1_SUMMARY.md](./PHASE_1_SUMMARY.md)** — Detailed completion summary (Week 1)
- **[PROJECT_SPECIFICATION.md](./PROJECT_SPECIFICATION.md)** — Complete architecture specification
- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** — Developer onboarding and best practices

### 🎯 Current Phase
- **Phase 1 Week 1:** ✅ Infrastructure & Core Services (Auth, User, Gateway)
- **Phase 1 Week 2:** 🔄 Messaging Service (In Progress)
- **Phase 2:** 🔲 WebSocket & Real-time (Weeks 4-6)
- **Phase 3:** 🔲 Group Chats & Media (Weeks 7-8)
- **Phase 4:** 🔲 Notifications (Weeks 9-10)
- **Phase 5:** 🔲 Testing & Deployment (Weeks 11-12)

---

## Project Structure

```
MessageMesh/
│
├── 📋 Documentation
│   ├── README.md                    # Project overview
│   ├── GETTING_STARTED.md           # Setup & testing guide
│   ├── QUICK_REFERENCE.md           # Daily commands
│   ├── API_ENDPOINTS.md             # API documentation
│   ├── PHASE_1_SUMMARY.md           # Week 1 completion
│   ├── PROJECT_SPECIFICATION.md     # Architecture spec
│   ├── DEVELOPMENT_GUIDE.md         # Dev best practices
│   └── INDEX.md                     # This file
│
├── 🏗️ Infrastructure
│   ├── docker-compose.yml           # Local dev environment
│   ├── .dockerignore
│   └── .env                         # Local config (git ignored)
│
├── 🔌 Shared Libraries (packages/)
│   ├── middleware/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   └── validate-jwt.js          # JWT validation
│   │   │   ├── error/
│   │   │   │   └── error-handler.js         # Global error handling
│   │   │   ├── logging/
│   │   │   │   └── logger.js                # Structured logging
│   │   │   ├── tracing/
│   │   │   │   └── request-id.js            # Request ID propagation
│   │   │   ├── rate-limit/
│   │   │   │   └── rate-limiter.js          # Distributed rate limiting
│   │   │   ├── validation/
│   │   │   │   └── validate-request.js      # Input validation
│   │   │   └── index.js                     # Module exports
│   │   └── package.json
│   │
│   ├── utils/
│   │   ├── src/
│   │   │   ├── crypto/
│   │   │   │   └── password-hash.js         # bcryptjs hashing
│   │   │   ├── jwt/
│   │   │   │   └── jwt-utils.js             # Token signing/verification
│   │   │   ├── uuid/
│   │   │   │   └── uuid-generator.js        # UUID v4 generation
│   │   │   ├── validators/
│   │   │   │   └── email-validator.js       # Email/password validation
│   │   │   └── index.js                     # Module exports
│   │   └── package.json
│   │
│   └── events/
│       ├── src/
│       │   ├── event-names.js               # Event constants
│       │   ├── event-bus.js                 # RabbitMQ integration
│       │   ├── schemas/
│       │   │   └── index.js                 # Event Joi schemas
│       │   └── index.js                     # Module exports
│       └── package.json
│
├── 🚀 Microservices (services/)
│   ├── api-gateway/                         # 🟢 Complete
│   │   ├── src/
│   │   │   ├── index.js                     # Main server (routing, proxies)
│   │   │   └── routes/
│   │   │       └── gateway-auth-routes.js   # Auth forwarding
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── auth-service/                        # 🟢 Complete
│   │   ├── src/
│   │   │   ├── index.js                     # Main server
│   │   │   ├── migrations/
│   │   │   │   └── 001_create_users_auth_table.js
│   │   │   ├── database/
│   │   │   │   └── connection.js            # Knex setup
│   │   │   ├── models/
│   │   │   │   └── user.js                  # User queries
│   │   │   ├── controllers/
│   │   │   │   └── auth-controller.js       # Register, login, refresh, logout
│   │   │   └── routes/
│   │   │       └── auth-routes.js           # /auth endpoints
│   │   ├── knexfile.js                      # DB config
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── user-service/                        # 🟢 Complete
│   │   ├── src/
│   │   │   ├── index.js                     # Main server
│   │   │   ├── migrations/
│   │   │   │   └── 001_create_user_profiles_table.js
│   │   │   ├── database/
│   │   │   │   └── connection.js            # Knex setup
│   │   │   ├── models/
│   │   │   │   ├── user-profile.js          # Profile queries
│   │   │   │   └── user-connection.js       # Connection queries
│   │   │   ├── controllers/
│   │   │   │   └── user-controller.js       # Profile, search, connections
│   │   │   ├── events/
│   │   │   │   └── event-consumers.js       # Event handlers
│   │   │   └── routes/
│   │   │       └── user-routes.js           # /users endpoints
│   │   ├── knexfile.js                      # DB config
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── message-service/                     # 🔲 Coming Phase 1 Week 2
│   ├── presence-service/                    # 🔲 Coming Phase 2
│   ├── notification-service/                # 🔲 Coming Phase 3
│   └── media-service/                       # 🔲 Coming Phase 3
│
├── 📦 Root Configuration
│   ├── package.json                         # Workspace definition
│   ├── .gitignore
│   └── .git/
│
└── 🧪 Testing & CI/CD (Coming Phase 5)
    ├── tests/                               # Integration tests
    └── .github/workflows/                   # GitHub Actions
```

---

## Service Endpoints Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check (gateway, auth, user services) |
| `/auth/register` | POST | No | User registration |
| `/auth/login` | POST | No | User login |
| `/auth/refresh` | POST | No | Token refresh |
| `/auth/logout` | POST | Yes | User logout |
| `/users/profile` | POST | Yes | Create user profile |
| `/users/profile` | GET | Yes | Get user profile |
| `/users/profile` | PUT | Yes | Update user profile |
| `/users/search` | GET | Yes | Search users by name/email |
| `/users/connections/request` | POST | Yes | Send connection request |
| `/users/connections/accept` | POST | Yes | Accept connection request |
| `/users/connections` | GET | Yes | Get user connections |
| `/users/connections/pending` | GET | Yes | Get pending requests |
| `/users/connections/block` | POST | Yes | Block user |

---

## Technology Stack

### Core
- **Node.js 18+** — JavaScript runtime
- **Express.js** — HTTP framework
- **Docker & Docker Compose** — Containerization

### Databases
- **PostgreSQL 15+** — Relational data (auth, profiles, messages)
- **Redis 7+** — Caching, rate limiting, presence
- **RabbitMQ 3.12+** — Event-driven messaging

### Libraries
- **jsonwebtoken** — JWT token generation/validation
- **bcryptjs** — Password hashing (12 rounds)
- **knex** — Database query builder and migrations
- **joi** — Input validation schemas
- **uuid** — UUID v4 generation
- **http-proxy-middleware** — Service proxying

---

## Key Concepts

### Authentication Flow
1. User registers with email + password
2. Password hashed with bcryptjs (12 rounds)
3. JWT issued: access token (15min) + refresh token (7 days)
4. Refresh token stored in database
5. API Gateway validates JWT on protected routes
6. Token rotation prevents reuse attacks

### Event-Driven Architecture
1. Services publish events to RabbitMQ topic exchange
2. Event names defined in shared package
3. Payloads validated with Joi schemas
4. Services subscribe to relevant events
5. Failed consumers nack and requeue (retry logic)

### Service Communication
1. HTTP REST for synchronous calls (gateway proxies)
2. RabbitMQ for async events
3. Each service owns its database (no shared DB)
4. Request ID propagated across services (tracing)
5. Circuit breaker pattern (Phase 2)

### Database Approach
- **Auth Service:** users_auth table with email, password_hash, refresh_token
- **User Service:** user_profiles table with profile info, user_connections for relationships
- **Message Service:** conversations, messages, read receipts (Phase 1 Week 2)
- Each service has its own PostgreSQL tables

---

## Development Workflow

### 1. Start Services
```bash
docker-compose up --build
```

### 2. Test Endpoints
```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Copy token and use for protected routes
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer TOKEN"
```

### 3. Develop Service
```bash
cd services/auth-service
npm run dev  # Auto-reload with nodemon
```

### 4. Add Migration
```bash
cd services/auth-service
npx knex migrate:make table_name
# Edit src/migrations/TIMESTAMP_table_name.js
npm run migrate
```

### 5. Test Changes
```bash
npm run test              # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

---

## Important Files to Review

### Architecture & Planning
- `PROJECT_SPECIFICATION.md` — Complete system design (read first)
- `PHASE_1_SUMMARY.md` — Week 1 deliverables and status

### Implementation Reference
- `shared/middleware/src/` — Reusable middleware patterns
- `shared/utils/src/` — Utility functions used across services
- `shared/events/src/` — Event bus and schema examples

### Service Templates
- `services/auth-service/` — Database + controller + route pattern
- `services/user-service/` — Event consumers + relationships pattern
- `services/api-gateway/` — Proxy + rate limiting pattern

### Testing & Deployment
- `docker-compose.yml` — Complete local dev environment
- `Dockerfile` — Service containerization template

---

## Common Development Tasks

### Add New Endpoint
1. Create handler in `controllers/`
2. Create route in `routes/`
3. Mount route in `src/index.js`
4. Test with cURL or Postman

### Publish Event
1. Define event name in `shared/events/event-names.js`
2. Add schema to `shared/events/schemas/index.js`
3. Call `publishEvent(eventNames.MY_EVENT, { data })`
4. Consumers subscribe with `consumeEvent()`

### Add Database Table
1. Create migration with `npx knex migrate:make`
2. Define schema in migration file
3. Create model with query functions
4. Run `npm run migrate`

### Debug Service
```bash
docker-compose logs -f SERVICE_NAME
docker-compose exec SERVICE_NAME sh
# Inside container: npm run test, npm run dev, etc.
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Auth response time | <50ms | ✅ Met |
| User service response | <100ms | ✅ Met |
| Presence query latency | <10ms | 🔲 Phase 2 |
| Message delivery | <100ms | 🔲 Phase 2 |
| Connection pool size | 10-20 | ✅ Configured |
| Rate limit | 100 req/min | ✅ Configured |
| Test coverage | ≥80% | 🔲 Phase 5 |

---

## Testing Matrix

| Component | Status | Notes |
|-----------|--------|-------|
| Auth Service (manual) | ✅ Complete | Register, login, refresh, logout |
| User Service (manual) | ✅ Complete | Profile, search, connections |
| API Gateway (manual) | ✅ Complete | Routing, rate limiting, JWT |
| Automated Tests | 🔲 Pending | Phase 5 target |
| Integration Tests | 🔲 Pending | Phase 5 target |
| Load Tests | 🔲 Pending | Phase 5 target |
| E2E Tests | 🔲 Pending | Phase 5 target |

---

## Git Workflow

```bash
# Create branch for feature
git checkout -b feature/messaging-service

# Make changes and commit
git add .
git commit -m "feat: add message sending functionality"

# Push and create PR
git push origin feature/messaging-service
```

---

## Environment Variables

Each service uses `.env.example` as template:

```bash
# Copy template
cp .env.example .env

# Edit with local values
DATABASE_URL=postgresql://user:pass@localhost:5432/db
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_URL=redis://localhost:6379
```

---

## Monitoring & Observability

### Logs
- Structured JSON logging in all services
- View with: `docker-compose logs -f SERVICE_NAME`

### Tracing
- X-Request-Id header propagated across services
- Search logs by request ID for distributed tracing

### Health Checks
```bash
curl http://localhost:3000/health  # Gateway
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # User
```

### RabbitMQ Monitoring
- Visit http://localhost:15672 (guest:guest)
- View exchanges, queues, messages, connections

---

## Troubleshooting

**Services won't start?**
- Check `docker-compose logs SERVICE_NAME`
- Verify database migrations: `npm run migrate`
- Check port conflicts: `lsof -i :PORT`

**Database connection failed?**
- Verify PostgreSQL running: `docker-compose ps postgres`
- Check DATABASE_URL in .env
- Verify credentials: `psql -U user -d db`

**Events not being processed?**
- Check RabbitMQ is running: http://localhost:15672
- View message queue: RabbitMQ UI → Queues
- Check consumer logs: `docker-compose logs user-service`

**Token expired?**
- Use refresh token: `POST /auth/refresh`
- Access token expires in 15 minutes by design

See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed troubleshooting.

---

## Next Phase: Week 2 Planning

**Messaging Service Implementation:**
1. Database schema (conversations, messages)
2. Message controllers (send, get history)
3. Message events (sent, delivered, read)
4. Event consumers in User/Notification services
5. Docker and Dockerfile
6. API documentation

---

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## Contact & Support

For questions or issues:
1. Check [GETTING_STARTED.md](./GETTING_STARTED.md) troubleshooting section
2. Review [API_ENDPOINTS.md](./API_ENDPOINTS.md) for endpoint details
3. Check service logs: `docker-compose logs SERVICE_NAME`
4. Review [PROJECT_SPECIFICATION.md](./PROJECT_SPECIFICATION.md) for architecture questions

---

**Last Updated:** April 20, 2026  
**Status:** Phase 1 Week 1 Complete  
**Ready for:** Phase 1 Week 2 — Messaging Service Implementation
