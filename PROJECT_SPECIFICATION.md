# Chat Application — Microservices Project Specification

## Document Version: 1.0 | Date: April 20, 2026

---

## 1. Project Overview

We are building a real-time chat application using a microservices architecture. The application will support one-to-one messaging, group chats, real-time presence tracking, media sharing, and push notifications. The system is designed for horizontal scalability, fault tolerance, and independent deployability of each service.

**Target platforms:** Web (React), Mobile (React Native or Flutter — team's choice).
**Backend communication:** REST for CRUD operations, WebSockets for real-time features, and RabbitMQ/Kafka for inter-service event-driven messaging.

---

## 2. System Architecture

**Entry Point:** All client requests hit the API Gateway. The gateway handles SSL termination, authentication token validation, request routing, rate limiting, and WebSocket connection management.

**Inter-service communication follows two patterns:**
- **Synchronous REST calls** are used when a service needs an immediate response from another service — for example, the Messaging Service asking the Presence Service whether a user is online.
- **Asynchronous event-based communication** via a message broker is used for side effects that don't need an immediate response — for example, publishing a `MESSAGE_SENT` event that the Notification Service reacts to independently.

**Each service owns its own database.** No service directly accesses another service's database. If Service A needs data from Service B, it calls Service B's API. This is non-negotiable.

---

## 3. Tech Stack Recommendations

| Component | Technology | Rationale |
|---|---|---|
| API Gateway | Kong or Express + http-proxy-middleware | Handles routing, auth, rate limiting, WebSocket |
| Service Runtime | Node.js (Express/Fastify) | Fast development, JavaScript ecosystem |
| Relational DB | PostgreSQL | Auth, User/Profile, Messaging services |
| Cache/Session | Redis | Presence Service (sub-millisecond reads) |
| Document DB | MongoDB (optional) | Alternative for Messaging if document-based preferred |
| Message Broker | RabbitMQ (or Kafka) | Event-driven inter-service communication |
| File Storage | AWS S3 or Cloudinary | Media Service for images and files |
| Containerization | Docker + Docker Compose | Local dev environment, production deployment |
| Orchestration | Kubernetes (optional) | Production scaling beyond single server |
| Authentication | JWT (access + refresh tokens) | Stateless, scalable authentication |

---

## 4. Service-by-Service Specification

### 4.1 Auth Service

**Responsibility:** User registration, login, token issuance, token refresh, password reset, and OAuth login.

**Database: PostgreSQL — Table `users_auth`**

```sql
CREATE TABLE users_auth (
  id UUID PRIMARY KEY,
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

**API Endpoints:**

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Authenticate user | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Invalidate refresh token | Yes |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| GET | `/auth/oauth/google` | OAuth2 redirect | No |
| GET | `/auth/oauth/google/callback` | OAuth2 callback | No |

**Key Implementation Details:**

- Password hashing: bcrypt with minimum 12 rounds
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days
- JWT payload: `{ userId, email, iat, exp }` — no sensitive data
- Refresh token rotation: invalidate old token on refresh, issue new one

**Events Published:**
- `USER_REGISTERED` → User/Profile Service creates default profile
- `PASSWORD_RESET_REQUESTED` → Notification Service sends reset email

---

### 4.2 User/Profile Service

**Responsibility:** User profiles, display names, avatars, contact lists, and user search.

**Database: PostgreSQL**

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
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_user_id UUID NOT NULL,
  nickname VARCHAR(100),
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contact_user_id)
);

CREATE INDEX idx_user_id ON contacts(user_id);
```

**API Endpoints:**

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/users/me` | Get authenticated user's profile | Yes |
| PATCH | `/users/me` | Update own profile | Yes |
| GET | `/users/:userId` | Get public profile | Yes |
| GET | `/users/search?q=keyword` | Search users | Yes |
| POST | `/users/contacts` | Add contact | Yes |
| GET | `/users/contacts` | List contacts with online status | Yes |
| DELETE | `/users/contacts/:contactId` | Remove contact | Yes |
| POST | `/users/contacts/:contactId/block` | Block user | Yes |

**Events Consumed:**
- `USER_REGISTERED` → Creates default profile

**Events Published:**
- `USER_BLOCKED` → Messaging Service blocks message delivery

---

### 4.3 Messaging Service

**Responsibility:** Message storage, conversation management (direct & group), chat history, message delivery.

**Database: PostgreSQL**

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  type ENUM ('direct', 'group') NOT NULL,
  name VARCHAR(200),
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversation_members (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL,
  role ENUM ('admin', 'member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
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

**API Endpoints:**

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/conversations` | Create new conversation | Yes |
| GET | `/conversations` | List conversations (chat list) | Yes |
| GET | `/conversations/:conversationId/messages` | Get message history | Yes |
| POST | `/conversations/:conversationId/messages` | Send message | Yes |
| PATCH | `/conversations/:conversationId/messages/:messageId/status` | Update message status | Yes |
| DELETE | `/conversations/:conversationId/messages/:messageId` | Delete message | Yes |

**WebSocket Events:**

```
Received by service:
  - message:send
  - message:typing
  - message:read

Emitted to clients:
  - message:new
  - message:status_update
  - message:deleted
```

**Critical Logic for `POST /conversations/:conversationId/messages`:**
1. Validate sender is conversation member
2. Check sender is not blocked by recipient (User/Profile Service)
3. Store message with status `sent`
4. Check recipient online status (Presence Service)
5. If online: push via WebSocket
6. If offline: publish `NEW_MESSAGE` event
7. Return created message

**Events Published:**
- `MESSAGE_SENT`
- `NEW_MESSAGE` (for offline users)

**Events Consumed:**
- `USER_BLOCKED` → Block message delivery

---

### 4.4 Presence Service

**Responsibility:** Track online/offline status, last seen time, typing indicators. **CRITICAL: Must respond in <10ms.**

**Database: Redis (not PostgreSQL)**

```
Key structure:
  presence:{userId} → Hash{status, lastSeen, socketId} [TTL: 300s]
  typing:{conversationId}:{userId} → "true" [TTL: 3s]
```

**API Endpoints (Internal only):**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/presence/:userId` | Get user online status |
| GET | `/presence/bulk?userIds=id1,id2,id3` | Get status for multiple users |
| POST | `/presence/:userId/online` | Mark user online |
| POST | `/presence/:userId/offline` | Mark user offline |
| POST | `/presence/:userId/typing` | Set typing indicator (3s TTL) |

**Performance SLA:** All endpoints must respond in <10ms (99th percentile).

**Events Published:**
- `USER_ONLINE`
- `USER_OFFLINE`

---

### 4.5 Notification Service

**Responsibility:** Push notifications (FCM for mobile, Web Push for browsers) and email notifications. **Entirely event-driven.**

**Database: PostgreSQL**

```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  token VARCHAR(500) NOT NULL,
  platform ENUM ('ios', 'android', 'web') NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME
);

CREATE INDEX idx_user_id ON device_tokens(user_id);
```

**API Endpoints:**

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/notifications/devices` | Register device token | Yes |
| DELETE | `/notifications/devices/:tokenId` | Remove device token | Yes |
| GET | `/notifications/preferences` | Get preferences | Yes |
| PATCH | `/notifications/preferences` | Update preferences | Yes |

**Events Consumed:**
- `NEW_MESSAGE` → Send push notification
- `PASSWORD_RESET_REQUESTED` → Send reset email
- `USER_ONLINE` → Cancel pending delayed emails

---

### 4.6 Media Service

**Responsibility:** File/image uploads, validation, compression, thumbnail generation, cloud storage.

**No persistent database** — metadata stored by calling service (Messaging/Profile).

**API Endpoints:**

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/media/upload` | Upload file/image | Yes |
| DELETE | `/media/:mediaId` | Delete file | Yes |

**Upload Validation:**

| Purpose | Max Size | Allowed Types |
|---|---|---|
| avatar | 5MB | JPEG, PNG, WebP, GIF |
| chat_image | 10MB | JPEG, PNG, WebP, GIF |
| chat_file | 25MB | PDF, DOCX, XLSX, ZIP, TXT |

**Processing Pipeline:**
1. Validate file type and size
2. For images: compress (80% quality), generate thumbnail (200x200), medium version (800px)
3. Upload to S3/Cloudinary
4. Return URLs: `{ original, thumbnail, medium }`

**Security:** Use separate CDN domain to prevent XSS attacks from uploaded files.

---

## 5. Event Catalog

Complete event flow through message broker:

| Event | Publisher | Consumers | Payload |
|---|---|---|---|
| USER_REGISTERED | Auth | User/Profile | `{ userId, email }` |
| PASSWORD_RESET_REQUESTED | Auth | Notification | `{ userId, email, resetToken }` |
| USER_BLOCKED | User/Profile | Messaging | `{ blockerId, blockedUserId }` |
| MESSAGE_SENT | Messaging | Analytics | `{ messageId, conversationId, senderId }` |
| NEW_MESSAGE | Messaging | Notification | `{ messageId, conversationId, senderId, recipientIds[], preview }` |
| USER_ONLINE | Presence | Notification | `{ userId, timestamp }` |
| USER_OFFLINE | Presence | Analytics | `{ userId, lastSeen }` |

---

## 6. WebSocket Connection Lifecycle

**Establishment:**
1. Client connects to `wss://api.yourapp.com/ws` with JWT in query param or first message
2. Gateway validates token, extracts userId
3. Gateway calls `POST /presence/{userId}/online`
4. Connection registered in gateway's in-memory map

**Heartbeat:**
- Client sends `ping` frame every 60 seconds
- Gateway responds with `pong`, refreshes Presence TTL
- No ping for 120s → gateway closes connection

**Disconnection:**
- Gateway calls `POST /presence/{userId}/offline`
- Removes from connection map

**Multi-gateway routing:**
- Use Redis Pub/Sub channel `user:{userId}` for message delivery
- All instances subscribe to all channels
- Instance holding user's WebSocket pushes message to client

---

## 7. Security Requirements

**Authentication:**
- Every request (except auth endpoints) requires valid JWT in `Authorization: Bearer <token>`
- API Gateway validates, passes userId via `X-User-Id` header
- Services trust the gateway — never re-validate JWTs

**Encryption:**
- All communication over HTTPS/WSS
- Messages encrypted at rest with AES-256
- End-to-end encryption: phase 2 feature

**Rate Limiting (at API Gateway):**
- Message sending: 5 requests/second
- Registration: 3 requests/minute
- Login: 10 requests/minute (brute force protection)

**Input Validation:**
- Validate and sanitize all inputs (Joi/Zod)
- Never trust external service data
- Validate at service boundaries

---

## 8. Development Workflow

**Local Setup:**
```bash
docker-compose up  # Starts all services, DBs, Redis, RabbitMQ
```

**Repository Structure:**
```
/chat-app
  /services
    /auth-service
    /user-service
    /messaging-service
    /presence-service
    /notification-service
    /media-service
    /api-gateway
  /shared
    /middleware
    /events
    /utils
  /infra
    /docker-compose.yml
    /k8s
  /docs
    /api-specs
```

**Testing Expectations:**
- Unit tests: 80% coverage minimum
- Integration tests: All service endpoints
- E2E tests: Critical flows (register → login → send message)
- Load tests: Presence and Messaging services (k6, Artillery)

**API Documentation:**
- Each service team writes OpenAPI/Swagger spec before implementation
- Spec serves as contract between teams

---

## 9. Phased Delivery Plan

**Phase 1 (Weeks 1–3):** Auth + User/Profile + API Gateway
- Users can register, log in, update profiles, add contacts

**Phase 2 (Weeks 4–6):** Messaging + Presence + WebSocket
- Real-time one-to-one messaging, online/offline status

**Phase 3 (Weeks 7–8):** Group chats + Media Service
- Group messaging, image/file uploads

**Phase 4 (Weeks 9–10):** Notifications + Delivery receipts + Typing indicators
- Complete notification system, message status tracking

**Phase 5 (Weeks 11–12):** Polish, load testing, security audit, deployment

---

## 10. Monitoring and Observability

**Centralized Logging:**
- Structured JSON logs from all services
- ELK stack or Datadog
- Every log: `{ timestamp, service, requestId, userId, level, message }`

**Distributed Tracing:**
- API Gateway generates unique `X-Request-Id` per request
- All services pass this ID downstream
- Trace single action across all services

**Health Checks:**
- Every service: `GET /health` → `{ status, database, broker }`
- Used by gateway and orchestrator

**Alerting Thresholds:**
- Any service: >1% error rate over 5 minutes
- Presence Service: response time >50ms
- Message broker: queue depth >10,000
- Any service: health check failing

---

## 11. Database Schema Summary

### PostgreSQL Services

**Auth Service:**
- `users_auth` (id, email, password_hash, refresh_token, oauth_*, is_verified, timestamps)

**User/Profile Service:**
- `profiles` (user_id, display_name, avatar_url, status_message, phone, timestamps)
- `contacts` (id, user_id, contact_user_id, nickname, is_blocked, created_at)

**Messaging Service:**
- `conversations` (id, type, name, created_by, timestamps)
- `conversation_members` (id, conversation_id, user_id, role, joined_at, left_at)
- `messages` (id, conversation_id, sender_id, content, type, media_url, status, reply_to, timestamps)

**Notification Service:**
- `device_tokens` (id, user_id, token, platform, is_active, created_at)
- `notification_preferences` (user_id, push_enabled, email_enabled, quiet_hours_*, timestamps)

### Redis (Presence Service)

- `presence:{userId}` → Hash with status, lastSeen, socketId [TTL: 300s]
- `typing:{conversationId}:{userId}` → "true" [TTL: 3s]

---

## 12. Deployment Architecture

**Development:** Docker Compose locally
**Staging:** Docker containers on single server with persistent volumes
**Production:** Kubernetes cluster with:
- Separate deployments per service
- Horizontal Pod Autoscaling based on CPU/memory
- StatefulSet for Redis (Presence Service)
- ConfigMaps for configuration
- Secrets for credentials
- Persistent volumes for databases

---

## Next Steps

1. **Create team assignments:** Assign each team a service
2. **Write OpenAPI specs:** Before any code
3. **Set up monorepo:** Create directory structure
4. **Docker Compose:** Build local dev environment
5. **Shared libraries:** Implement middleware, error handling, event utilities
6. **Begin Phase 1:** Auth and User/Profile teams start simultaneously

---

**Document Owner:** Project Lead  
**Last Updated:** April 20, 2026  
**Next Review:** After Phase 1 completion
