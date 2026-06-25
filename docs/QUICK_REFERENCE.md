# QUICK REFERENCE - Trendora

A quick reference guide for developers working on Trendora.

---

## 🗄️ Database Collections At A Glance

### User
```javascript
{
  _id, email, username, password,
  firstName, lastName, bio,
  profilePicture, coverImage,
  followersCount, followingCount, postsCount,
  createdAt, updatedAt
}
```

### Post
```javascript
{
  _id, author, caption, images,
  likes, likesCount, commentsCount,
  hashtags, mentions,
  visibility, createdAt, updatedAt
}
```

### Comment
```javascript
{
  _id, postId, author, text,
  parentComment, likes, likesCount,
  createdAt, updatedAt
}
```

### Like
```javascript
{
  _id, userId, postId/commentId,
  likeType, createdAt
}
```

### Follow
```javascript
{
  _id, followerId, followingId,
  status, createdAt
}
```

### Notification
```javascript
{
  _id, userId, type, actor, post,
  title, message, isRead,
  createdAt
}
```

---

## 🔌 API Endpoints Quick List

### Authentication (6)
- `POST /api/auth/register` - Signup
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh-token` - Refresh token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password

### Users (3)
- `GET /api/users/:userId` - Get profile
- `PUT /api/users/:userId` - Update profile
- `GET /api/users/search?q=query` - Search users

### Posts (4)
- `POST /api/posts` - Create post
- `GET /api/posts/:postId` - Get post
- `PUT /api/posts/:postId` - Update post
- `DELETE /api/posts/:postId` - Delete post

### Likes (2)
- `POST /api/posts/:postId/like` - Like post
- `DELETE /api/posts/:postId/like` - Unlike post

### Follows (4)
- `POST /api/users/:userId/follow` - Follow user
- `DELETE /api/users/:userId/follow` - Unfollow user
- `GET /api/users/:userId/followers` - Get followers
- `GET /api/users/:userId/following` - Get following

### Comments (4)
- `POST /api/posts/:postId/comments` - Create comment
- `GET /api/posts/:postId/comments` - Get comments
- `PUT /api/comments/:commentId` - Update comment
- `DELETE /api/comments/:commentId` - Delete comment

### Feed (3)
- `GET /api/feed` - Personalized feed
- `GET /api/feed/trending` - Trending posts
- `GET /api/feed/explore` - Explore feed

### Notifications (4)
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:notificationId` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:notificationId` - Delete notification

---

## 🔐 Authentication Headers

```javascript
// Protected endpoints require:
Authorization: Bearer <access_token>

// Example with axios:
axios.get('/api/users/me', {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
})
```

---

## 📋 Response Format Templates

### Success (200)
```json
{
  "success": true,
  "status": 200,
  "data": { /* data here */ },
  "message": "Success message"
}
```

### Error (400+)
```json
{
  "success": false,
  "status": 400,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { /* optional */ }
  }
}
```

### Paginated (200)
```json
{
  "success": true,
  "status": 200,
  "data": [ /* array */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNextPage": true
  }
}
```

---

## 🗂️ Folder Structure

```
backend/
├── config/         → Database, environment config
├── models/         → Mongoose schemas
├── routes/         → API route definitions
├── controllers/    → Route handlers, business logic
├── middlewares/    → Auth, error, validation
├── services/       → Reusable business operations
├── utils/          → Helpers, validators, JWT
├── uploads/        → Temporary file uploads
├── app.js          → Express app setup
└── server.js       → Server startup

frontend/
├── src/
│   ├── components/  → Reusable UI components
│   ├── pages/      → Page components
│   ├── redux/      → State management
│   ├── hooks/      → Custom React hooks
│   ├── utils/      → Utility functions
│   ├── App.jsx     → Main app component
│   └── index.css   → Global styles
├── public/         → Static files
└── .env.example    → Environment template
```

---

## 🔑 Environment Variables (Key Ones)

### Backend
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - Token signing key
- `REDIS_HOST` - Cache server
- `AWS_S3_BUCKET` - Image storage
- `CORS_ORIGIN` - Allowed origins
- `OPENAI_API_KEY` - AI services

### Frontend
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_SOCKET_URL` - WebSocket server
- `VITE_CDN_URL` - Image CDN URL

---

## 📊 Database Indexes

```javascript
// User
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })

// Post
db.posts.createIndex({ author: 1, createdAt: -1 })
db.posts.createIndex({ createdAt: -1 })
db.posts.createIndex({ hashtags: 1 })

// Comment
db.comments.createIndex({ postId: 1, createdAt: -1 })
db.comments.createIndex({ author: 1, createdAt: -1 })

// Like
db.likes.createIndex({ userId: 1, postId: 1 }, { unique: true })

// Follow
db.follows.createIndex({ followerId: 1, followingId: 1 }, { unique: true })
db.follows.createIndex({ followingId: 1 })

// Notification
db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 })
```

---

## 🔄 Common Operations

### Create User
```javascript
const user = await User.create({
  email, username, password (hashed),
  firstName, lastName
});
```

### Create Post
```javascript
const post = await Post.create({
  author: userId,
  caption, images, hashtags,
  likesCount: 0, commentsCount: 0
});
```

### Like Post
```javascript
const like = await Like.create({
  userId, postId, likeType: 'post'
});
await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
```

### Get Feed
```javascript
const posts = await Post.aggregate([
  { $match: { author: { $in: followingIds } } },
  { $sort: { createdAt: -1 } },
  { $limit: 20 },
  { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author' } }
]);
```

---

## 🚀 Common Npm Commands

### Backend
```bash
npm install express mongoose dotenv cors helmet
npm start                  # Start server
npm run dev               # Dev mode (auto-reload)
npm test                  # Run tests
npm run lint              # Lint code
```

### Frontend
```bash
npm install react axios redux socket.io-client
npm run dev               # Dev server
npm run build             # Production build
npm run preview           # Preview build
npm test                  # Run tests
```

---

## 🔐 JWT Token

### Structure
```
Header.Payload.Signature

Header: { "alg": "HS256", "typ": "JWT" }
Payload: { userId, email, username, iat, exp, type: 'access' }
Signature: HMACSHA256(header.payload, secret)
```

### Tokens
- **Access**: 15 minutes validity
- **Refresh**: 7 days validity

### Verification
```javascript
const decoded = jwt.verify(token, secret);
// decoded = { userId, email, iat, exp }
```

---

## 🎨 Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate/exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## 💾 Caching Keys

```javascript
// User profile
`user:${userId}`                    // TTL: 1 hour

// Feed
`feed:${userId}:page:${page}`       // TTL: 30 min

// Post
`post:${postId}`                    // TTL: 1 hour

// Trending
`trending:${timeRange}`             // TTL: 15 min

// User stats
`user:${userId}:followers:count`    // TTL: 1 hour
```

---

## 🔄 Request Flow (Example: Create Post)

```
1. Client sends: POST /api/posts + image + JWT
2. Middleware: Auth → validates JWT, extracts userId
3. Middleware: Validation → validates caption, images
4. Middleware: Upload → Multer processes files
5. Controller: createPost() → calls service
6. Service: uploadImages() → uploads to S3
7. Service: createPost() → creates DB record
8. Middleware: Cache → invalidates user's feed cache
9. Response: 201 Created + post object
10. Notification: Socket.io event to followers
```

---

## 🧪 Testing Endpoints (with curl)

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Get Feed (Protected)
```bash
curl -X GET http://localhost:5000/api/feed \
  -H "Authorization: Bearer <access_token>"
```

---

## 📝 File Size Limits

- Images: 5MB max per file
- Post: 10 images max
- API request body: 50KB max
- API URL: 4KB max

---

## ⚡ Performance Targets

| Metric | Target |
|--------|--------|
| Feed query time | < 500ms |
| API response | < 2s |
| Page load | < 3s |
| Cache hit rate | > 80% |
| Database query | < 100ms |

---

## 🔗 Useful Tools

- **Postman** - API testing
- **MongoDB Compass** - Database GUI
- **Redis Desktop Manager** - Cache viewer
- **VS Code** - Code editor
- **Git** - Version control
- **Chrome DevTools** - Frontend debugging
- **Insomnia** - API client alternative
- **TablePlus** - Database viewer

---

## 📚 Documentation Links

- [Full PHASE_1.md](./PHASE_1.md) - Complete design
- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - All endpoints
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [PROJECT_PHASES.md](./PROJECT_PHASES.md) - Roadmap
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Setup guide

---

## 💡 Quick Tips

1. **Always hash passwords** with bcrypt
2. **Validate inputs** on backend
3. **Use indexes** for frequently queried fields
4. **Cache aggressively** but invalidate correctly
5. **Test edge cases** (empty arrays, null values)
6. **Document API changes** immediately
7. **Use environment variables** for config
8. **Monitor database** performance
9. **Log errors** with context
10. **Commit frequently** with clear messages

---

**Keep this handy while developing!** 📌

---

**Last Updated**: 2024-01-15  
**For Phase**: 1-17 (Reference for all phases)
