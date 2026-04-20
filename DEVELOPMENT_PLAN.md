# MessageMesh — Complete Step-by-Step Development Plan

## Overview

This document outlines the complete development roadmap from foundation to production deployment. The plan is organized into 5 phases, each with specific milestones, deliverables, and testing requirements.

**Timeline:** 12 weeks  
**Team Structure:** 7 service owners + 1 infrastructure engineer  
**Total Stories:** 45+ implementation stories

---

## PHASE 1: Foundation & Authentication (Weeks 1-3)

### Phase Goal
Establish the core infrastructure, authentication system, and user profiles. Teams can begin development on other services once this is complete.

### Week 1: Infrastructure & Scaffolding

#### Task 1.1: Repository Setup & CI/CD
- **Owner:** Infrastructure Engineer
- **Duration:** 2 days
- **Deliverables:**
  - [ ] GitHub Actions CI pipeline (lint, test, build Docker images)
  - [ ] Automated Docker image builds to registry
  - [ ] Code coverage tracking (Codecov/Coveralls)
  - [ ] Branch protection rules (require tests to pass)
  - [ ] Pre-commit hooks (ESLint, Prettier)

**Acceptance Criteria:**
- Every push triggers linting and unit tests
- Pull requests show code coverage changes
- Docker images automatically build and tag with `git commit SHA`

#### Task 1.2: Monorepo Setup & Shared Libraries
- **Owner:** Infrastructure Engineer
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Root `package.json` with workspaces
  - [ ] Shared middleware package (`shared/middleware`)
    - JWT validation middleware
    - Error handling middleware
    - Request ID (tracing) middleware
    - Rate limiting middleware
  - [ ] Shared events package (`shared/events`)
    - Event type definitions (TypeScript enums or constants)
    - Event payload schemas (Joi validation schemas)
  - [ ] Shared utils package (`shared/utils`)
    - UUID generation utilities
    - Password hashing (bcrypt wrapper)
    - JWT utilities (sign, verify)
    - Logger (structured JSON logging)

**Acceptance Criteria:**
- All services can `import { validateJWT } from '@messagemesh/middleware'`
- Event schemas are validated before publishing
- Shared code has 100% test coverage

#### Task 1.3: Database Setup & Migration Infrastructure
- **Owner:** Database/Infrastructure Engineer
- **Duration:** 2 days
- **Deliverables:**
  - [ ] PostgreSQL Docker image with initialization scripts
  - [ ] Migration framework setup (using `knex` or `db-migrate`)
  - [ ] Seed data scripts for development
  - [ ] Database backup/restore scripts
  - [ ] `.env.example` files for all services

**Acceptance Criteria:**
- Running `docker-compose up` automatically creates all databases
- Migrations are versioned and reproducible
- `npm run migrate` applies pending migrations
- `npm run migrate:down` rolls back safely

#### Task 1.4: API Gateway Scaffolding
- **Owner:** API Gateway Team
- **Duration:** 3 days
- **Deliverables:**
  - [ ] Express/Fastify HTTP server scaffold
  - [ ] JWT validation middleware integrated
  - [ ] Request/response logging with `X-Request-Id`
  - [ ] Error handling (global error catch)
  - [ ] CORS configuration
  - [ ] Rate limiting at gateway level (5 req/sec default)
  - [ ] Service discovery/routing configuration (hardcoded initially)
  - [ ] Health check endpoint (`GET /health`)

**Acceptance Criteria:**
- Gateway boots without errors: `npm run dev`
- All requests include `X-Request-Id` in logs
- Invalid JWT returns 401 with clear error message
- Rate limit returns 429 when exceeded

---

### Week 2: Auth Service Implementation

#### Task 2.1: Auth Service Setup & Database
- **Owner:** Auth Service Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Express/Fastify app scaffold
  - [ ] PostgreSQL `users_auth` table with migration
  - [ ] `.env` configuration
  - [ ] Health check endpoint
  - [ ] Database connection pooling

**Database Schema:**
```sql
CREATE TABLE users_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  refresh_token VARCHAR(500),
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_email ON users_auth(email);
```

**Acceptance Criteria:**
- Service starts: `npm run dev`
- Database migrations apply: `npm run migrate`
- Health check returns 200 with DB status

#### Task 2.2: Password Hashing & JWT Utilities
- **Owner:** Auth Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Password hashing utility (bcrypt, 12 rounds)
  - [ ] Password validation utility
  - [ ] JWT sign/verify utilities
  - [ ] Token generation with correct expiry (15 min access, 7 day refresh)
  - [ ] Unit tests (100% coverage)

**Acceptance Criteria:**
- Hashing same password twice produces different results (salt)
- JWT can be signed and verified correctly
- Expired tokens are rejected
- Unit tests pass with 100% coverage

#### Task 2.3: Registration Endpoint
- **Owner:** Auth Service Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] `POST /auth/register` endpoint
  - [ ] Input validation (email format, password strength)
  - [ ] Duplicate email check
  - [ ] Password hashing and storage
  - [ ] Generate and return JWT tokens
  - [ ] Publish `USER_REGISTERED` event to RabbitMQ
  - [ ] Error handling and validation responses
  - [ ] Integration tests

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "accessToken": "eyJhbGc...",
  "refreshToken": "rt_abc123..."
}
```

**Acceptance Criteria:**
- Valid registration returns 201 with tokens
- Duplicate email returns 400
- Weak password returns 400 with reason
- `USER_REGISTERED` event published to RabbitMQ
- Integration test covers happy path and error cases

#### Task 2.4: Login Endpoint
- **Owner:** Auth Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] `POST /auth/login` endpoint
  - [ ] Email and password validation
  - [ ] Password comparison (bcrypt)
  - [ ] Generate and return tokens
  - [ ] Store refresh token in DB
  - [ ] Integration tests

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "accessToken": "eyJhbGc...",
  "refreshToken": "rt_abc123..."
}
```

**Acceptance Criteria:**
- Valid credentials return 200 with tokens
- Invalid email/password return 401
- Refresh token stored in database
- Brute force protection: 10 failed attempts in 5 minutes = 429

#### Task 2.5: Refresh Token Endpoint
- **Owner:** Auth Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] `POST /auth/refresh` endpoint
  - [ ] Validate refresh token against database
  - [ ] Issue new access token
  - [ ] Rotate refresh token (revoke old, issue new)
  - [ ] Integration tests

**Request:**
```json
{
  "refreshToken": "rt_abc123..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "rt_def456..."
}
```

**Acceptance Criteria:**
- Valid refresh token returns new access token
- Old refresh token is invalidated
- Invalid/expired refresh token returns 401
- Token rotation prevents replay attacks

#### Task 2.6: Logout Endpoint
- **Owner:** Auth Service Team
- **Duration:** 0.5 days
- **Deliverables:**
  - [ ] `POST /auth/logout` endpoint
  - [ ] Invalidate refresh token in database
  - [ ] Return 200 OK

**Acceptance Criteria:**
- Refresh token is set to NULL in database
- Attempting to use invalidated token returns 401

---

### Week 3: User/Profile Service & Gateway Integration

#### Task 3.1: User/Profile Service Setup
- **Owner:** User Service Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Express/Fastify app scaffold
  - [ ] PostgreSQL `profiles` and `contacts` tables
  - [ ] Health check endpoint
  - [ ] Service-to-service REST client (for calling other services)

**Database Schema:**
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  status_message VARCHAR(250),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_user_id UUID NOT NULL,
  nickname VARCHAR(100),
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contact_user_id)
);
CREATE INDEX idx_user_contacts ON contacts(user_id);
```

**Acceptance Criteria:**
- Service starts and connects to database
- Migrations apply successfully
- Service-to-service HTTP client works

#### Task 3.2: RabbitMQ Event Consumer Setup
- **Owner:** User Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] RabbitMQ connection and channel setup
  - [ ] Event consumer for `USER_REGISTERED`
  - [ ] Create default profile when user registers
  - [ ] Event consumer error handling and retry logic

**Acceptance Criteria:**
- Listens to `USER_REGISTERED` event
- Creates profile with email-based display name
- Handles connection failures gracefully
- Retries failed event processing (exponential backoff)

#### Task 3.3: Get Profile Endpoints
- **Owner:** User Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] `GET /users/me` endpoint (authenticated user's profile)
  - [ ] `GET /users/:userId` endpoint (public profile)
  - [ ] Integration tests

**Acceptance Criteria:**
- `/users/me` returns full profile for authenticated user
- `/users/:userId` returns public profile (no sensitive data)
- Non-existent user returns 404

#### Task 3.4: Update Profile Endpoint
- **Owner:** User Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] `PATCH /users/me` endpoint
  - [ ] Update display_name, status_message, phone
  - [ ] Input validation
  - [ ] Return updated profile
  - [ ] Integration tests

**Acceptance Criteria:**
- Valid updates return 200 with updated profile
- Invalid input returns 400 with validation errors
- Only authenticated user can update their profile

#### Task 3.5: API Gateway Integration
- **Owner:** API Gateway Team + Auth Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Route `/auth/*` to Auth Service
  - [ ] Route `/users/*` to User Service
  - [ ] Pass `X-User-Id` header from JWT to downstream services
  - [ ] Error handling and response normalization
  - [ ] E2E tests (register → login → get profile)

**Acceptance Criteria:**
- Complete user registration flow works through gateway
- JWT validation at gateway level
- Downstream services receive correct `X-User-Id`
- E2E test: register → login → get profile

#### Task 3.6: Phase 1 Testing & Documentation
- **Owner:** All teams
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Unit test coverage ≥80% for all services
  - [ ] Integration test coverage for all endpoints
  - [ ] E2E test for registration → login → profile flow
  - [ ] OpenAPI/Swagger specs for Auth and User services
  - [ ] README updates with Phase 1 endpoints
  - [ ] Load test baseline (100 concurrent users, 10 req/sec)

**Acceptance Criteria:**
- All tests pass locally and in CI
- Code coverage ≥80%
- OpenAPI specs match actual API behavior
- Load tests show <500ms p99 latency

---

## PHASE 2: Real-Time Messaging (Weeks 4-6)

### Phase Goal
Implement the Presence Service and Messaging Service with WebSocket support for real-time one-to-one messaging.

### Week 4: Presence Service

#### Task 4.1: Presence Service Setup & Redis
- **Owner:** Presence Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Express/Fastify app scaffold
  - [ ] Redis connection with connection pooling
  - [ ] Health check endpoint
  - [ ] Service-to-service HTTP client

**Acceptance Criteria:**
- Service starts and connects to Redis
- Health check returns Redis status
- Can set/get values in Redis

#### Task 4.2: Presence Tracking Endpoints
- **Owner:** Presence Service Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] `GET /presence/:userId` endpoint (get single user status)
  - [ ] `GET /presence/bulk?userIds=id1,id2` endpoint (batch query)
  - [ ] `POST /presence/:userId/online` endpoint (mark online)
  - [ ] `POST /presence/:userId/offline` endpoint (mark offline)
  - [ ] TTL management (300 seconds for presence keys)
  - [ ] Unit and integration tests

**Acceptance Criteria:**
- All endpoints respond in <10ms (99th percentile)
- Presence data persists in Redis with TTL
- Bulk query efficiently handles 100+ user IDs
- Offline users are purged after TTL expires

#### Task 4.3: Typing Indicators
- **Owner:** Presence Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] `POST /presence/:userId/typing` endpoint
  - [ ] 3-second TTL for typing indicators
  - [ ] Auto-expire stale typing status

**Acceptance Criteria:**
- Typing status set with 3s TTL
- Auto-expires if not refreshed
- Efficient memory usage in Redis

#### Task 4.4: Event Publishing
- **Owner:** Presence Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Publish `USER_ONLINE` event when user comes online
  - [ ] Publish `USER_OFFLINE` event when user goes offline
  - [ ] RabbitMQ integration

**Acceptance Criteria:**
- Events published to correct exchange/routing key
- Other services can subscribe and react

#### Task 4.5: Presence Service Testing & Documentation
- **Owner:** Presence Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Unit tests (100% coverage)
  - [ ] Load tests (1000 concurrent users, presence updates)
  - [ ] OpenAPI specs
  - [ ] Performance benchmarks (<10ms SLA)

**Acceptance Criteria:**
- All tests pass
- Load tests confirm <10ms p99 latency
- Code coverage ≥80%

---

### Week 5: Messaging Service

#### Task 5.1: Messaging Service Setup & Database
- **Owner:** Messaging Service Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Express/Fastify app scaffold
  - [ ] PostgreSQL schema (conversations, members, messages)
  - [ ] Migration scripts
  - [ ] Service-to-service HTTP clients (for calling Presence, User)

**Database Schema:**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type ENUM ('direct', 'group') NOT NULL,
  name VARCHAR(200),
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL,
  role ENUM ('admin', 'member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type ENUM ('text', 'image', 'file', 'system') DEFAULT 'text',
  media_url VARCHAR(500),
  status ENUM ('sent', 'delivered', 'read') DEFAULT 'sent',
  reply_to UUID REFERENCES messages(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversation_messages ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_sender ON messages(sender_id);
```

**Acceptance Criteria:**
- Database schema matches specification
- Migrations are idempotent and reversible
- Service connects successfully

#### Task 5.2: Conversation Management Endpoints
- **Owner:** Messaging Service Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] `POST /conversations` endpoint (create direct or group)
  - [ ] `GET /conversations` endpoint (list with pagination)
  - [ ] `GET /conversations/:id/messages` endpoint (message history with cursor)
  - [ ] Membership validation
  - [ ] Integration tests

**Acceptance Criteria:**
- Direct conversations deduplicate (same two users = same conversation)
- Group creation requires name and multiple participants
- Conversation list returns last message preview and unread count
- Message history pagination works with cursor-based offset

#### Task 5.3: Message Sending Endpoint
- **Owner:** Messaging Service Team
- **Duration:** 2.5 days
- **Deliverables:**
  - [ ] `POST /conversations/:id/messages` endpoint
  - [ ] Sender membership validation
  - [ ] Blocking check (call User Service)
  - [ ] Store message with status `sent`
  - [ ] Check recipient online status (call Presence Service)
  - [ ] If online: push via WebSocket (via gateway)
  - [ ] If offline: publish `NEW_MESSAGE` event
  - [ ] Return created message
  - [ ] Integration tests

**Request:**
```json
{
  "content": "Hello!",
  "contentType": "text"
}
```

**Response:**
```json
{
  "messageId": "msg-uuid",
  "conversationId": "conv-uuid",
  "senderId": "user-uuid",
  "content": "Hello!",
  "status": "sent",
  "createdAt": "2026-04-20T10:30:00Z"
}
```

**Acceptance Criteria:**
- Message stored in database
- Blocking prevents message delivery
- `NEW_MESSAGE` event published for offline users
- Response includes message status

#### Task 5.4: Message Status Updates
- **Owner:** Messaging Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] `PATCH /conversations/:id/messages/:msgId/status` endpoint
  - [ ] Update status to `delivered` or `read`
  - [ ] Mark preceding unread messages as `read` (optimization)
  - [ ] Return updated message
  - [ ] Integration tests

**Acceptance Criteria:**
- Status updates persist in database
- Can mark multiple messages as read in one update
- Only recipient can update status

#### Task 5.5: Message Deletion
- **Owner:** Messaging Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] `DELETE /conversations/:id/messages/:msgId` endpoint
  - [ ] Soft delete (mark as deleted, preserve audit trail)
  - [ ] Only sender or group admin can delete
  - [ ] Return 204 No Content

**Acceptance Criteria:**
- Message marked as deleted, content replaced with "This message was deleted"
- Deletion timestamp recorded
- Only authorized users can delete

#### Task 5.6: Event Publishing
- **Owner:** Messaging Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Publish `MESSAGE_SENT` event (for analytics)
  - [ ] Publish `NEW_MESSAGE` event (for offline notifications)
  - [ ] RabbitMQ integration

**Acceptance Criteria:**
- Events published with correct payloads
- Other services can subscribe

#### Task 5.7: Messaging Service Testing
- **Owner:** Messaging Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Unit tests (100% coverage)
  - [ ] Integration tests for all endpoints
  - [ ] Load tests (100 concurrent users, 10 messages/sec)
  - [ ] OpenAPI specs

**Acceptance Criteria:**
- Tests pass locally and in CI
- Code coverage ≥80%
- Load tests show <200ms p99 latency

---

### Week 6: WebSocket Integration & API Gateway

#### Task 6.1: API Gateway WebSocket Support
- **Owner:** API Gateway Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] WebSocket server at `/ws` endpoint
  - [ ] JWT authentication on connection
  - [ ] Connection registration in in-memory map
  - [ ] Call `POST /presence/{userId}/online` on connect
  - [ ] Call `POST /presence/{userId}/offline` on disconnect
  - [ ] 60-second heartbeat ping/pong
  - [ ] Error handling and graceful closure
  - [ ] Redis Pub/Sub for multi-gateway routing

**Connection Flow:**
```
Client connects with JWT
→ Gateway validates token
→ Extracts userId
→ Registers connection in map
→ Calls Presence Service: POST /presence/{userId}/online
→ Client can now send/receive messages
```

**Acceptance Criteria:**
- WebSocket connection established with valid JWT
- Presence Service receives online notification
- Heartbeat keeps connection alive
- Disconnection triggers offline notification
- Multiple gateway instances route messages correctly

#### Task 6.2: WebSocket Message Routing
- **Owner:** API Gateway Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Forward `message:send` to Messaging Service
  - [ ] Forward `message:read` to Messaging Service
  - [ ] Forward `message:typing` to Presence Service
  - [ ] Receive message updates from Messaging Service
  - [ ] Push updates to connected clients

**Event Flow:**
```
Client: { type: 'message:send', conversationId, content }
→ Gateway → Messaging Service
→ Messaging Service: create message, call Presence Service
→ If recipient online: Gateway pushes message via Redis Pub/Sub
→ Recipient's gateway instance pushes to WebSocket client
```

**Acceptance Criteria:**
- Messages route correctly between services
- Online users receive messages instantly
- Offline users receive notification later

#### Task 6.3: E2E Testing: Direct Messaging
- **Owner:** API Gateway Team + Messaging Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] E2E test: Two users register and login
  - [ ] E2E test: Create direct conversation
  - [ ] E2E test: Send message via WebSocket
  - [ ] E2E test: Receive message in real-time
  - [ ] E2E test: Mark message as read
  - [ ] E2E test: Message status updates received
  - [ ] E2E test: Typing indicators work
  - [ ] Load test: 100 concurrent messaging users

**Acceptance Criteria:**
- Complete messaging flow works end-to-end
- Messages delivered <100ms for online users
- Typing indicators appear within 1 second
- Load tests show system handles 100 concurrent users

#### Task 6.4: Phase 2 Documentation & Deployment
- **Owner:** All teams
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] OpenAPI specs for Messaging and Presence services
  - [ ] WebSocket protocol documentation
  - [ ] Architecture diagrams updated
  - [ ] Deployment guide (staging environment)
  - [ ] Performance benchmarks
  - [ ] Load test report

**Acceptance Criteria:**
- All tests pass (unit, integration, E2E, load)
- Code coverage ≥80%
- Documentation complete and accurate
- System ready for staging deployment

---

## PHASE 3: Group Chats & Media (Weeks 7-8)

### Phase Goal
Add group chat functionality and media upload support.

### Week 7: Group Chat Support

#### Task 7.1: Group Conversation Management
- **Owner:** Messaging Service Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] `POST /conversations` support for group creation
  - [ ] `PATCH /conversations/:id` endpoint (update name, add/remove members)
  - [ ] `GET /conversations/:id/members` endpoint
  - [ ] Member role management (admin/member)
  - [ ] Admin-only actions (remove members, delete group)
  - [ ] Integration tests

**Acceptance Criteria:**
- Groups created with 2+ members
- Only admins can modify group
- Member list includes role information
- Adding member triggers membership event

#### Task 7.2: Message Broadcasting to Group
- **Owner:** Messaging Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Message delivery to all group members
  - [ ] Skip sender from recipients (they already have message)
  - [ ] Presence check for each member
  - [ ] Parallel delivery (async/await or Promise.all)

**Acceptance Criteria:**
- Message delivered to all group members
- Online members receive via WebSocket instantly
- Offline members receive notification later

#### Task 7.3: Media Service Setup
- **Owner:** Media Service Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Express/Fastify app scaffold
  - [ ] S3/MinIO integration
  - [ ] Health check endpoint

**Acceptance Criteria:**
- Service connects to S3/MinIO
- Can upload and download files
- Health check includes S3 connectivity

#### Task 7.4: File Upload Endpoint
- **Owner:** Media Service Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] `POST /media/upload` endpoint
  - [ ] Multipart form-data parsing
  - [ ] File type validation (JPEG, PNG, PDF, etc.)
  - [ ] File size validation (5MB avatar, 10MB image, 25MB file)
  - [ ] Upload to S3/MinIO
  - [ ] Return URLs (original, thumbnail, medium for images)
  - [ ] Integration tests

**Request:**
```
POST /media/upload
Content-Type: multipart/form-data

file: <binary>
purpose: chat_image
```

**Response:**
```json
{
  "original": "https://cdn.example.com/img-uuid",
  "thumbnail": "https://cdn.example.com/img-uuid-thumb",
  "medium": "https://cdn.example.com/img-uuid-medium"
}
```

**Acceptance Criteria:**
- File uploaded to S3/MinIO
- Validation prevents invalid file types/sizes
- Thumbnails generated for images
- URLs returned immediately

#### Task 7.5: File Delete Endpoint
- **Owner:** Media Service Team
- **Duration:** 0.5 days
- **Deliverables:**
  - [ ] `DELETE /media/:id` endpoint
  - [ ] Delete from S3/MinIO
  - [ ] Return 204 No Content

**Acceptance Criteria:**
- File deleted from S3/MinIO
- Only uploader can delete

#### Task 7.6: Phase 3 Testing
- **Owner:** All teams
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] E2E test: Create group, send message, all members receive
  - [ ] E2E test: Upload image, send in message
  - [ ] Load test: 50 concurrent group conversations
  - [ ] OpenAPI specs for all Phase 3 endpoints

**Acceptance Criteria:**
- Group messaging works end-to-end
- Media uploads and displays correctly
- Code coverage ≥80%

---

### Week 8: Advanced Features

#### Task 8.1: Message Replies & Threading
- **Owner:** Messaging Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] `reply_to` field in messages table
  - [ ] Support reply_to in message creation
  - [ ] Include reply context in message response
  - [ ] Integration tests

**Acceptance Criteria:**
- Replies linked to original message
- Reply context included in API response
- Deleting original doesn't break reply

#### Task 8.2: Message Search
- **Owner:** Messaging Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] `GET /conversations/:id/search?q=keyword` endpoint
  - [ ] Full-text search on message content
  - [ ] Pagination with cursor
  - [ ] Integration tests

**Acceptance Criteria:**
- Search finds messages by content
- Results paginated
- Only conversation members can search

#### Task 8.3: Unread Count & Notifications
- **Owner:** Messaging Service Team + User Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Track unread count per conversation per user
  - [ ] `GET /conversations` includes unread count
  - [ ] Unread count cleared when user opens conversation
  - [ ] Integration tests

**Acceptance Criteria:**
- Unread count accurate
- Returned in conversation list
- Clears when user reads messages

#### Task 8.4: Rate Limiting Per User
- **Owner:** API Gateway Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Per-user rate limiting (not global)
  - [ ] Use Redis for rate limit tracking
  - [ ] 5 messages/sec per user
  - [ ] Return 429 when exceeded

**Acceptance Criteria:**
- Multiple users can each send 5 msg/sec
- Exceeding limit returns 429 with retry-after header

#### Task 8.5: Distributed Tracing & Monitoring
- **Owner:** Infrastructure Engineer
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Structured JSON logging from all services
  - [ ] Log aggregation (ELK or Datadog)
  - [ ] Distributed tracing with `X-Request-Id`
  - [ ] Service-to-service request logging
  - [ ] Performance dashboard

**Acceptance Criteria:**
- All services log in JSON format
- Logs aggregated centrally
- Can trace single user request through all services
- Dashboard shows latency and error rates per service

---

## PHASE 4: Notifications & Polish (Weeks 9-10)

### Phase Goal
Implement push notifications, email notifications, and message delivery/read receipts.

### Week 9: Notification Service

#### Task 9.1: Notification Service Setup
- **Owner:** Notification Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Express/Fastify app scaffold
  - [ ] PostgreSQL `device_tokens` and `notification_preferences` tables
  - [ ] RabbitMQ event consumer setup
  - [ ] Firebase Cloud Messaging (FCM) integration
  - [ ] Web Push API integration

**Acceptance Criteria:**
- Service connects to database and RabbitMQ
- FCM and Web Push clients initialized
- Health check passes

#### Task 9.2: Device Token Management
- **Owner:** Notification Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] `POST /notifications/devices` endpoint (register token)
  - [ ] `DELETE /notifications/devices/:id` endpoint (remove token)
  - [ ] Store device tokens in database
  - [ ] Support multiple devices per user
  - [ ] Integration tests

**Acceptance Criteria:**
- Device tokens stored and retrieved
- Same device registering twice updates (no duplicates)
- Deleted tokens removed

#### Task 9.3: Notification Preferences
- **Owner:** Notification Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] `GET /notifications/preferences` endpoint
  - [ ] `PATCH /notifications/preferences` endpoint
  - [ ] Support: push_enabled, email_enabled, quiet_hours
  - [ ] Integration tests

**Acceptance Criteria:**
- Preferences stored and retrieved
- Quiet hours prevent notifications
- Email/push can be toggled independently

#### Task 9.4: Push Notifications on New Message
- **Owner:** Notification Service Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Listen for `NEW_MESSAGE` event
  - [ ] Fetch recipient's device tokens
  - [ ] Check notification preferences and quiet hours
  - [ ] Send push notification via FCM and Web Push
  - [ ] Notification includes sender name and message preview
  - [ ] Error handling and retry logic
  - [ ] Integration tests

**Acceptance Criteria:**
- Push notification sent for offline users
- Respects quiet hours
- Includes sender name and message preview (max 100 chars)
- Handles failures gracefully (retry with exponential backoff)

#### Task 9.5: Email Notifications
- **Owner:** Notification Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] SMTP configuration (SendGrid or local mailhog in dev)
  - [ ] Email template for new messages
  - [ ] 2-minute delayed email (cancel if user comes online)
  - [ ] Listen for `USER_ONLINE` event to cancel pending emails
  - [ ] Integration tests

**Acceptance Criteria:**
- Email sent for offline users who have email enabled
- Delayed 2 minutes to avoid spamming
- Cancelled if user comes online
- Email includes message preview and reply link

#### Task 9.6: Password Reset Email
- **Owner:** Notification Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Listen for `PASSWORD_RESET_REQUESTED` event
  - [ ] Email template with reset link
  - [ ] Send immediately (not delayed)
  - [ ] Integration tests

**Acceptance Criteria:**
- Email sent to correct address
- Reset link is valid and secure
- Clicking link takes to password reset form

#### Task 9.7: Phase 4 Testing
- **Owner:** Notification Service Team
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] E2E test: Send message, offline user receives push notification
  - [ ] E2E test: Offline user receives delayed email
  - [ ] E2E test: Coming online cancels delayed email
  - [ ] Load test: 100 messages/sec notification delivery
  - [ ] OpenAPI specs

**Acceptance Criteria:**
- Notifications delivered correctly
- Preferences respected
- Code coverage ≥80%

---

### Week 10: Polish & Stability

#### Task 10.1: Advanced Message Features
- **Owner:** Messaging Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Edited messages (track edit history)
  - [ ] Reactions/emojis on messages
  - [ ] Message pinning in conversations
  - [ ] Integration tests

**Acceptance Criteria:**
- Edited messages show "edited" indicator
- Reactions stored and displayed
- Pinned messages queryable

#### Task 10.2: User Blocking & Reporting
- **Owner:** User Service Team
- **Duration:** 1 day
- **Deliverables:**
  - [ ] `POST /users/contacts/:id/block` endpoint already exists
  - [ ] `POST /users/block/:userId` endpoint (block without contact)
  - [ ] `GET /users/blocked` endpoint (list blocked users)
  - [ ] Unblock endpoint
  - [ ] Publish `USER_BLOCKED` event
  - [ ] Integration tests

**Acceptance Criteria:**
- Blocked users can't send messages
- Blocked users can't see profile
- Unblocking re-enables communication

#### Task 10.3: Conversation Archiving
- **Owner:** Messaging Service Team
- **Duration:** 0.5 days
- **Deliverables:**
  - [ ] `PATCH /conversations/:id` endpoint (archive flag)
  - [ ] `GET /conversations?archived=false` to filter

**Acceptance Criteria:**
- Archived conversations hidden by default
- Can still retrieve archived conversations

#### Task 10.4: Performance Optimization
- **Owner:** All teams
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Database query optimization (add missing indexes)
  - [ ] Caching frequently accessed data (Redis)
  - [ ] Connection pooling tuning
  - [ ] Load test: 500 concurrent users
  - [ ] Performance report

**Acceptance Criteria:**
- <100ms p99 latency for REST endpoints
- <200ms p99 latency for WebSocket message delivery
- <50ms p99 latency for Presence Service
- 500 concurrent users supported

#### Task 10.5: Security Audit
- **Owner:** Infrastructure Engineer
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Security audit of all services
  - [ ] Check for OWASP Top 10 vulnerabilities
  - [ ] Input validation and SQL injection prevention
  - [ ] XSS prevention (content-security-policy headers)
  - [ ] CORS configuration review
  - [ ] Dependency vulnerability scan (npm audit)
  - [ ] Secrets management review

**Acceptance Criteria:**
- No critical vulnerabilities
- All dependencies up-to-date
- Security headers configured
- Secrets not logged or exposed

#### Task 10.6: Error Handling & Logging
- **Owner:** All teams
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Consistent error response format
  - [ ] Error codes for all failure scenarios
  - [ ] User-friendly error messages
  - [ ] Internal error logging (stack traces, context)
  - [ ] Error rate monitoring and alerting

**Acceptance Criteria:**
- All errors return consistent JSON format
- Error messages helpful to API consumers
- Logs contain sufficient debugging information
- Alerts trigger on high error rates

#### Task 10.7: Documentation & Runbooks
- **Owner:** Infrastructure Engineer + All teams
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Complete OpenAPI specs for all services
  - [ ] Architecture decision records (ADRs)
  - [ ] Operational runbooks (how to debug, scale, deploy)
  - [ ] Troubleshooting guide
  - [ ] API migration guide (for future versions)

**Acceptance Criteria:**
- Documentation complete and accurate
- Team can operate system without live support
- Onboarding new developer takes <2 hours

---

## PHASE 5: Deployment & Launch (Weeks 11-12)

### Phase Goal
Harden the system, deploy to production, monitor, and iterate.

### Week 11: Production Deployment

#### Task 11.1: Kubernetes Setup
- **Owner:** Infrastructure Engineer
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Kubernetes cluster (managed or self-hosted)
  - [ ] Helm charts for each service
  - [ ] ConfigMaps for configuration
  - [ ] Secrets for credentials (encrypted at rest)
  - [ ] PersistentVolumes for databases
  - [ ] LoadBalancer for API Gateway
  - [ ] Ingress for HTTPS and routing

**Acceptance Criteria:**
- Services deployable to Kubernetes
- Configuration managed via ConfigMaps
- Secrets encrypted and rotated regularly
- Can scale services independently

#### Task 11.2: Database Backups & Recovery
- **Owner:** Database Engineer
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Automated daily backups to S3
  - [ ] Point-in-time recovery capability
  - [ ] Backup verification (restore to staging and test)
  - [ ] Documented recovery procedure

**Acceptance Criteria:**
- Backups taken daily
- Can recover any point in last 30 days
- Recovery time < 1 hour

#### Task 11.3: Monitoring & Alerting
- **Owner:** Infrastructure Engineer
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Prometheus for metrics collection
  - [ ] Grafana dashboards for visualization
  - [ ] AlertManager for alerting
  - [ ] Key metrics: error rate, latency, throughput, CPU, memory
  - [ ] Alert rules (high error rate, service down, etc.)
  - [ ] On-call rotation and escalation

**Acceptance Criteria:**
- Dashboard shows system health
- Alerts fire before user impact
- Alert response documented

#### Task 11.4: Logging Infrastructure
- **Owner:** Infrastructure Engineer
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Centralized log aggregation (ELK or Datadog)
  - [ ] Log retention policy (30 days)
  - [ ] Log searching and filtering
  - [ ] Alert on unusual patterns (e.g., spike in errors)

**Acceptance Criteria:**
- All service logs visible in central location
- Can search logs by timestamp, service, userId, requestId
- Alerts trigger on anomalies

#### Task 11.5: Load Testing & Capacity Planning
- **Owner:** Infrastructure Engineer + Performance Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Load test to 1000 concurrent users
  - [ ] Identify bottlenecks
  - [ ] Document maximum sustainable load
  - [ ] Capacity planning for 6-month growth

**Acceptance Criteria:**
- System handles 1000 concurrent users
- <200ms p99 latency under peak load
- CPU/memory usage within bounds
- Document: current capacity, scaling limits, upgrade plan

#### Task 11.6: Staging & Production Environments
- **Owner:** Infrastructure Engineer
- **Duration:** 1.5 days
- **Deliverables:**
  - [ ] Staging environment (mirrors production)
  - [ ] Production environment
  - [ ] DNS and domain setup
  - [ ] SSL/TLS certificates (Let's Encrypt)
  - [ ] Environment variable management

**Acceptance Criteria:**
- Staging is production clone (same services, separate data)
- All tests pass on staging before deploying to production
- HTTPS working on both environments

#### Task 11.7: CI/CD Pipeline Enhancement
- **Owner:** Infrastructure Engineer
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Automated deployment to staging on every merge to main
  - [ ] Automated tests in CI (unit, integration, E2E)
  - [ ] Automated security scanning (dependency checks, SAST)
  - [ ] Manual approval for production deployments
  - [ ] Automated rollback on deployment failure

**Acceptance Criteria:**
- Staging automatically deploys on code merge
- Production deployments require manual approval
- Failed deployments automatically roll back
- All checks must pass before deployment allowed

---

### Week 12: Launch & Iteration

#### Task 12.1: Pre-Launch Testing
- **Owner:** QA Team
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Final integration test suite
  - [ ] User acceptance testing (UAT)
  - [ ] Smoke tests for production
  - [ ] Disaster recovery drill
  - [ ] Load test spike testing (sudden 10x traffic)

**Acceptance Criteria:**
- All UAT scenarios pass
- System survives 10x traffic spike
- Can recover from database failure <30 min

#### Task 12.2: Operations Handoff
- **Owner:** Infrastructure Engineer + All teams
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Operations guide (how to operate production system)
  - [ ] On-call playbooks (how to respond to common alerts)
  - [ ] Escalation procedures (who to contact for what)
  - [ ] Training for operations team
  - [ ] Emergency contacts

**Acceptance Criteria:**
- Operations team can operate system independently
- On-call team trained on common issues
- Response procedures documented and tested

#### Task 12.3: Launch & Monitoring
- **Owner:** All teams
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Deploy to production
  - [ ] Monitor closely for 24 hours (war room)
  - [ ] Document any issues and resolutions
  - [ ] Update runbooks based on learnings

**Acceptance Criteria:**
- System stable on production
- No critical issues
- Team confident in operations

#### Task 12.4: Post-Launch Optimization
- **Owner:** All teams
- **Duration:** 2 days
- **Deliverables:**
  - [ ] Analyze real-world traffic patterns
  - [ ] Optimize database queries for actual usage
  - [ ] Adjust caching strategy based on hit rates
  - [ ] Fine-tune autoscaling parameters
  - [ ] Performance report

**Acceptance Criteria:**
- P99 latency <150ms
- Error rate <0.1%
- System stable and performant

#### Task 12.5: Feature Iteration & Roadmap
- **Owner:** Product + All teams
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Collect user feedback
  - [ ] Prioritize next phase features
  - [ ] Document Phase 6 roadmap (video calls, voice messages, encryption, etc.)
  - [ ] Plan for next release

**Acceptance Criteria:**
- Feedback collected from initial users
- Roadmap for next 12 weeks defined
- Team energized for next phase

#### Task 12.6: Final Documentation
- **Owner:** All teams
- **Duration:** 1 day
- **Deliverables:**
  - [ ] Architecture decision records (why we chose each tech)
  - [ ] Lessons learned document
  - [ ] Known limitations and future improvements
  - [ ] Cost analysis (cloud spending)

**Acceptance Criteria:**
- Future team can understand why decisions were made
- Known issues tracked and prioritized
- Cost baseline established

---

## Summary: Complete Deliverables by Phase

### Phase 1: Foundation (Weeks 1-3)
✅ Git + CI/CD pipeline  
✅ Shared libraries (middleware, events, utils)  
✅ Database infrastructure  
✅ Auth Service (register, login, refresh, logout)  
✅ User/Profile Service (profiles, contacts)  
✅ API Gateway with JWT validation  
✅ 80% test coverage  

### Phase 2: Real-Time Messaging (Weeks 4-6)
✅ Presence Service (<10ms SLA)  
✅ Messaging Service (direct messages, conversation history)  
✅ WebSocket support (message routing, typing indicators)  
✅ E2E one-to-one messaging  
✅ Load testing (100 concurrent users)  

### Phase 3: Group Chats & Media (Weeks 7-8)
✅ Group chat support (create, add/remove members)  
✅ Media Service (upload, compress, serve)  
✅ Group message broadcasting  
✅ Message replies and threading  
✅ Message search functionality  

### Phase 4: Notifications & Polish (Weeks 9-10)
✅ Notification Service (push + email)  
✅ Device token management  
✅ Notification preferences (quiet hours, etc.)  
✅ Message delivery/read receipts  
✅ User blocking and reporting  
✅ Performance optimization (500 concurrent users)  
✅ Security audit (OWASP Top 10)  

### Phase 5: Deployment (Weeks 11-12)
✅ Kubernetes setup  
✅ Database backups & recovery  
✅ Monitoring (Prometheus + Grafana)  
✅ Log aggregation (ELK/Datadog)  
✅ Production deployment  
✅ Load testing to 1000 concurrent users  
✅ Operations and on-call procedures  

---

## Team Structure & Assignments

| Role | Responsibility | Team Size |
|------|---|---|
| **Project Lead** | Overall timeline, blockers, communication | 1 |
| **Auth Service Team** | Authentication, JWT, registration, login | 1-2 |
| **User Service Team** | Profiles, contacts, blocking, search | 1 |
| **Messaging Service Team** | Conversations, messages, history, delivery | 2 |
| **Presence Service Team** | Online status, typing, performance | 1 |
| **Notification Service Team** | Push, email, preferences | 1 |
| **Media Service Team** | Uploads, compression, CDN | 1 |
| **API Gateway Team** | Routing, WebSocket, JWT validation | 1 |
| **Infrastructure Team** | Databases, deployment, monitoring, security | 2 |
| **QA/Testing** | E2E tests, load tests, UAT | 1 |

**Total:** 12 people

---

## Risk Mitigation

### Risks & Mitigation Strategies

| Risk | Impact | Mitigation |
|---|---|---|
| WebSocket scalability issues | High | Early load testing (Week 6), use Redis Pub/Sub (Week 6) |
| Database performance under load | High | Query optimization (Week 10), indexing (Week 10) |
| Event message broker bottleneck | Medium | Early capacity testing, circuit breakers (Phase 2) |
| Notification delivery failures | Medium | Retry logic with exponential backoff, dead-letter queue |
| Team members unavailable | Medium | Cross-training, documentation, runbooks |
| Scope creep | Medium | Strict phase gates, defer Phase 6 features |
| Security vulnerabilities | Medium | Security audit (Week 10), dependency scanning |

---

## Success Metrics

By end of Phase 5, the system should deliver:

- ✅ **Functionality:** All core features working (messaging, presence, notifications)
- ✅ **Performance:** <200ms p99 latency, 1000 concurrent users
- ✅ **Reliability:** 99.9% uptime, <0.1% error rate
- ✅ **Security:** Zero critical vulnerabilities, OWASP compliant
- ✅ **Operations:** Team can operate system independently
- ✅ **Documentation:** Complete and maintainable
- ✅ **Cost:** Acceptable cloud spending, <$5k/month

---

**Plan Created:** April 20, 2026  
**Status:** Ready for team assignments  
**Next Step:** Assign teams to services and start Phase 1 Week 1
