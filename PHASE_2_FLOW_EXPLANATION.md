# MessageMesh Phase 2: Real-Time Communication & WebSocket Flows

This document explains the new real-time features added in Phase 2 Week 1: WebSocket connections, presence tracking, typing indicators, and real-time message delivery.

---

## Phase 2 Overview

**Phase 2 Focus:** Real-time, bidirectional communication via WebSocket  
**New Service:** Presence Service (Port 3004)  
**Technology:** Native `ws` package, Redis (no PostgreSQL)  
**Performance Goal:** <10ms presence queries (meets CLAUDE.md SLA)

### What Phase 2 Adds to Phase 1

| Feature | Phase 1 | Phase 2 |
|---------|---------|---------|
| Message sending | ✅ HTTP REST | ✅ + Real-time WebSocket |
| Message status | ✅ Via REST update | ✅ + Automatic on receive |
| Typing indicator | ❌ | ✅ WebSocket broadcast |
| Online/offline tracking | ❌ | ✅ Redis-backed |
| Message delivery | ✅ Store in DB | ✅ + Real-time push |
| Connection management | ❌ | ✅ Heartbeat + auto-recovery |

---

## Architecture: Phase 1 + Phase 2

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLIENT (Web/Mobile)                           │
│                                                                  │
│  HTTP API for auth/profiles/search                             │
│  WebSocket for real-time messages, presence, typing            │
└──────────────────────────────────────────────────────────────────┘
              ↓                                           ↓
        HTTP Requests                              WebSocket Upgrade
              ↓                                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (3000)                       │
│                                                                  │
│  - HTTP routes to Auth/User/Message                            │
│  - WebSocket upgrade to Presence Service                       │
│  - JWT validation on all connections                           │
│  - X-Request-Id tracing                                        │
└──────────────────────────────────────────────────────────────────┘
         ↙        ↓        ↘                               ↓
    ┌────────────────┐              ┌──────────────────────────┐
    │ Auth/User/     │              │  PRESENCE SERVICE (3004) │
    │ Message        │              │                          │
    │ Services       │              │  ┌────────────────────┐  │
    │ (as before)    │              │  │ WebSocket Server   │  │
    │                │              │  │ - connection       │  │
    │ PostgreSQL     │              │  │   registry         │  │
    │ RabbitMQ       │              │  │ - heartbeat/TTL    │  │
    │ Redis          │              │  │ - typing indicators│  │
    └────────────────┘              │  │ - message delivery │  │
                                   │  └────────────────────┘  │
                                   │                          │
                                   │  ┌────────────────────┐  │
                                   │  │ REST API           │  │
                                   │  │ - /status/:userId  │  │
                                   │  │ - /status?userIds  │  │
                                   │  └────────────────────┘  │
                                   │                          │
                                   │  ┌────────────────────┐  │
                                   │  │ Redis              │  │
                                   │  │ - presence:{uid}   │  │
                                   │  │ - typing:{...}     │  │
                                   │  │ - lastseen:{uid}   │  │
                                   │  └────────────────────┘  │
                                   └──────────────────────────┘
```

---

## 1. WEBSOCKET CONNECTION FLOW

### User Action: Open Chat App (Mobile/Web)
User opens the app. After logging in, the client establishes a WebSocket connection.

### HTTP Upgrade Request
```
GET ws://localhost:3000/presence
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: ...
Authorization: Bearer <accessToken>
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: API GATEWAY RECEIVES HTTP UPGRADE REQUEST               │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Extract Authorization header
   ├─ Validate JWT token (15 min expiry check)
   ├─ Extract userId from JWT payload → '550e8400-...'
   ├─ Add X-User-Id header: '550e8400-...'
   │
   └─ Forward HTTP upgrade to Presence Service (port 3004)
      (Pass all headers including X-User-Id and X-Request-Id)

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: PRESENCE SERVICE RECEIVES UPGRADE                       │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ WebSocket handshake validation:
   │  ├─ Verify X-User-Id header exists → '550e8400-...'
   │  ├─ Verify header is valid UUID? ✓ YES
   │  └─ Missing/invalid → Reject with 401
   │
   ├─ Add user to connection registry:
   │  └─ connectionRegistry.set('550e8400-...', <WebSocket>)
   │     (Map<userId, ws> for fast O(1) lookup)
   │
   ├─ Set Redis presence key:
   │  └─ SETEX presence:550e8400-... "1" 300
   │     (300s TTL — auto-expires on disconnect)
   │
   ├─ Update last seen timestamp:
   │  └─ SET presence:lastseen:550e8400-... "2026-04-21T10:40:00Z"
   │     (No TTL — persistent)
   │
   ├─ Publish USER_ONLINE event:
   │  └─ publishEvent(USER_ONLINE, {
   │       userId: '550e8400-...',
   │       timestamp: NOW()
   │     })
   │     This goes to RabbitMQ
   │     Notification Service (Phase 3) can subscribe for "user came online" notifications
   │
   └─ Send welcome message to client:
      └─ WebSocket message to client:
         {
           "type": "connection_established",
           "userId": "550e8400-...",
           "timestamp": "2026-04-21T10:40:00Z"
         }
```

### Redis State After Connection

```
Key: presence:550e8400-e29b-41d4-a716-446655440000
Value: "1"
TTL: 300s

Key: presence:lastseen:550e8400-e29b-41d4-a716-446655440000
Value: "2026-04-21T10:40:00Z"
TTL: Never expires

Also created: typing registry in memory (empty for this user)
```

### Client Connected!

```
        CLIENT
        ↓ (WS connected, userId = '550e8400-...')
        ↓
    PRESENCE SERVICE
    ↓
    ├─ Registry: {'550e8400-...': <ws>}
    ├─ Redis: presence:550e8400-... = "1" (TTL 300s)
    └─ Ready to receive/send messages
```

---

## 2. HEARTBEAT MECHANISM (Keep-Alive)

### User Connected, Idle for 60 Seconds
Client sends heartbeat every 60s to refresh the presence TTL.

### WebSocket Message (Client → Server)
```json
{
  "type": "heartbeat"
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ PRESENCE SERVICE RECEIVES HEARTBEAT                             │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Extract userId from connection registry
   │  └─ connectionRegistry.has('550e8400-...') → YES ✓
   │
   ├─ Refresh Redis presence TTL:
   │  └─ EXPIRE presence:550e8400-... 300
   │     (Reset TTL back to 300s, so won't expire)
   │
   ├─ Update last seen (optional):
   │  └─ SET presence:lastseen:550e8400-... "2026-04-21T10:41:00Z"
   │
   └─ Send acknowledgment to client:
      └─ WebSocket message to client:
         {
           "type": "heartbeat_ack",
           "timestamp": "2026-04-21T10:41:00Z"
         }
```

### Why This Matters

```
Timeline:
T=0:     User connects → presence key set, TTL=300s
T=60s:   Client sends heartbeat → TTL reset to 300s
T=120s:  Client sends heartbeat → TTL reset to 300s
...
T=300s:  NO heartbeat received → Key expires (user offline)
         Or if heartbeat sent → TTL=300s again
         
Result: Even if client crashes and doesn't send heartbeat,
        user will be marked offline after 300s automatically
        (self-healing from network issues)
```

---

## 3. CHECK PRESENCE STATUS (HTTP REST)

### User Action: View Friend List
App wants to show which friends are online.

### HTTP Request
```
GET http://localhost:3000/presence/status/999e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <accessToken>
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ PRESENCE SERVICE HANDLES STATUS REQUEST                         │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Validate userId is valid UUID
   │
   ├─ Query Redis:
   │  └─ GET presence:999e4567-...
   │     Returns: "1" if online, nil if offline
   │
   ├─ Query last seen (regardless of online status):
   │  └─ GET presence:lastseen:999e4567-...
   │     Returns: "2026-04-21T10:41:00Z"
   │
   └─ Return status to client:
      └─ HTTP 200 OK
         {
           "userId": "999e4567-...",
           "isOnline": true,
           "lastSeen": "2026-04-21T10:41:00Z"
         }
```

### Batch Status Query

```
GET http://localhost:3000/presence/status?userIds=999e4567-...,888e1234-...,777e5678-...
Authorization: Bearer <accessToken>
```

**Behind the scenes:**
```
For each userId:
  MGET presence:{userId} → ["1", nil, "1"]
  MGET presence:lastseen:{userId} → ["2026-04-21T10:41:00Z", ...]
  
Return:
{
  "data": [
    {
      "userId": "999e4567-...",
      "isOnline": true,
      "lastSeen": "2026-04-21T10:41:00Z"
    },
    {
      "userId": "888e1234-...",
      "isOnline": false,
      "lastSeen": "2026-04-20T15:30:00Z"
    },
    ...
  ]
}
```

---

## 4. SEND MESSAGE (Real-Time)

### User Action: John sends message to Jane
John (already connected via WebSocket) sends "Hey!" to Jane.

**Old way (Phase 1):** POST REST endpoint, Jane gets it when she polls or connects later.
**New way (Phase 2):** If Jane is online, she gets message in real-time via WebSocket.

### HTTP Request (Still REST, but with real-time delivery)
```
POST http://localhost:3000/messages/send
Authorization: Bearer <johnAccessToken>
{
  "recipientId": "999e4567-e89b-12d3-a456-426614174000",
  "content": "Hey!"
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ MESSAGE SERVICE SENDS MESSAGE (Phase 1 flow still happens)      │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Find/create conversation
   ├─ Insert message into database (status = 'sent')
   │
   └─ Publish MESSAGE_SENT event to RabbitMQ:
      {
        "messageId": "msg-uuid...",
        "conversationId": "conv-uuid...",
        "senderId": "550e8400-...",
        "recipientId": "999e4567-...",
        "content": "Hey!",
        "timestamp": "2026-04-21T10:42:00Z"
      }

┌─────────────────────────────────────────────────────────────────┐
│ PRESENCE SERVICE RECEIVES MESSAGE_SENT EVENT (New in Phase 2)   │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Event consumer listens on RabbitMQ:
   │  └─ Binding: routing_key = "message.sent"
   │
   ├─ Check if recipient is online:
   │  └─ connectionRegistry.has('999e4567-...')
   │     Or: GET presence:999e4567-...
   │     Returns: "1" if YES, nil if NO
   │
   ├─ IF RECIPIENT ONLINE:
   │  │
   │  ├─ Get WebSocket connection from registry
   │  ├─ Send message in real-time:
   │  │  ws.send(JSON.stringify({
   │  │    type: 'message_delivered',
   │  │    messageId: 'msg-uuid...',
   │  │    conversationId: 'conv-uuid...',
   │  │    senderId: '550e8400-...',
   │  │    content: 'Hey!',
   │  │    timestamp: '2026-04-21T10:42:00Z'
   │  │  }))
   │  │
   │  └─ Publish MESSAGE_DELIVERED event:
   │     {
   │       "messageId": "msg-uuid...",
   │       "conversationId": "conv-uuid...",
   │       "recipientId": "999e4567-...",
   │       "timestamp": "2026-04-21T10:42:01Z"
   │     }
   │     This updates message status in DB to 'delivered'
   │
   └─ IF RECIPIENT OFFLINE:
      └─ Do nothing
         (Message stays in database with status='sent')
         (Jane will get it when she connects and polls history)
```

### Client (Jane) Receives Real-Time Message

Jane's client receives WebSocket message:
```json
{
  "type": "message_delivered",
  "messageId": "msg-uuid...",
  "conversationId": "conv-uuid...",
  "senderId": "550e8400-...",
  "content": "Hey!",
  "timestamp": "2026-04-21T10:42:00Z"
}
```

Jane's app displays message immediately (no polling needed!).

---

## 5. TYPING INDICATORS

### User Action: John starts typing
John is composing a message. The app sends a typing start signal.

### WebSocket Message (Client → Server)
```json
{
  "type": "typing_start",
  "recipientId": "999e4567-e89b-12d3-a456-426614174000",
  "conversationId": "conv-uuid..."
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ PRESENCE SERVICE RECEIVES TYPING_START                          │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Extract userId from connection registry
   │  └─ userId = '550e8400-...' (John)
   │
   ├─ Set Redis typing key with TTL:
   │  └─ SETEX typing:550e8400-...:conv-uuid... "1" 10
   │     (10s TTL — auto-timeout if client crashes mid-type)
   │
   ├─ Check if recipient is online:
   │  └─ connectionRegistry.has('999e4567-...') → YES ✓
   │
   ├─ Get recipient's WebSocket connection
   │
   ├─ Send typing indicator to recipient:
   │  ws.send(JSON.stringify({
   │    type: 'typing_start',
   │    senderId: '550e8400-...',
   │    conversationId: 'conv-uuid...'
   │  }))
   │
   └─ Publish TYPING_STARTED event (optional, for analytics):
      {
        "senderId": "550e8400-...",
        "recipientId": "999e4567-...",
        "conversationId": "conv-uuid...",
        "timestamp": "2026-04-21T10:42:30Z"
      }
```

### Jane's Client Receives Typing Indicator

```json
{
  "type": "typing_start",
  "senderId": "550e8400-...",
  "conversationId": "conv-uuid..."
}
```

Jane sees: "John is typing..." indicator.

---

### User Action: John Stops Typing
John deletes his draft. App sends typing stop signal.

### WebSocket Message (Client → Server)
```json
{
  "type": "typing_stop",
  "recipientId": "999e4567-e89b-12d3-a456-426614174000",
  "conversationId": "conv-uuid..."
}
```

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ PRESENCE SERVICE RECEIVES TYPING_STOP                           │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ Delete Redis typing key:
   │  └─ DEL typing:550e8400-...:conv-uuid...
   │
   ├─ Send typing_stop to recipient:
   │  ws.send({
   │    type: 'typing_stop',
   │    senderId: '550e8400-...',
   │    conversationId: 'conv-uuid...'
   │  })
   │
   └─ Publish TYPING_STOPPED event
```

Jane's client receives typing_stop, "John is typing..." disappears.

### Safety Net: 10s TTL

If John's client **crashes mid-type**:
- Redis key has 10s TTL
- After 10s, key auto-expires
- Typing indicator times out on its own
- Jane doesn't see stuck "typing..." for forever

---

## 6. USER DISCONNECT FLOW

### User Action: Close App or Lose Connection
Network goes down or user closes app.

### Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT DISCONNECTS                                              │
└─────────────────────────────────────────────────────────────────┘
   │
   └─ WebSocket connection closes (TCP FIN packet)

┌─────────────────────────────────────────────────────────────────┐
│ PRESENCE SERVICE DETECTS CLOSE                                  │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ WebSocket 'close' event fires:
   │
   ├─ Remove from connection registry:
   │  └─ connectionRegistry.delete('550e8400-...')
   │
   ├─ Delete typing indicators (if any):
   │  └─ DEL typing:550e8400-...:* (all conversations)
   │
   ├─ Publish USER_OFFLINE event:
   │  {
   │    "userId": "550e8400-...",
   │    "lastSeen": "2026-04-21T10:43:00Z",
   │    "timestamp": "2026-04-21T10:43:00Z"
   │  }
   │
   │  (Note: Redis presence:550e8400-... still exists)
   │  (It will auto-expire after 300s if heartbeat not sent)
   │
   └─ Log disconnect:
      {
        "message": "User disconnected",
        "userId": "550e8400-...",
        "timestamp": "2026-04-21T10:43:00Z"
      }
```

### Offline Detection

**Immediate detection** (disconnect event):
- WebSocket close handler fires instantly
- User marked offline in connection registry
- USER_OFFLINE event published

**Auto-cleanup** (after 300s):
- Redis presence key expires naturally
- If user didn't reconnect by then, they're definitely offline
- No stale keys left in Redis

---

## 7. RECONNECTION FLOW (Network Hiccup)

### Scenario: User loses WiFi, reconnects after 10 seconds
Network drops, but user fixes it quickly (within 60s heartbeat interval).

### Timeline

```
T=0s:     User connected, heartbeat sent
T=60s:    Network goes down (no heartbeat sent)
T=70s:    Network restored, client re-connects
T=75s:    Heartbeat sent (within 60s interval, so presence still valid)
T=300s:   Original TTL would have expired if no heartbeat

Result:   Presence never expires, seamless reconnection
```

### Behind the Scenes (Reconnection)

```
Client attempts WebSocket reconnect at T=70s:

┌─────────────────────────────────────────────────────────────────┐
│ NEW CONNECTION REQUEST (same userId as before)                  │
└─────────────────────────────────────────────────────────────────┘
   │
   ├─ API Gateway validates JWT again (new access token sent)
   │
   ├─ Presence service checks Redis:
   │  └─ GET presence:550e8400-...
   │     Result: "1" (still exists, not expired yet!)
   │
   ├─ Note: Old WebSocket is gone, but presence still shows online
   │
   ├─ Add new WebSocket to connection registry:
   │  └─ connectionRegistry.set('550e8400-...', <newWs>)
   │
   ├─ Send reconnection message:
   │  {
   │    "type": "reconnected",
   │    "timestamp": "2026-04-21T10:43:10Z",
   │    "undeliveredMessages": [
   │      // Any messages sent while offline
   │    ]
   │  }
   │
   └─ Heartbeat resumes
```

**Clean scenario:** User never marked offline, reconnects seamlessly.

---

## 8. COMPLETE SYSTEM FLOW DIAGRAM

### Phase 2 System with Real-Time Features

```
┌──────────────────────────────────────────────────────────────┐
│                       CLIENT (Browser/App)                   │
│                                                              │
│  HTTP Requests:                  WebSocket Connection:      │
│  ├─ POST /auth/register          ├─ ws://localhost:3000/    │
│  ├─ GET /users/search            │   presence (port 3004)   │
│  ├─ POST /messages/send          ├─ Heartbeat every 60s     │
│  └─ GET /messages/history        ├─ Typing indicators       │
│                                  └─ Real-time message push  │
└──────────────────────────────────────────────────────────────┘
              ↓                                    ↓
              HTTP                           WebSocket
              ↓                                    ↓
┌──────────────────────────────────────────────────────────────┐
│              API GATEWAY (Port 3000)                         │
│                                                              │
│  ├─ Validates JWT on all requests                          │
│  ├─ Routes HTTP to Auth/User/Message services              │
│  ├─ Routes WebSocket upgrade to Presence service           │
│  ├─ Injects X-User-Id, X-Request-Id headers                │
│  └─ Rate limiting (100 req/min)                            │
└──────────────────────────────────────────────────────────────┘
         ↙        ↓        ↘                        ↓
    ┌─────────────────────┐              ┌──────────────────────┐
    │  Auth Service 3001  │              │ PRESENCE SERVICE 3004│
    │  User Service 3002  │              │                      │
    │  Message Svc 3003   │              │  WebSocket Server    │
    │                     │              │  ├─ Connection       │
    │  Databases:         │              │  │   registry        │
    │  ├─ PostgreSQL      │              │  ├─ Heartbeat        │
    │  ├─ RabbitMQ events │              │  ├─ Typing indicator │
    │  └─ Redis cache     │              │  └─ Real-time        │
    │                     │              │     delivery         │
    └─────────────────────┘              │                      │
              ↑                          │  Redis Storage       │
              │                          │  ├─ presence:{uid}   │
              │                          │  ├─ typing:{...}     │
              └──────────────────────────┼─ └─ lastseen:{uid}   │
                                        │                      │
           RabbitMQ (Event Bus)         │  REST API            │
           ├─ MESSAGE_SENT ────────────→├─ /status/:userId    │
           ├─ MESSAGE_DELIVERED         ├─ /status?userIds    │
           ├─ TYPING_STARTED ───────────┤  /health            │
           ├─ USER_ONLINE               │                      │
           └─ USER_OFFLINE ─────────────→└──────────────────────┘
```

---

## 9. MESSAGE DELIVERY COMPARISON: Phase 1 vs Phase 2

### Phase 1 (HTTP Polling)

```
John sends message:
POST /messages/send
↓
Message stored in DB
↓
Jane polls: GET /messages/history every 5 seconds
↓
If Jane is polling: Message appears in 0-5 seconds
If Jane not polling: Message appears when she next polls
(Jane doesn't know message arrived until she checks)
```

### Phase 2 (Real-Time WebSocket)

```
John sends message:
POST /messages/send
↓
Message stored in DB
↓
MESSAGE_SENT event published to RabbitMQ
↓
Presence Service receives event
↓
Is Jane online? (CHECK REDIS)
├─ YES → Send via WebSocket instantly (<100ms)
│        Publish MESSAGE_DELIVERED
└─ NO → Message stays in DB (she'll get it on next login)

Jane's client receives WebSocket push:
{
  type: 'message_delivered',
  content: 'Hey!',
  timestamp: ...
}

Jane sees message immediately!
(No polling, no delay)
```

---

## 10. DATA STRUCTURES & PERFORMANCE

### Connection Registry (In-Memory Map)

```javascript
connectionRegistry = {
  '550e8400-e29b-41d4-a716-446655440000': <WebSocketConnection>,
  '999e4567-e89b-12d3-a456-426614174000': <WebSocketConnection>,
  ...
}

Lookup: O(1) — Direct HashMap access
Use case: Finding recipient's WebSocket for typing/message delivery
Performance: <1ms per lookup
```

### Redis Presence Data

```
Key: presence:550e8400-e29b-41d4-a716-446655440000
Value: "1"
TTL: 300s (5 minutes)
Type: String

Operations:
├─ SETEX (on connect)       → ~1ms
├─ EXPIRE (on heartbeat)    → ~1ms
├─ GET (on status check)    → <1ms
└─ DEL (on disconnect)      → <1ms

Total presence query: <10ms (meets CLAUDE.md SLA)
```

### Redis Typing Indicators

```
Key: typing:550e8400-...:conv-uuid...
Value: "1"
TTL: 10s (auto-timeout)
Type: String

Purpose: Prevent stuck "typing..." indicators if client crashes
Safety: Key auto-deletes after 10s regardless of cleanup
```

### Performance Metrics

| Operation | Latency | Method |
|-----------|---------|--------|
| Presence query | <10ms | Redis GET |
| WebSocket connect | <50ms | TCP handshake + WS upgrade |
| Message delivery | <200ms | Event → Redis check → WS send |
| Typing broadcast | <100ms | Registry lookup → WS send |
| Heartbeat RTT | <20ms | Direct send/receive |

---

## 11. EVENT FLOW ACROSS SERVICES

### Complete Message Delivery Journey

```
1. Client (John) → Message Service
   POST /messages/send
   └─ Store in DB (status='sent')

2. Message Service → RabbitMQ
   Publish MESSAGE_SENT event
   
3. RabbitMQ → Presence Service
   Route to message.sent queue
   ├─ Check Redis: Is recipient online?
   ├─ Send WebSocket push if YES
   └─ Publish MESSAGE_DELIVERED if YES

4. Message Service consumes MESSAGE_DELIVERED
   Update DB: status='delivered'

5. Presence Service → RabbitMQ
   Optional: Publish USER_ONLINE
   (For Notification Service in Phase 3)

6. Client (Jane) ← Presence Service
   Real-time WebSocket push:
   {
     type: 'message_delivered',
     content: 'Hey!',
     timestamp: ...
   }

Total journey: ~100-200ms from send to delivery confirmation
(vs 5+ seconds for Phase 1 polling)
```

---

## 12. SCALING CONSIDERATIONS

### Phase 2 Current Limitations

**Single Instance Only:**
- Connection registry in memory (not shared across servers)
- Typing indicators not broadcast between instances
- If service crashes, all connections lost

**Future Phase 2 Week 2:**
- Redis Pub/Sub for typing broadcast
- Connection pooling to other instances
- Horizontal scaling support

### Why Single Instance Works for Phase 2

- Most deployments start with single instance
- Redis is highly available (can replicate)
- Connections auto-reestablish on user reconnect
- No data loss (messages stored in PostgreSQL)

---

## 13. SECURITY IN PHASE 2

### WebSocket Authentication

```
1. Client sends WebSocket upgrade request
   GET /ws
   Authorization: Bearer <JWT_TOKEN>

2. API Gateway extracts JWT
   ├─ Validates signature
   ├─ Checks expiration (15 min)
   └─ Extracts userId

3. Adds X-User-Id header to upgrade request

4. Presence Service validates X-User-Id
   ├─ Must be valid UUID
   ├─ Used for connection registry key
   └─ Reject if missing/invalid (401)

Result: Only authenticated users can connect
```

### Message Authorization

```
Presence Service receives MESSAGE_SENT event from RabbitMQ:
├─ Verify senderId in event matches JWT userId? NO
│  (Service-to-service communication, different context)
├─ Verify recipientId exists in payload? YES
└─ Deliver to recipient if online

No additional auth needed:
- Message already authorized by Message Service
- RabbitMQ internal, can't be spoofed
- Recipient validated against connection registry
```

---

## 14. ERROR HANDLING IN PHASE 2

### Network Errors

```
Scenario: Message send fails, WebSocket connection drops

Client side:
├─ Detects WebSocket close
├─ Begins exponential backoff reconnection
│  (1s, 2s, 4s, 8s... up to some max)
├─ Sends new access token on reconnect
└─ Resumes heartbeat

Server side:
├─ WebSocket close event fires
├─ Removes from connection registry
├─ Publishes USER_OFFLINE event
├─ Message remains in DB (not lost)
└─ Next login will fetch from history
```

### Database Errors

```
Scenario: Message store fails but event published

Message Service fails to store:
├─ Exception caught
├─ Event NOT published
├─ Return 500 to client
├─ Client sees "Failed to send"
└─ User retries

Result: Message doesn't exist in both DB and event bus
(Safer than having event but no message)
```

### RabbitMQ Errors

```
Scenario: Event bus goes down

Presence Service attempts to consume event:
├─ Connection fails
├─ Nack the message (return to queue)
├─ Retry with exponential backoff
├─ Log error for monitoring
├─ Service continues to handle WebSocket connections

Result: Messages queued in RabbitMQ, retried when broker is back
```

---

## 15. SUMMARY: Phase 2 NEW CAPABILITIES

| Feature | Phase 1 | Phase 2 | Benefit |
|---------|---------|---------|---------|
| Send message | REST | REST + Real-time WS | Instant delivery |
| Receive message | Poll every N sec | WebSocket push | No delay |
| Typing indicator | ❌ | WebSocket broadcast | Better UX |
| Online status | ❌ | Redis-backed | <10ms queries |
| Presence latency | N/A | <10ms SLA | Meets requirement |
| Message delivery | HTTP | HTTP + WebSocket | Sub-100ms |
| Disconnect detection | App-side | Server-side | Automatic |
| Offline handling | Queue in app | Stored in DB | Reliable |

---

## 16. TESTING PHASE 2 FEATURES

### Manual Testing Commands

```bash
# 1. Start all services
docker-compose up --build

# 2. Connect WebSocket (use wscat or similar)
wscat -c ws://localhost:3000/presence \
  --header "Authorization: Bearer <TOKEN>"

# 3. Client-side (in wscat terminal)
# Send heartbeat
{ "type": "heartbeat" }

# Receive heartbeat_ack
{ "type": "heartbeat_ack", "timestamp": "..." }

# 4. In another terminal, check presence
curl http://localhost:3000/presence/status/<USER_ID> \
  -H "Authorization: Bearer <TOKEN>"

# Should return
{
  "userId": "<USER_ID>",
  "isOnline": true,
  "lastSeen": "2026-04-21T10:50:00Z"
}

# 5. Send typing indicator (in wscat)
{
  "type": "typing_start",
  "recipientId": "<FRIEND_ID>",
  "conversationId": "<CONV_ID>"
}

# 6. Send message (from different user)
curl -X POST http://localhost:3000/messages/send \
  -H "Authorization: Bearer <OTHER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "<FIRST_USER_ID>",
    "content": "Hello via Phase 2!"
  }'

# In wscat window, receive real-time delivery
{
  "type": "message_delivered",
  "messageId": "...",
  "content": "Hello via Phase 2!",
  "senderId": "<OTHER_USER_ID>",
  "timestamp": "..."
}
```

---

## Summary

**Phase 2 transforms MessageMesh from:**
- Pull-based (polling for messages, checking status)
- Delayed (5-30s latency for real-time features)
- Limited typing indicators (not possible)

**To:**
- Push-based (server delivers messages in real-time)
- Instant (<100ms message delivery)
- Rich real-time features (typing, presence, online status)
- **<10ms presence queries** (meets SLA requirement)

**Next: Phase 2 Week 2** will add connection recovery, message queuing during disconnects, and multi-instance scaling support.
