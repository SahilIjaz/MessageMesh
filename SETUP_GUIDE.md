# MessageMesh - Complete Setup Guide

## 🚀 Quick Start

### All Services Running ✅
- **API Gateway**: http://localhost:3000
- **Auth Service**: http://localhost:3001
- **User Service**: http://localhost:3002
- **Message Service**: http://localhost:3003
- **Presence Service**: http://localhost:3004
- **Notification Service**: http://localhost:3005
- **Media Service**: http://localhost:3006

### UI
- **Next.js UI**: http://localhost:3010

## 📋 Authentication Testing

### Register a New Account
1. Open http://localhost:3010/auth
2. Click "Register" 
3. Enter email and password
4. Watch the browser console for logs:
   ```
   📝 Registration attempt: {email}
   🌐 POST /auth/register - Sending registration request
   📨 Response status: 201
   ✅ Registration successful
   ✅ Registration response received: {user}
   💾 Tokens saved to localStorage
   🎉 Registration complete for: {email}
   🚀 Redirecting to dashboard...
   ```

### Login with Existing Account
1. Open http://localhost:3010/auth
2. Keep "Login" selected
3. Enter email and password
4. Watch the browser console for logs:
   ```
   🔓 Login attempt: {email}
   🌐 POST /auth/login - Sending login request
   📨 Response status: 200
   ✅ Login successful
   ✅ Login response received: {user}
   💾 Tokens saved to localStorage
   🎉 Login complete for: {email}
   🚀 Redirecting to dashboard...
   ```

## 🎨 UI Features

### Authentication Page
- **Black Text**: All labels and instructions are now black for readability
- **Professional Design**: Gradient background with clean white card
- **Toggle Switch**: Seamlessly switch between Login and Register
- **Real-time Validation**: Error messages display in red
- **Responsive**: Works on mobile and desktop

### Dashboard
- **Protected Routes**: Automatically redirects unauthenticated users to login
- **User Profile**: Displays user info in navbar
- **Logout**: One-click logout functionality
- **Loading States**: Smooth loading indicators

## 🔐 Security

- JWT tokens stored in localStorage
- Automatic token refresh on app load
- Protected API endpoints require Authorization header
- CORS enabled on all backend services

## 📊 Console Logging

All authentication flows are logged to browser console with emojis:
- 📝 = Registration event
- 🔓 = Login event
- 🌐 = API request
- 📨 = API response
- ✅ = Success
- ❌ = Error
- 💾 = Token saved
- 🎉 = Complete
- 👤 = Profile loading
- 👋 = Logout

## 🛠 Development Commands

### Start All Services
```bash
cd /Users/sahilijaz/Desktop/MessageMesh

# Start backend services (each in separate terminal)
cd services/auth-service && npm run dev
cd services/user-service && npm run dev
cd services/message-service && npm run dev
cd services/presence-service && npm run dev
cd services/notification-service && npm run dev
cd services/media-service && npm run dev
cd services/api-gateway && npm run dev
```

### Start UI
```bash
cd client-nextjs
PORT=3010 npm run dev
```

## 📝 Next Steps

1. ✅ Authentication (DONE)
2. ⏳ Conversations & Messaging
3. ⏳ User Search & Profile
4. ⏳ Media Upload
5. ⏳ Real-time Presence

## 🐛 Troubleshooting

**Text not readable?**
- All text is now black with improved contrast
- Check browser console for any CSS warnings

**Login/Register not working?**
- Check browser console for detailed error logs
- Verify backend services are running (check each port)
- Ensure API_BASE_URL in .env.local is correct

**Services showing as unhealthy?**
- All services have CORS enabled
- Direct curl requests should work: `curl http://localhost:3001/health`
