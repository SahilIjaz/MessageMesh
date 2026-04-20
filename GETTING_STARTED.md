# Getting Started with MessageMesh

## Prerequisites

- Docker & Docker Compose (recommended for full stack)
- Node.js 18+ (for local service development)
- PostgreSQL 15+ (if running services locally)
- Redis 7+ (if running services locally)
- RabbitMQ 3.12+ (if running services locally)

## Option 1: Run Everything with Docker Compose (Recommended)

### Step 1: Start All Services

```bash
cd /Users/sahilijaz/Desktop/MessageMesh
docker-compose up --build
```

This starts:
- **PostgreSQL** on port 5432 (user: messagemesh, pass: messagemesh)
- **Redis** on port 6379
- **RabbitMQ** on port 5672 / UI on 15672 (user: guest, pass: guest)
- **Auth Service** on port 3001
- **User Service** on port 3002
- **API Gateway** on port 3000

Wait for all services to show "healthy" status.

### Step 2: Test the System

**Terminal 1 - Register a user:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "john.doe@example.com",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Copy the `accessToken` for next steps.

**Terminal 2 - Create user profile:**
```bash
curl -X POST http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "bio": "Software developer from NYC",
    "phone": "+1234567890"
  }'
```

**Terminal 3 - Get profile:**
```bash
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Terminal 4 - Search users:**
```bash
curl -X GET "http://localhost:3000/users/search?q=john&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Option 2: Run Services Locally (Development)

### Prerequisites

Have PostgreSQL, Redis, and RabbitMQ running (use Docker for these):

```bash
# Start databases in Docker
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=messagemesh \
  -e POSTGRES_PASSWORD=messagemesh \
  -e POSTGRES_DB=messagemesh \
  postgres:15-alpine

docker run -d -p 6379:6379 redis:7-alpine

docker run -d -p 5672:5672 -p 15672:15672 \
  rabbitmq:3.12-management-alpine
```

### Run Auth Service

```bash
cd services/auth-service

# Setup environment
cp .env.example .env
# Edit .env with your database URL if needed

# Install dependencies
npm install

# Run migrations
npm run migrate

# Start development server
npm run dev
```

Auth Service will run on http://localhost:3001

### Run User Service

In a new terminal:

```bash
cd services/user-service

# Setup environment
cp .env.example .env

# Install dependencies
npm install

# Run migrations
npm run migrate

# Start development server
npm run dev
```

User Service will run on http://localhost:3002

### Run API Gateway

In another terminal:

```bash
cd services/api-gateway

# Setup environment
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

API Gateway will run on http://localhost:3000

---

## Testing with Postman

### Import Collection

1. Download `docs/postman/MessageMesh.postman_collection.json`
2. Open Postman
3. Click "Import" → Select the file
4. Set `baseUrl` variable to `http://localhost:3000`

### Test Workflow

1. **Register** → POST `/auth/register`
   - Email: test@example.com
   - Password: TestPass123!

2. **Copy accessToken** from response

3. **Set Postman Variable:**
   - Click gear icon → "Manage Environments"
   - Create new environment "Local"
   - Add variable: `token` = your accessToken
   - Use `{{token}}` in Authorization headers

4. **Create Profile** → POST `/users/profile`
   - Body: firstName, lastName, email, bio, phone

5. **Get Profile** → GET `/users/profile`
   - Requires token

6. **Search Users** → GET `/users/search?q=test`
   - Search for other users

7. **Send Connection Request** → POST `/users/connections/request`
   - connectedUserId: another user's ID

---

## Database Inspection

### Using psql

```bash
# Connect to PostgreSQL
psql -h localhost -U messagemesh -d messagemesh

# List tables
\dt

# View users_auth table
SELECT * FROM users_auth LIMIT 5;

# View user_profiles table
SELECT * FROM user_profiles LIMIT 5;

# View user_connections table
SELECT * FROM user_connections LIMIT 5;
```

### Using pgAdmin (Optional)

```bash
docker run -d \
  -p 5050:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@example.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  dpage/pgadmin4
```

Visit http://localhost:5050 and add PostgreSQL server with:
- Host: host.docker.internal (Mac/Windows) or 172.17.0.1 (Linux)
- Port: 5432
- Username: messagemesh
- Password: messagemesh

---

## Checking Service Health

```bash
# API Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# User Service
curl http://localhost:3002/health
```

All should return:
```json
{
  "status": "healthy",
  "service": "SERVICE_NAME",
  "timestamp": "2026-04-20T10:30:00.000Z"
}
```

---

## Monitoring RabbitMQ

Visit http://localhost:15672 (username: guest, password: guest)

You can see:
- **Exchanges** — Topic exchange: `messagemesh`
- **Queues** — Per-service event queues
- **Messages** — Published events
- **Connections** — Connected services

---

## Troubleshooting

### Services Not Connecting to PostgreSQL

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not running, start it
docker-compose up postgres -d
```

### RabbitMQ Connection Issues

**Error:** `connect ECONNREFUSED 127.0.0.1:5672`

**Solution:**
```bash
# Check RabbitMQ
docker ps | grep rabbitmq

# If not running, start it
docker-compose up rabbitmq -d
```

### Password Validation Failing

**Error:** `Password must contain uppercase, lowercase, numbers and be at least 8 characters`

**Solution:** Use a password like `TestPass123!` (uppercase, lowercase, number, 8+ chars)

### Token Expired/Invalid

**Error:** `403 Token has expired`

**Solution:** Generate a new access token:
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 PID

# Or use different port
PORT=3001 npm run dev
```

---

## Development Tips

### File Watching

Services use `nodemon` for auto-restart on file changes:

```bash
cd services/auth-service
npm run dev
```

Modify a file in `src/` and the service will auto-restart.

### Database Migrations

Create new migration:
```bash
cd services/auth-service
npx knex migrate:make migration_name
# Creates: src/migrations/TIMESTAMP_migration_name.js
```

Run migrations:
```bash
npm run migrate          # Run all
npm run migrate:down     # Rollback one
npm run migrate:fresh    # Rollback all + run all
```

### Testing

```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## Project Structure Reference

```
MessageMesh/
├── services/
│   ├── api-gateway/         # Request routing, auth validation
│   ├── auth-service/        # Login, registration, token management
│   ├── user-service/        # Profiles, connections, blocking
│   ├── messaging-service/   # (Coming Phase 2)
│   ├── presence-service/    # (Coming Phase 2)
│   ├── notification-service/ # (Coming Phase 3)
│   └── media-service/       # (Coming Phase 3)
├── shared/
│   ├── middleware/          # Auth, logging, error handling
│   ├── utils/              # Crypto, JWT, validators
│   └── events/             # Event bus, schemas
├── docker-compose.yml       # Local development stack
├── API_ENDPOINTS.md        # Full API documentation
└── GETTING_STARTED.md      # This file
```

---

## Next Steps

1. **Run Docker Compose** to start all services
2. **Test the API** using the cURL examples above
3. **Import Postman collection** for easier testing
4. **Read API_ENDPOINTS.md** for detailed endpoint documentation
5. **Check docker-compose logs** to understand service communication
6. **Modify User Service** to add your own features

---

## Support

For issues, check:
1. `docker-compose logs -f SERVICE_NAME` for errors
2. `docker-compose ps` to verify all services are running
3. `curl http://localhost:SERVICE_PORT/health` for service status
4. RabbitMQ UI at http://localhost:15672 for event monitoring

---

**Last Updated:** April 20, 2026
