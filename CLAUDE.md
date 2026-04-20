# MessageMesh — Development Context

## Project Overview

MessageMesh is a real-time chat microservices application with 7 independent services communicating via REST APIs, WebSockets, and event-driven messaging.

## Quick Facts

- **Tech Stack:** Node.js (Express/Fastify), PostgreSQL, Redis, RabbitMQ, Docker
- **Architecture:** Microservices (API Gateway + 6 services)
- **Key Features:** Real-time messaging, presence tracking, group chats, media uploads, push notifications
- **Documentation:** See `PROJECT_SPECIFICATION.md` for complete guide

## Service Ownership

Each service has clear ownership and contracts:

1. **Auth Service** — Registration, login, JWT tokens
2. **User/Profile Service** — Profiles, contacts, blocking
3. **Messaging Service** — Conversations, messages, delivery
4. **Presence Service** — Online status, typing indicators (Redis-backed, <10ms SLA)
5. **Notification Service** — Push notifications, emails (event-driven)
6. **Media Service** — Image/file uploads, compression, CDN
7. **API Gateway** — Routing, auth validation, WebSocket management

## Database Per Service

- **PostgreSQL:** Auth, User/Profile, Messaging, Notification
- **Redis:** Presence (required for <10ms latency)
- **No shared databases** — services communicate via REST or events

## Key Constraints

- **Presence Service <10ms SLA:** Use Redis, not PostgreSQL
- **Message-driven design:** All cross-service side effects via RabbitMQ events
- **No direct DB access:** Services call each other's APIs
- **JWT stateless:** Access tokens valid 15 min, refresh tokens 7 days

## Event-Driven Communication

Use RabbitMQ for:
- `USER_REGISTERED` → User/Profile creates default profile
- `NEW_MESSAGE` → Notification sends push to offline users
- `USER_BLOCKED` → Messaging prevents message delivery
- `USER_ONLINE` → Notification cancels pending delay emails

REST APIs for:
- Immediate data needs (e.g., Messaging Service checking if user is online)
- CRUD operations within a service's domain

## Development Workflow

```bash
# Local setup
docker-compose up  # All services, DBs, Redis, RabbitMQ

# Each service team
cd services/[service-name]
npm install
npm run dev
```

## Testing Requirements

- Unit tests: 80% coverage minimum
- Integration tests: All endpoints
- E2E: Critical user flows
- Load tests: Presence and Messaging services

## Deployment

- **Development:** Docker Compose
- **Production:** Kubernetes with horizontal scaling

## Important Implementation Notes

1. **Auth:** bcrypt 12 rounds, JWT payload = {userId, email, iat, exp} only
2. **Messaging:** Composite index on (conversation_id, created_at DESC) for chat history
3. **Presence:** TTL 300s on Redis key, client heartbeat every 60s
4. **Media:** Upload separate CDN domain to prevent XSS
5. **Rate limiting:** Apply at API Gateway, not individual services
6. **Logging:** Structured JSON with requestId for tracing

## Monitoring

- ELK stack or Datadog for centralized logs
- `X-Request-Id` propagation across all services
- Health checks: `GET /health` from every service
- Alerts: >1% error rate, Presence response >50ms, queue depth >10k

## Phases

1. Auth + User/Profile + Gateway (Weeks 1–3)
2. Messaging + Presence + WebSocket (Weeks 4–6)
3. Group chats + Media (Weeks 7–8)
4. Notifications + Receipts + Typing (Weeks 9–10)
5. Polish + Security + Deploy (Weeks 11–12)

---

**Team:** Multiple service owners  
**Status:** Foundation phase (structure and spec complete)
**Next:** Assign teams, write OpenAPI specs per service
