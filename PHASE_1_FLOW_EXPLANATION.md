# MessageMesh Phase 1: Complete User Flow & Architecture

This document explains what happens behind the scenes when users interact with MessageMesh in Phase 1. Follow along with real API calls and database operations.

---

## 1. USER REGISTRATION FLOW

### User Action: Sign Up
User opens app and submits registration form with **email** and **password**.

### HTTP Request
```
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "MyPassword123!"
}
```

### Behind the Scenes: Step-by-Step

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. REQUEST ENTERS API GATEWAY (Port 3000)                       │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Request ID Generated (X-Request-Id header added for tracing)
   ├─ Rate Limiter checked (100 req/min limit)
   └─ Request forwarded to Auth Service (Port 3001)
   
┌─────────────────────────────────────────────────────────────────┐
│ 2. AUTH SERVICE RECEIVES REQUEST (Port 3001)                    │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Input Validation (Joi schema):
   │  ├─ Email format valid? ✓
   │  ├─ Password strong enough? (8+ chars, uppercase, lowercase, number) ✓
   │  └─ If validation fails → Return 400 error
   │
   ├─ Database Check:
   │  └─ Query: SELECT * FROM users_auth WHERE email = 'john@example.com'
   │     └─ Email exists? → Return 409 "Email already registered"
   │
   ├─ Password Hashing (bcryptjs, 12 rounds):
   │  └─ Input: "MyPassword123!"
   │  └─ Output: "$2b$12$..." (hashed, salted, 60 chars)
   │
   ├─ Database Insert:
   │  └─ INSERT INTO users_auth (id, email, password_hash, created_at)
   │     VALUES ('550e8400-e29b-41d4-a716-446655440000', 'john@example.com', '$2b$12$...', NOW())
   │
   ├─ Token Generation:
   │  ├─ Access Token (JWT, expires in 15 minutes):
   │  │  └─ Payload: {userId: '550e8400-...', email: 'john@example.com', exp: 1234567890}
   │  │  └─ Signed with SECRET_KEY
   │  │
   │  └─ Refresh Token (JWT, expires in 7 days):
   │     └─ Payload: {userId: '550e8400-...', exp: 1234567890}
   │     └─ Signed with REFRESH_SECRET
   │
   ├─ Store Refresh Token in Database:
   │  └─ UPDATE users_auth SET refresh_token = 'eyJhbGc...' WHERE id = '550e8400-...'
   │
   └─ Publish Event to RabbitMQ:
      └─ EVENT: USER_REGISTERED
         ├─ userId: '550e8400-...'
         ├─ email: 'john@example.com'
         └─ timestamp: 2026-04-21T10:30:00Z
         
         This event goes to User Service's message queue
         
┌─────────────────────────────────────────────────────────────────┐
│ 3. USER SERVICE RECEIVES EVENT (Port 3002)                      │
└─────────────────────────────────────────────────────────────────┘
   │
   └─ Event Consumer processes: USER_REGISTERED
      │
      └─ DATABASE INSERT:
         └─ INSERT INTO user_profiles (id, user_id, created_at)
            VALUES ('xxxxxxxx', '550e8400-...', NOW())
            
         This creates an empty profile for the new user

┌─────────────────────────────────────────────────────────────────┐
│ 4. RESPONSE SENT BACK TO CLIENT                                 │
└─────────────────────────────────────────────────────────────────┘
   
   HTTP 201 Created
   {
     "userId": "550e8400-e29b-41d4-a716-446655440000",
     "email": "john@example.com",
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
```

### Database Changes After Registration

**Table: users_auth** (Auth Service DB)
```
id                                    | email               | password_hash            | refresh_token
550e8400-e29b-41d4-a716-446655440000  | john@example.com    | $2b$12$...(60 chars)... | eyJhbGc...(JWT)...
```

**Table: user_profiles** (User Service DB)
```
id                  | user_id                               | first_name | last_name | ...
550e8400-xxx-yyy    | 550e8400-e29b-41d4-a716-446655440000 | NULL       | NULL      | ...
```

---

## 2. USER LOGIN FLOW

### User Action: Log In
User submits email + password on login screen.

### HTTP Request
```
POST http://localhost:3000/auth/login
{
  "email": "john@example.com",
  "password": "MyPassword123!"
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: REQUEST REACHES AUTH SERVICE                            │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Input validation (email + password present)
   │
   ├─ Database query:
   │  └─ SELECT * FROM users_auth WHERE email = 'john@example.com'
   │     └─ Returns user record with password_hash
   │
   ├─ Password comparison (bcryptjs.compare):
   │  ├─ Input password: "MyPassword123!"
   │  ├─ Stored hash: "$2b$12$..."
   │  ├─ bcryptjs verifies: Match? ✓ YES → Proceed
   │  │                     Match? ✗ NO  → Return 401 "Invalid credentials"
   │
   ├─ Generate new tokens:
   │  ├─ Access Token (15 min expiry)
   │  └─ Refresh Token (7 days expiry)
   │
   ├─ Update database:
   │  └─ UPDATE users_auth SET refresh_token = 'new-jwt-here' WHERE id = '550e8400-...'
   │
   └─ Return tokens to client
```

### Response
```
HTTP 200 OK
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 3. CREATE USER PROFILE FLOW

### User Action: Complete Profile
User fills in first name, last name, bio, and uploads avatar.

### HTTP Request
```
POST http://localhost:3000/users/profile
Authorization: Bearer <accessToken>
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "bio": "Software engineer",
  "phone": "+1-555-1234",
  "avatarUrl": "https://cdn.example.com/john.jpg"
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: API GATEWAY VALIDATES JWT                               │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Extract token from Authorization header
   ├─ Verify signature with SECRET_KEY
   ├─ Check expiration (15 min limit)
   ├─ Extract userId from payload → '550e8400-...'
   └─ Add userId to request object: req.userId = '550e8400-...'
   
   If token invalid/expired → Return 401 "Unauthorized"
   
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: REQUEST FORWARDED TO USER SERVICE (Port 3002)           │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Input validation (Joi schema):
   │  ├─ firstName: string, min 1, max 100 ✓
   │  ├─ lastName: string, min 1, max 100 ✓
   │  ├─ bio: optional, max 500 ✓
   │  └─ avatarUrl: valid URI ✓
   │
   ├─ Check if profile already exists:
   │  └─ SELECT * FROM user_profiles WHERE user_id = '550e8400-...'
   │     └─ Exists? → Return 409 "Profile already exists"
   │
   ├─ Database insert:
   │  └─ INSERT INTO user_profiles (
   │       user_id, first_name, last_name, email, bio, phone, avatar_url, created_at
   │     ) VALUES (
   │       '550e8400-...', 'John', 'Doe', 'john@example.com', 'Software engineer', '+1-555-1234', 'https://...', NOW()
   │     )
   │
   └─ Publish event:
      └─ EVENT: USER_PROFILE_CREATED
         ├─ userId: '550e8400-...'
         ├─ firstName: 'John'
         ├─ lastName: 'Doe'
         └─ timestamp: NOW()
```

### Database Change

**Table: user_profiles** (User Service DB)
```
id     | user_id                               | first_name | last_name | email             | bio                | phone         | avatar_url
xxxxx  | 550e8400-e29b-41d4-a716-446655440000 | John       | Doe       | john@example.com  | Software engineer  | +1-555-1234   | https://...
```

---

## 4. SEARCH USERS FLOW

### User Action: Search for another user
User types "Jane" in the search box to find friends.

### HTTP Request
```
GET http://localhost:3000/users/search?q=Jane&limit=20&offset=0
Authorization: Bearer <accessToken>
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: API GATEWAY VALIDATES JWT & FORWARDS                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: USER SERVICE PROCESSES SEARCH                           │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Validate search query:
   │  └─ Minimum 2 characters? "Jane" → ✓ YES
   │
   ├─ Database query (with full-text search or LIKE):
   │  └─ SELECT * FROM user_profiles 
   │     WHERE first_name ILIKE '%Jane%' OR last_name ILIKE '%Jane%'
   │     LIMIT 20 OFFSET 0
   │
   ├─ Results returned:
   │  ├─ Jane Smith (id: 123e4567...)
   │  ├─ Jane Johnson (id: 456e7890...)
   │  └─ ... (up to 20 results)
   │
   └─ Return to client
```

### Response
```
HTTP 200 OK
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "999e...",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane.smith@example.com",
      "avatar_url": "https://..."
    },
    {
      "id": "456e7890-e89b-12d3-a456-426614174000",
      "user_id": "888e...",
      "first_name": "Jane",
      "last_name": "Johnson",
      "email": "jane.johnson@example.com",
      "avatar_url": "https://..."
    }
  ],
  "limit": 20,
  "offset": 0
}
```

---

## 5. SEND CONNECTION REQUEST FLOW

### User Action: Click "Add Friend"
John wants to connect with Jane (found in search results).

### HTTP Request
```
POST http://localhost:3000/users/connections/request
Authorization: Bearer <accessToken>
{
  "connectedUserId": "999e4567-e89b-12d3-a456-426614174000"
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ USER SERVICE VALIDATES & PROCESSES REQUEST                      │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Security checks:
   │  ├─ Is sender trying to connect with themselves? NO ✓
   │  ├─ Does target user exist? SELECT FROM user_profiles WHERE user_id = '999e...' → YES ✓
   │  ├─ Is sender blocked by target? SELECT FROM user_connections WHERE ... → NO ✓
   │  └─ Are they already connected? SELECT FROM user_connections WHERE ... → NO ✓
   │
   ├─ Database insert:
   │  └─ INSERT INTO user_connections (
   │       user_id_1, user_id_2, status, created_at
   │     ) VALUES (
   │       '550e8400-...', '999e4567-...', 'pending', NOW()
   │     )
   │
   └─ Publish event:
      └─ EVENT: CONNECTION_REQUESTED
         ├─ userId (sender): '550e8400-...'
         ├─ connectedUserId (receiver): '999e4567-...'
         └─ timestamp: NOW()
```

### Database Change

**Table: user_connections** (User Service DB)
```
id     | user_id_1                             | user_id_2                             | status  | created_at
xxxxx  | 550e8400-e29b-41d4-a716-446655440000 | 999e4567-e89b-12d3-a456-426614174000 | pending | 2026-04-21...
```

---

## 6. ACCEPT CONNECTION REQUEST FLOW

### User Action: Click "Accept" on connection request
Jane sees John's request and accepts it.

### HTTP Request
```
POST http://localhost:3000/users/connections/accept
Authorization: Bearer <janeAccessToken>
{
  "connectedUserId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ USER SERVICE PROCESSES ACCEPTANCE                               │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Find connection request:
   │  └─ SELECT * FROM user_connections 
   │     WHERE (user_id_1 = '550e...' AND user_id_2 = '999e...' AND status = 'pending')
   │     OR (user_id_1 = '999e...' AND user_id_2 = '550e...' AND status = 'pending')
   │
   ├─ Update status:
   │  └─ UPDATE user_connections 
   │     SET status = 'accepted', updated_at = NOW()
   │     WHERE id = '...'
   │
   └─ Publish event:
      └─ EVENT: CONNECTION_ACCEPTED
         ├─ userId (acceptor): '999e4567-...'
         ├─ connectedUserId (requester): '550e8400-...'
         └─ timestamp: NOW()
```

### Database Change

**Table: user_connections**
```
id     | user_id_1                             | user_id_2                             | status    | created_at | updated_at
xxxxx  | 550e8400-e29b-41d4-a716-446655440000 | 999e4567-e89b-12d3-a456-426614174000 | accepted  | 2026-04-21... | 2026-04-21...
```

---

## 7. SEND DIRECT MESSAGE FLOW

### User Action: John sends message to Jane
John types "Hey, how are you?" and hits send.

### HTTP Request
```
POST http://localhost:3000/messages/send
Authorization: Bearer <johnAccessToken>
{
  "recipientId": "999e4567-e89b-12d3-a456-426614174000",
  "content": "Hey, how are you?"
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ API GATEWAY VALIDATES JWT & ROUTES TO MESSAGE SERVICE (3003)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ MESSAGE SERVICE PROCESSES MESSAGE SEND                          │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Input validation:
   │  ├─ recipientId is valid UUID? ✓
   │  ├─ content min 1, max 5000 chars? ✓
   │  └─ sender !== recipient? ✓
   │
   ├─ Find or create conversation:
   │  ├─ Query: SELECT * FROM conversations 
   │  │   WHERE (user_id_1 = '550e...' AND user_id_2 = '999e...')
   │  │      OR (user_id_1 = '999e...' AND user_id_2 = '550e...')
   │  │
   │  ├─ If exists → Use existing conversation
   │  │
   │  └─ If NOT exists → Create new conversation:
   │     └─ INSERT INTO conversations (id, user_id_1, user_id_2, created_at)
   │        VALUES ('conv-uuid...', '550e...', '999e...', NOW())
   │
   ├─ Insert message:
   │  └─ INSERT INTO messages (
   │       id, conversation_id, sender_id, content, status, created_at, updated_at
   │     ) VALUES (
   │       'msg-uuid...', 'conv-uuid...', '550e...', 'Hey, how are you?', 'sent', NOW(), NOW()
   │     )
   │
   └─ Publish event:
      └─ EVENT: MESSAGE_SENT
         ├─ messageId: 'msg-uuid...'
         ├─ conversationId: 'conv-uuid...'
         ├─ senderId: '550e...'
         ├─ recipientId: '999e...'
         ├─ content: 'Hey, how are you?'
         └─ timestamp: NOW()
         
         This event goes to RabbitMQ topic exchange
         Other services can subscribe to this event
         (In Phase 2, Notification Service will listen and send push notification)
```

### Database Changes

**Table: conversations** (Message Service DB)
```
id              | user_id_1                             | user_id_2                             | created_at       | updated_at
conv-uuid...    | 550e8400-e29b-41d4-a716-446655440000 | 999e4567-e89b-12d3-a456-426614174000 | 2026-04-21...    | 2026-04-21...
```

**Table: messages** (Message Service DB)
```
id         | conversation_id | sender_id                             | content               | status  | created_at    | updated_at    | delivered_at | read_at
msg-uuid.. | conv-uuid...    | 550e8400-e29b-41d4-a716-446655440000 | Hey, how are you?     | sent    | 2026-04-21... | 2026-04-21... | NULL         | NULL
```

### Response
```
HTTP 201 Created
{
  "id": "msg-uuid...",
  "conversation_id": "conv-uuid...",
  "sender_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Hey, how are you?",
  "status": "sent",
  "created_at": "2026-04-21T10:35:00Z",
  "updated_at": "2026-04-21T10:35:00Z"
}
```

---

## 8. RECEIVE MESSAGE (Status Update) FLOW

### User Action: Jane receives and reads the message
Jane opens the conversation and the message appears. The app marks it as delivered and read.

### HTTP Request 1: Mark as Delivered
```
POST http://localhost:3000/messages/status
Authorization: Bearer <janeAccessToken>
{
  "messageId": "msg-uuid...",
  "status": "delivered"
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ MESSAGE SERVICE UPDATES MESSAGE STATUS                          │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Validation:
   │  ├─ Message exists? SELECT * FROM messages WHERE id = 'msg-uuid...' → YES ✓
   │  ├─ Requester is NOT sender? ('550e...' !== 'msg.sender_id') ✓
   │  └─ Status is valid? ('delivered' in ['delivered', 'read']) ✓
   │
   ├─ Database update:
   │  └─ UPDATE messages 
   │     SET status = 'delivered', delivered_at = NOW()
   │     WHERE id = 'msg-uuid...'
   │
   └─ Publish event:
      └─ EVENT: MESSAGE_DELIVERED
         ├─ messageId: 'msg-uuid...'
         ├─ conversationId: 'conv-uuid...'
         ├─ recipientId (who received): '999e4567-...'
         └─ timestamp: NOW()
```

### HTTP Request 2: Mark as Read
```
POST http://localhost:3000/messages/status
Authorization: Bearer <janeAccessToken>
{
  "messageId": "msg-uuid...",
  "status": "read"
}
```

### Behind the Scenes (Same process)
```
UPDATE messages 
SET status = 'read', read_at = NOW()
WHERE id = 'msg-uuid...'

EVENT: MESSAGE_READ published to RabbitMQ
```

### Database Changes (After both status updates)

**Table: messages**
```
id         | conversation_id | sender_id | content           | status | delivered_at         | read_at
msg-uuid.. | conv-uuid...    | 550e...   | Hey, how are you? | read   | 2026-04-21T10:35:10Z | 2026-04-21T10:35:20Z
```

---

## 9. GET MESSAGE HISTORY FLOW

### User Action: Open conversation with Jane
John wants to see all past messages between him and Jane.

### HTTP Request
```
GET http://localhost:3000/messages/history?recipientId=999e4567-e89b-12d3-a456-426614174000&limit=50&offset=0
Authorization: Bearer <johnAccessToken>
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ MESSAGE SERVICE FETCHES HISTORY                                 │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Validation:
   │  ├─ recipientId valid UUID? ✓
   │  ├─ limit between 1-100? ✓
   │  └─ offset >= 0? ✓
   │
   ├─ Find conversation:
   │  └─ SELECT * FROM conversations 
   │     WHERE (user_id_1 = '550e...' AND user_id_2 = '999e...')
   │        OR (user_id_1 = '999e...' AND user_id_2 = '550e...')
   │     → Found 'conv-uuid...'
   │
   ├─ Fetch messages with pagination:
   │  └─ SELECT id, sender_id, content, status, delivered_at, read_at, created_at
   │     FROM messages
   │     WHERE conversation_id = 'conv-uuid...'
   │     ORDER BY created_at DESC
   │     LIMIT 50 OFFSET 0
   │     
   │     Results (newest first):
   │     ├─ Message from Jane: "I'm good! How about you?"
   │     ├─ Message from John: "Hey, how are you?"
   │     └─ (more messages if they exist)
   │
   └─ Count total messages:
      └─ SELECT COUNT(*) FROM messages WHERE conversation_id = 'conv-uuid...'
         → Total: 2
```

### Response
```
HTTP 200 OK
{
  "data": [
    {
      "id": "msg-uuid-2...",
      "conversation_id": "conv-uuid...",
      "sender_id": "999e4567-e89b-12d3-a456-426614174000",
      "content": "I'm good! How about you?",
      "status": "read",
      "delivered_at": "2026-04-21T10:35:15Z",
      "read_at": "2026-04-21T10:35:25Z",
      "created_at": "2026-04-21T10:35:12Z"
    },
    {
      "id": "msg-uuid...",
      "conversation_id": "conv-uuid...",
      "sender_id": "550e8400-e29b-41d4-a716-446655440000",
      "content": "Hey, how are you?",
      "status": "read",
      "delivered_at": "2026-04-21T10:35:10Z",
      "read_at": "2026-04-21T10:35:20Z",
      "created_at": "2026-04-21T10:35:00Z"
    }
  ],
  "limit": 50,
  "offset": 0,
  "total": 2
}
```

---

## 10. TOKEN REFRESH FLOW

### Scenario: Access token expires (15 min expiry)
John's access token expires. Instead of asking him to log in again, the app refreshes it.

### HTTP Request
```
POST http://localhost:3000/auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ AUTH SERVICE VALIDATES & REFRESHES TOKEN                        │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Check refresh token provided? YES ✓
   │
   ├─ Verify refresh token signature:
   │  └─ Decode JWT with REFRESH_SECRET
   │  └─ Valid? ✓ YES → Extract userId
   │            ✗ NO  → Return 401 "Invalid token"
   │
   ├─ Verify token not expired:
   │  └─ 7 days still valid? ✓
   │
   ├─ Database validation:
   │  └─ SELECT * FROM users_auth WHERE id = '550e...'
   │  └─ Does stored refresh_token match provided token? ✓
   │
   ├─ Generate new tokens:
   │  ├─ New Access Token (15 min expiry)
   │  └─ New Refresh Token (7 days expiry)
   │
   ├─ Update database:
   │  └─ UPDATE users_auth SET refresh_token = 'new-refresh-token' WHERE id = '550e...'
   │
   └─ Return new tokens to client
```

### Response
```
HTTP 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 11. LOGOUT FLOW

### User Action: Click Logout
John wants to end his session.

### HTTP Request
```
POST http://localhost:3000/auth/logout
Authorization: Bearer <accessToken>
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ API GATEWAY VALIDATES JWT                                       │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Extract userId from token: '550e...'
   │
   └─ Forward to Auth Service

┌─────────────────────────────────────────────────────────────────┐
│ AUTH SERVICE INVALIDATES TOKEN                                  │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Database update:
   │  └─ UPDATE users_auth SET refresh_token = NULL WHERE id = '550e...'
   │
   │  Now if client tries to use the old refresh token, it won't match DB
   │
   └─ Return success message
```

### Response
```
HTTP 200 OK
{
  "message": "Logged out successfully"
}
```

---

## 12. COMPLETE SYSTEM ARCHITECTURE DIAGRAM

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Web/Mobile App)                            │
│                                                                              │
│   Shows UI, collects user input (email, password, messages, etc.)          │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
                              HTTP Requests
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Port 3000)                              │
│                                                                              │
│  - Receives ALL requests                                                   │
│  - Adds Request ID (X-Request-Id) for tracing                             │
│  - Checks rate limits (Redis-backed)                                      │
│  - Validates JWT tokens for protected routes                             │
│  - Routes to appropriate service                                         │
└──────────────────────────────────────────────────────────────────────────────┘
                    ↙              ↓              ↘
                   ↙               ↓               ↘
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │  Auth        │   │  User        │   │  Message     │
        │  Service     │   │  Service     │   │  Service     │
        │  (3001)      │   │  (3002)      │   │  (3003)      │
        └──────────────┘   └──────────────┘   └──────────────┘
              ↓                  ↓                  ↓
        ┌────────────┐    ┌────────────┐    ┌────────────┐
        │ PostgreSQL │    │ PostgreSQL │    │ PostgreSQL │
        │  DB        │    │  DB        │    │  DB        │
        │            │    │            │    │            │
        │ users_auth │    │user_profile│    │conversa... │
        │ (refresh   │    │user_connec │    │ messages   │
        │  tokens)   │    │            │    │ (with      │
        └────────────┘    └────────────┘    │  status)   │
                                            └────────────┘

        ↓                  ↓                  ↓
    ┌────────────────────────────────────────────────┐
    │         RabbitMQ Event Bus (Message Broker)    │
    │                                                │
    │  Topic Exchange: "messagemesh.topic"           │
    │                                                │
    │  Events:                                       │
    │  - USER_REGISTERED (from Auth)                │
    │  - USER_PROFILE_CREATED (from User)           │
    │  - CONNECTION_REQUESTED (from User)           │
    │  - CONNECTION_ACCEPTED (from User)            │
    │  - MESSAGE_SENT (from Message)                │
    │  - MESSAGE_DELIVERED (from Message)           │
    │  - MESSAGE_READ (from Message)                │
    │  - USER_BLOCKED (from User)                   │
    │                                                │
    │  Subscribers (Phase 1):                       │
    │  - User Service listens to USER_REGISTERED    │
    │    (creates default empty profile)            │
    │  - Message Service listens to USER_BLOCKED    │
    │    (prevents delivery to blocked users)       │
    │                                                │
    │  Subscribers (Phase 2):                       │
    │  - Notification Service will listen to all    │
    │    events for push notifications              │
    └────────────────────────────────────────────────┘

        ↓
    ┌────────────┐
    │   Redis    │
    │   (Cache)  │
    │            │
    │  - Rate    │
    │    limit   │
    │    buckets │
    │            │
    │  - Phase 2 │
    │    Presence│
    │    (online │
    │     status)│
    └────────────┘
```

---

## 13. DATA FLOW SUMMARY TABLE

| Action | Source | HTTP Path | Auth | Service | Database | Event | Event Listeners |
|--------|--------|-----------|------|---------|----------|-------|-----------------|
| Register | Client | POST /auth/register | ❌ | Auth | users_auth | USER_REGISTERED | User Service |
| Login | Client | POST /auth/login | ❌ | Auth | users_auth | - | - |
| Refresh | Client | POST /auth/refresh | ❌ | Auth | users_auth | - | - |
| Create Profile | Client | POST /users/profile | ✅ | User | user_profiles | USER_PROFILE_CREATED | - |
| Get Profile | Client | GET /users/profile | ✅ | User | user_profiles | - | - |
| Update Profile | Client | PUT /users/profile | ✅ | User | user_profiles | - | - |
| Search Users | Client | GET /users/search | ✅ | User | user_profiles | - | - |
| Send Request | Client | POST /users/connections/request | ✅ | User | user_connections | CONNECTION_REQUESTED | - |
| Accept Request | Client | POST /users/connections/accept | ✅ | User | user_connections | CONNECTION_ACCEPTED | - |
| Get Connections | Client | GET /users/connections | ✅ | User | user_connections | - | - |
| Block User | Client | POST /users/connections/block | ✅ | User | user_connections | USER_BLOCKED | Message Service |
| Send Message | Client | POST /messages/send | ✅ | Message | conversations, messages | MESSAGE_SENT | - |
| Get History | Client | GET /messages/history | ✅ | Message | messages | - | - |
| Update Status | Client | POST /messages/status | ✅ | Message | messages | MESSAGE_DELIVERED / MESSAGE_READ | - |
| Logout | Client | POST /auth/logout | ✅ | Auth | users_auth | - | - |

---

## 14. KEY CONCEPTS EXPLAINED

### JWT Token Structure
```
Access Token (15 min expiry):
┌────────────────────────────────────────┐
│ Header:     {"alg": "HS256", "typ": "JWT"}
│ Payload:    {userId: "550e...", email: "john@example.com", exp: 1234567890}
│ Signature:  HMAC-SHA256(header.payload, SECRET_KEY)
└────────────────────────────────────────┘

Refresh Token (7 days expiry):
┌────────────────────────────────────────┐
│ Header:     {"alg": "HS256", "typ": "JWT"}
│ Payload:    {userId: "550e...", exp: 1234567890}
│ Signature:  HMAC-SHA256(header.payload, REFRESH_SECRET)
└────────────────────────────────────────┘
```

### Password Hashing (bcryptjs)
```
User enters:        "MyPassword123!"
                          ↓
bcryptjs.hash()     (with 12 rounds of salt)
                          ↓
Stored in DB:       "$2b$12$abcdefghijklmnopqrstuvwxyz..." (60 chars)

On login:
User enters:        "MyPassword123!"
bcryptjs.compare()  with stored hash
                          ↓
Hashes match?       YES ✓  OR  NO ✗
```

### RabbitMQ Event Flow
```
Service A publishes to topic exchange:
┌──────────────────┐
│  publishEvent()  │
└──────────────────┘
         ↓
┌──────────────────────────────────────┐
│  RabbitMQ Topic Exchange             │
│  messagemesh.topic                   │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Binding: routing key = "user.*"     │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Service B's Queue                   │
│  "user-service-user-queue"           │
└──────────────────────────────────────┘
         ↓
┌──────────────────┐
│  consumeEvent()  │
└──────────────────┘
         ↓
Service B processes event
(e.g., User Service creates profile on USER_REGISTERED)
```

---

## 15. REQUEST TRACING EXAMPLE

Every request gets a unique ID for debugging:

```
Client Request:
POST /auth/register

API Gateway:
- Generates X-Request-Id: "abc123-def456-ghi789"
- Adds to request header
- Logs: {requestId: "abc123...", method: "POST", path: "/auth/register", timestamp: NOW()}

Auth Service receives:
- Extracts X-Request-Id: "abc123-def456-ghi789"
- Logs: {requestId: "abc123...", message: "User registration attempt", email: "john@example.com"}
- Logs: {requestId: "abc123...", message: "Hashing password"}
- Logs: {requestId: "abc123...", message: "User created", userId: "550e..."}

User Service receives event:
- Event includes X-Request-Id: "abc123-def456-ghi789"
- Logs: {requestId: "abc123...", message: "USER_REGISTERED event received", userId: "550e..."}
- Logs: {requestId: "abc123...", message: "Profile created"}

Benefits:
- Follow entire request journey across services
- All logs have same requestId, easy to search
- Debugging: grep requestId=abc123 logs.json | jq
```

---

## 16. ERROR HANDLING EXAMPLE

```
Client sends invalid data:
POST /auth/register
{
  "email": "not-an-email",
  "password": "weak"
}

API Gateway forwards to Auth Service

Auth Service validation:
┌─────────────────────────────┐
│ Is email valid?             │
│ "not-an-email" ❌ NO        │
└─────────────────────────────┘

Error thrown:
AppError('Invalid email format', 400, 'INVALID_EMAIL')

Error Handler middleware catches:
┌────────────────────────────────┐
│ Express error handler          │
│ (last middleware in chain)     │
└────────────────────────────────┘

Returns to client:
HTTP 400 Bad Request
{
  "code": "INVALID_EMAIL",
  "message": "Invalid email format",
  "statusCode": 400
}

Logged:
{
  "requestId": "abc123...",
  "level": "error",
  "message": "Invalid email format",
  "code": "INVALID_EMAIL",
  "timestamp": NOW()
}
```

---

## 17. RATE LIMITING IN ACTION

```
Redis stores:
key: "rate_limit:client-ip:192.168.1.1"
value: 45  (requests in current minute)
ttl: 60 seconds

When 100th request comes:
API Gateway checks: is count >= 100?
YES → Reject with 429 "Too Many Requests"
NO  → Increment counter, allow request

After 60 seconds:
Redis key expires → Counter resets to 0
Next minute can start fresh
```

---

## Summary

Phase 1 implements a complete **foundation** for a chat application:

1. **Authentication**: Secure registration & login with JWT tokens
2. **User Management**: Profiles, search, connections (friend requests)
3. **Direct Messaging**: 1-to-1 conversations with message status tracking
4. **Event System**: Services communicate asynchronously via RabbitMQ
5. **Infrastructure**: API Gateway, databases, middleware, error handling

Phase 2 will add **real-time features** like WebSocket connections and presence tracking.
