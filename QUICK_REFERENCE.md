# MessageMesh Quick Reference

## Start Development Environment

```bash
# Terminal 1: Start all services
docker-compose up --build

# Wait until all services show "healthy"
```

## Quick API Tests

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Test123!"}'
# Copy accessToken from response

# Login with same credentials
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Test123!"}'

# Create profile (use TOKEN from above)
curl -X POST http://localhost:3000/users/profile \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","bio":"Engineer"}'

# Get profile
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer TOKEN"

# Search users
curl -X GET "http://localhost:3000/users/search?q=john" \
  -H "Authorization: Bearer TOKEN"

# Health checks
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## Service Ports

| Service | Port | Type |
|---------|------|------|
| API Gateway | 3000 | HTTP |
| Auth Service | 3001 | HTTP |
| User Service | 3002 | HTTP |
| Message Service | 3003 | HTTP/WS |
| Presence Service | 3004 | HTTP/WS |
| PostgreSQL | 5432 | DB |
| Redis | 6379 | Cache |
| RabbitMQ AMQP | 5672 | Broker |
| RabbitMQ UI | 15672 | Web |

## Development Commands

```bash
# Auth Service
cd services/auth-service
npm install
npm run dev          # Start with nodemon
npm run migrate      # Run migrations
npm run test        # Run tests

# User Service
cd services/user-service
npm install
npm run dev
npm run migrate
npm run test

# API Gateway
cd services/api-gateway
npm install
npm run dev
```

## Database Access

```bash
# PostgreSQL
psql -h localhost -U messagemesh -d messagemesh

# Useful queries
SELECT * FROM users_auth LIMIT 5;
SELECT * FROM user_profiles LIMIT 5;
SELECT * FROM user_connections LIMIT 5;

# View migrations applied
SELECT * FROM knex_migrations;

# Check data created by tests
SELECT email, is_verified FROM users_auth WHERE email LIKE '%test%';
```

## RabbitMQ Monitoring

Visit http://localhost:15672 (guest:guest)

See:
- **Exchanges** → messagemesh (topic)
- **Queues** → per-service event queues
- **Messages** → published events
- **Connections** → connected services

## Common Issues & Fixes

### Port Already in Use
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 PID

# Or run on different port
PORT=3001 npm run dev
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose up postgres -d

# Check connection
docker-compose logs postgres
```

### RabbitMQ Not Responding
```bash
# Restart RabbitMQ
docker-compose restart rabbitmq

# Check logs
docker-compose logs rabbitmq
```

### Token Expired
```bash
# Generate new token with refresh token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### Migration Failed
```bash
# Rollback and retry
cd services/auth-service
npm run migrate:fresh    # Drop all + re-run

# Check migration files exist
ls src/migrations/
```

## File Locations

```
MessageMesh/
├── services/
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── migrations/       # Database versions
│   │   │   ├── models/           # Database queries
│   │   │   ├── controllers/      # Business logic
│   │   │   ├── routes/           # API endpoints
│   │   │   └── index.js          # Entry point
│   │   ├── knexfile.js           # DB config
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── user-service/             # Similar structure
│   ├── api-gateway/              # Proxy + routing
│   └── (messaging, presence, ...)
│
├── shared/
│   ├── middleware/               # Auth, logging, errors
│   ├── utils/                    # Crypto, JWT, validators
│   └── events/                   # Event bus, schemas
│
├── docker-compose.yml            # Dev environment
├── API_ENDPOINTS.md              # Full API docs
├── GETTING_STARTED.md            # Setup guide
├── PHASE_1_SUMMARY.md            # Completion summary
└── QUICK_REFERENCE.md            # This file
```

## Key Code Patterns

### Add Middleware to Service

```javascript
// src/index.js
app.use(express.json());
app.use(requestIdMiddleware);
app.use(rateLimiter({ maxRequests: 100, windowSeconds: 60 }));
app.use(validateJWT);  // For protected routes
```

### Add Route

```javascript
// src/routes/example-routes.js
const express = require('express');
const controller = require('../controllers/example-controller');

const router = express.Router();
router.post('/endpoint', controller.handler);
module.exports = router;

// src/index.js
app.use('/example', exampleRoutes);
```

### Publish Event

```javascript
const { publishEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;

await publishEvent(eventNames.USER_REGISTERED, {
  userId: user.id,
  email: user.email,
  timestamp: new Date(),
});
```

### Consume Event

```javascript
const { consumeEvent } = require('@messagemesh/events').eventBus;

await consumeEvent(eventNames.USER_REGISTERED, async (event) => {
  // Handle event
  console.log('User registered:', event.email);
});
```

### Database Query

```javascript
const { getConnection } = require('../database/connection');

const findUser = async (email) => {
  const db = getConnection();
  return db('users_auth').where('email', email).first();
};
```

### Error Handling

```javascript
const { AppError } = require('@messagemesh/middleware').errorHandler;

if (!user) {
  throw new AppError(
    'User not found',
    404,
    'USER_NOT_FOUND'
  );
}
```

### Validation

```javascript
const Joi = require('joi');

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const { error, value } = schema.validate(data);
if (error) {
  throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
}
```

## Debugging Tips

### View Service Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Last 100 lines
docker-compose logs -n 100
```

### Check Running Containers
```bash
docker-compose ps
```

### Enter Service Container
```bash
docker-compose exec auth-service sh
# Then: npm run test, npm run dev, etc.
```

### Direct Database Access
```bash
docker-compose exec postgres psql -U messagemesh -d messagemesh
```

### View RabbitMQ Events
```
http://localhost:15672
Go to Exchanges → messagemesh
See message counts and publishing details
```

## Performance Tips

- Services use connection pooling (Knex for DB)
- Redis for caching rate limiter state
- RabbitMQ for async event processing
- Migrations run on container startup
- Health checks every 30 seconds
- Request IDs for distributed tracing

## Testing Checklist

Before committing code:
- [ ] `npm run test` passes
- [ ] `npm run test:coverage` ≥ 80%
- [ ] No console.log statements
- [ ] Error messages are descriptive
- [ ] Input validation is present
- [ ] Rate limits applied where needed

## Documentation References

- **Full Architecture** → [PROJECT_SPECIFICATION.md](./PROJECT_SPECIFICATION.md)
- **Setup Instructions** → [GETTING_STARTED.md](./GETTING_STARTED.md)
- **API Endpoints** → [API_ENDPOINTS.md](./API_ENDPOINTS.md)
- **Phase 1 Completion** → [PHASE_1_SUMMARY.md](./PHASE_1_SUMMARY.md)
- **Development Guide** → [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)

## Useful Links

- PostgreSQL: http://localhost:5432 (messagemesh:messagemesh)
- Redis: http://localhost:6379
- RabbitMQ Admin: http://localhost:15672 (guest:guest)
- Auth Service: http://localhost:3001
- User Service: http://localhost:3002
- API Gateway: http://localhost:3000

---

**Last Updated:** April 20, 2026  
**Quick and practical reference for daily development**
