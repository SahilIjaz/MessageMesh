# MessageMesh API Endpoints

## Auth Service (Port 3001)

### Register User
```
POST /auth/register
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response (201):
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Validation Rules:
- Email: Valid email format
- Password: Min 8 chars, uppercase, lowercase, numbers
```

### Login
```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Error (401):
{
  "code": "AUTH_FAILED",
  "message": "Invalid email or password"
}
```

### Refresh Token
```
POST /auth/refresh
Content-Type: application/json

Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response (200):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Error (401):
{
  "code": "INVALID_REFRESH_TOKEN",
  "message": "Invalid refresh token"
}
```

### Logout
```
POST /auth/logout
Authorization: Bearer {accessToken}

Response (200):
{
  "message": "Logged out successfully"
}

Errors:
- 401: Missing or invalid token
```

### Health Check
```
GET /health

Response (200):
{
  "status": "healthy",
  "service": "auth-service",
  "timestamp": "2026-04-20T10:30:00.000Z"
}
```

---

## User Service (Port 3002)

**All endpoints require JWT token in Authorization header**

### Create Profile
```
POST /profile
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "bio": "Software engineer",
  "phone": "+1234567890",
  "avatarUrl": "https://example.com/avatar.jpg"
}

Response (201):
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "bio": "Software engineer",
  "avatar_url": "https://example.com/avatar.jpg",
  "phone": "+1234567890",
  "status": "active",
  "preferences": {},
  "created_at": "2026-04-20T10:30:00.000Z",
  "updated_at": "2026-04-20T10:30:00.000Z"
}

Error (409):
{
  "code": "PROFILE_EXISTS",
  "message": "User profile already exists"
}
```

### Get Profile
```
GET /profile
Authorization: Bearer {accessToken}

Response (200):
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  ...
}

Error (404):
{
  "code": "PROFILE_NOT_FOUND",
  "message": "User profile not found"
}
```

### Update Profile
```
PUT /profile
Authorization: Bearer {accessToken}
Content-Type: application/json

Request (all fields optional):
{
  "firstName": "Jane",
  "bio": "New bio",
  "avatarUrl": null
}

Response (200):
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  ...
  "first_name": "Jane",
  "updated_at": "2026-04-20T10:35:00.000Z"
}
```

### Search Users
```
GET /search?q={query}&limit=20&offset=0
Authorization: Bearer {accessToken}

Response (200):
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "first_name": "Jane",
      "last_name": "Doe",
      "email": "jane@example.com",
      "avatar_url": "...",
      ...
    }
  ],
  "limit": 20,
  "offset": 0
}

Query Parameters:
- q: Search query (min 2 chars) - searches first_name, last_name, email
- limit: Results per page (default 20)
- offset: Pagination offset (default 0)
```

### Send Connection Request
```
POST /connections/request
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "connectedUserId": "550e8400-e29b-41d4-a716-446655440001"
}

Response (201):
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "connected_user_id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "pending",
  "requested_at": "2026-04-20T10:30:00.000Z"
}

Errors:
- 400: Cannot connect with yourself
- 403: Blocked by user
- 404: User not found
- 409: Already connected
```

### Accept Connection Request
```
POST /connections/accept
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "connectedUserId": "550e8400-e29b-41d4-a716-446655440001"
}

Response (200):
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "connected_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "accepted",
  "accepted_at": "2026-04-20T10:35:00.000Z"
}
```

### Get Connections
```
GET /connections?status=accepted&limit=50&offset=0
Authorization: Bearer {accessToken}

Response (200):
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "first_name": "Jane",
      "last_name": "Doe",
      ...
      "accepted_at": "2026-04-20T10:35:00.000Z"
    }
  ],
  "limit": 50,
  "offset": 0
}

Query Parameters:
- status: 'accepted' or 'pending' (default: accepted)
- limit: Results per page (default 50)
- offset: Pagination offset (default 0)
```

### Get Pending Connection Requests
```
GET /connections/pending?limit=50&offset=0
Authorization: Bearer {accessToken}

Response (200):
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "first_name": "Jane",
      "last_name": "Doe",
      ...
      "request_id": "550e8400-e29b-41d4-a716-446655440002",
      "requested_at": "2026-04-20T10:30:00.000Z"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

### Block User
```
POST /connections/block
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "blockedUserId": "550e8400-e29b-41d4-a716-446655440001"
}

Response (200):
{
  "status": "blocked"
}

Errors:
- 400: Cannot block yourself
```

### Health Check
```
GET /health

Response (200):
{
  "status": "healthy",
  "service": "user-service",
  "timestamp": "2026-04-20T10:30:00.000Z"
}
```

---

## Message Service (Port 3003)

**All endpoints require JWT token in Authorization header**

### Send Message
```
POST /messages/send
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "recipientId": "550e8400-e29b-41d4-a716-446655440001",
  "content": "Hello, this is a message!"
}

Response (201):
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440003",
  "sender_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Hello, this is a message!",
  "status": "sent",
  "created_at": "2026-04-20T10:30:00.000Z",
  "updated_at": "2026-04-20T10:30:00.000Z"
}

Errors:
- 400: Cannot send message to yourself
- 404: Recipient not found
```

### Get Message History
```
GET /messages/history?recipientId={id}&limit=50&offset=0
Authorization: Bearer {accessToken}

Response (200):
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "conversation_id": "550e8400-e29b-41d4-a716-446655440003",
      "sender_id": "550e8400-e29b-41d4-a716-446655440000",
      "content": "Hello, this is a message!",
      "status": "read",
      "delivered_at": "2026-04-20T10:30:10.000Z",
      "read_at": "2026-04-20T10:30:20.000Z",
      "created_at": "2026-04-20T10:30:00.000Z"
    }
  ],
  "limit": 50,
  "offset": 0,
  "total": 42
}

Query Parameters:
- recipientId: UUID of conversation partner (required)
- limit: Results per page (default 50, max 100)
- offset: Pagination offset (default 0)
```

### Update Message Status
```
PUT /messages/status
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "messageId": "550e8400-e29b-41d4-a716-446655440005",
  "status": "delivered"
}

Response (200):
{
  "status": "updated"
}

Status Values:
- delivered: Mark message as delivered to recipient
- read: Mark message as read by recipient

Errors:
- 404: Message not found
- 400: Cannot update status of your own message
```

### Get Conversations
```
GET /messages/conversations?limit=50&offset=0
Authorization: Bearer {accessToken}

Response (200):
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "user_id_1": "550e8400-e29b-41d4-a716-446655440000",
      "user_id_2": "550e8400-e29b-41d4-a716-446655440001",
      "created_at": "2026-04-20T10:30:00.000Z",
      "updated_at": "2026-04-20T10:35:00.000Z"
    }
  ],
  "limit": 50,
  "offset": 0
}

Query Parameters:
- limit: Results per page (default 50, max 100)
- offset: Pagination offset (default 0)
```

### Health Check
```
GET /health

Response (200):
{
  "status": "healthy",
  "service": "message-service",
  "timestamp": "2026-04-20T10:30:00.000Z"
}
```

---

## API Gateway (Port 3000)

### Gateway Health Check
```
GET /health

Response (200):
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2026-04-20T10:30:00.000Z"
}
```

### Request Flow

All requests through the gateway are processed as follows:

1. **Rate Limiting** — 100 requests per 60 seconds per client
2. **Request ID Generation** — `X-Request-Id` UUID header added
3. **Authentication** — For protected routes, JWT validation required
4. **Service Routing** — Request proxied to appropriate service
5. **Response Normalization** — Consistent error formats returned

### Headers

**Request Headers:**
```
X-Request-Id: {uuid}          # Auto-generated by gateway
Authorization: Bearer {token}  # Required for protected routes
Content-Type: application/json
```

**Response Headers:**
```
X-Request-Id: {uuid}          # Traced across all services
Content-Type: application/json
```

### Error Responses

**400 Bad Request:**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Detailed validation error message"
}
```

**401 Unauthorized:**
```json
{
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid authentication token"
}
```

**403 Forbidden:**
```json
{
  "code": "FORBIDDEN",
  "message": "Token has expired"
}
```

**404 Not Found:**
```json
{
  "code": "NOT_FOUND",
  "message": "Endpoint not found"
}
```

**429 Too Many Requests:**
```json
{
  "code": "RATE_LIMITED",
  "message": "Too many requests"
}
```

**503 Service Unavailable:**
```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Service temporarily unavailable"
}
```

---

## Token Details

### Access Token
- **Expiry:** 15 minutes
- **Used for:** API requests
- **Refresh:** Via `/auth/refresh` endpoint

### Refresh Token
- **Expiry:** 7 days
- **Used for:** Getting new access tokens
- **Rotation:** New refresh token issued on each refresh
- **Storage:** Secure httpOnly cookie or local storage (user's choice)

---

## Testing Endpoints

### cURL Examples

**Register:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

**Get Profile (requires token):**
```bash
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Search Users:**
```bash
curl -X GET "http://localhost:3000/users/search?q=john&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Postman Collection

A Postman collection is available at `docs/postman/MessageMesh.postman_collection.json`

Import into Postman and use the `{{baseUrl}}` variable (default: http://localhost:3000)

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All endpoints | 100 req | 60 sec |
| Auth register | Built-in validation | - |
| Auth login | Built-in validation | - |

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Token expired |
| 404 | Not Found - Endpoint/resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 503 | Service Unavailable - Dependent service down |

---

**Last Updated:** April 20, 2026
