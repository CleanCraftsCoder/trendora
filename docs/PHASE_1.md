# PHASE 1: Project Planning & Architecture

## 🎯 Phase 1 Objective

Establish the foundation of Trendora by creating a comprehensive system architecture, database schema design, and API specification. This phase ensures that all subsequent development phases are built on a solid, scalable, and maintainable foundation.

**Time Estimate**: 1-2 days (Planning & Documentation)

---

## 📋 Phase 1 Features

### 1. System Architecture Design
- Client-Server architecture overview
- Request-Response flow
- Authentication & Authorization flow
- Database relationship mapping

### 2. Database Schema Design
- MongoDB collection structure
- Document relationships
- Indexing strategy
- Data validation rules

### 3. API Specification
- REST API endpoints documentation
- Request/Response formats
- Error handling standards
- Rate limiting strategy

### 4. Folder Structure
- Backend project organization
- Frontend component organization
- Configuration management
- Asset management

### 5. Performance & Scalability Considerations
- Database indexing strategy
- Caching strategy
- API optimization
- Load balancing readiness

---

## 📁 Phase 1 Folder Structure

```
Trendora/
├── docs/
│   ├── PHASE_1.md ← You are here
│   ├── API_SPECIFICATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── ARCHITECTURE.md
│   └── ...
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   ├── environment.js
│   │   └── constants.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Comment.js
│   │   ├── Like.js
│   │   ├── Follow.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── post.js
│   │   ├── comment.js
│   │   └── notification.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── postController.js
│   │   ├── commentController.js
│   │   └── notificationController.js
│   ├── middlewares/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── validation.js
│   │   └── rateLimit.js
│   ├── utils/
│   │   ├── jwt.js
│   │   ├── password.js
│   │   ├── response.js
│   │   ├── logger.js
│   │   └── validators.js
│   ├── services/
│   │   ├── userService.js
│   │   ├── postService.js
│   │   ├── feedService.js
│   │   ├── aiService.js (Future)
│   │   └── notificationService.js
│   ├── uploads/
│   │   └── posts/
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   ├── Profile/
│   │   │   ├── Post/
│   │   │   ├── Feed/
│   │   │   ├── Notification/
│   │   │   └── Common/
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── ExplorePublishedPage.jsx
│   │   │   └── NotificationPage.jsx
│   │   ├── redux/
│   │   │   ├── slices/
│   │   │   ├── store.js
│   │   │   └── hooks.js
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── usePost.js
│   │   │   └── useFeed.js
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   ├── helpers.js
│   │   │   └── validators.js
│   │   ├── App.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   └── .env.example
├── .gitignore
├── docker-compose.yml (Future)
└── README.md
```

---

## 🗄️ Database Schema Design

### 1. User Collection

**Purpose**: Store user account and profile information

```javascript
{
  _id: ObjectId,
  
  // Authentication
  email: String (unique, indexed),
  username: String (unique, indexed),
  password: String (hashed),
  
  // Profile Information
  firstName: String,
  lastName: String,
  bio: String,
  profilePicture: String (URL),
  coverImage: String (URL),
  
  // Account Status
  isVerified: Boolean,
  verificationToken: String,
  verificationExpiry: Date,
  
  // Social Stats
  followersCount: Number (cached, updated on follow/unfollow),
  followingCount: Number (cached, updated on follow/unfollow),
  postsCount: Number (cached, updated on post create/delete),
  
  // Account Settings
  isPublic: Boolean,
  notificationsEnabled: Boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  
  // Metadata
  lastLogin: Date,
  ipAddress: String,
  deviceInfo: Object
}
```

**Indexes**:
```javascript
- email: 1 (unique, sparse)
- username: 1 (unique, sparse)
- createdAt: -1 (for sorting)
- updatedAt: -1 (for updates)
```

---

### 2. Post Collection

**Purpose**: Store user posts and content

```javascript
{
  _id: ObjectId,
  
  // Content
  author: ObjectId (ref: User),
  caption: String,
  images: [String] (array of URLs),
  
  // Engagement Stats
  likes: [ObjectId] (ref: User - for quick lookup),
  likesCount: Number (denormalized for performance),
  commentsCount: Number (denormalized),
  sharesCount: Number (denormalized),
  
  // Metadata
  hashtags: [String] (indexed for search & trends),
  mentions: [ObjectId] (ref: User),
  
  // Location & Tags
  location: {
    name: String,
    coordinates: {
      type: "Point",
      coordinates: [longitude, latitude]
    }
  },
  
  // Privacy & Status
  visibility: Enum (public, private, friends),
  isArchived: Boolean,
  isDeleted: Boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  
  // AI Data (for future recommendations)
  embeddings: [Number] (vector for AI recommendations)
}
```

**Indexes**:
```javascript
- author: 1, createdAt: -1 (for user feed)
- createdAt: -1 (for trending)
- hashtags: 1 (for search)
- likes: 1 (for quick lookup)
- location: "2dsphere" (for location-based search)
```

---

### 3. Comment Collection

**Purpose**: Store post comments and nested replies

```javascript
{
  _id: ObjectId,
  
  // Relationships
  postId: ObjectId (ref: Post, indexed),
  author: ObjectId (ref: User),
  parentComment: ObjectId (ref: Comment, for replies),
  
  // Content
  text: String,
  mentions: [ObjectId] (ref: User),
  
  // Engagement
  likes: [ObjectId] (ref: User),
  likesCount: Number,
  repliesCount: Number (denormalized),
  
  // Status
  isEdited: Boolean,
  isDeleted: Boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
- postId: 1, createdAt: -1 (for post comments)
- author: 1, createdAt: -1 (for user comments)
- parentComment: 1 (for nested comments)
```

---

### 4. Like Collection

**Purpose**: Track likes for posts and comments

```javascript
{
  _id: ObjectId,
  
  // Relationships
  userId: ObjectId (ref: User, indexed),
  postId: ObjectId (ref: Post, indexed),
  commentId: ObjectId (ref: Comment, indexed, optional),
  
  // Type
  likeType: Enum (post, comment),
  
  // Timestamp
  createdAt: Date
}
```

**Indexes**:
```javascript
- userId: 1, postId: 1 (unique compound, for quick lookup)
- postId: 1, userId: 1 (for post likes)
- userId: 1, createdAt: -1 (for user activity)
```

---

### 5. Follow Collection

**Purpose**: Track user follow relationships

```javascript
{
  _id: ObjectId,
  
  // Relationships
  followerId: ObjectId (ref: User, indexed),
  followingId: ObjectId (ref: User, indexed),
  
  // Status
  status: Enum (pending, accepted, blocked),
  
  // Timestamp
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
- followerId: 1, followingId: 1 (unique compound)
- followingId: 1 (for followers list)
- followerId: 1 (for following list)
- createdAt: -1 (for recent follows)
```

---

### 6. Notification Collection

**Purpose**: Store user notifications for real-time updates

```javascript
{
  _id: ObjectId,
  
  // Recipient
  userId: ObjectId (ref: User, indexed),
  
  // Notification Type
  type: Enum (like, comment, follow, mention, share),
  
  // Related Data
  actor: ObjectId (ref: User - who triggered the notification),
  post: ObjectId (ref: Post, optional),
  comment: ObjectId (ref: Comment, optional),
  
  // Content
  title: String,
  message: String,
  actionUrl: String,
  
  // Status
  isRead: Boolean (indexed),
  
  // Timestamp
  createdAt: Date
}
```

**Indexes**:
```javascript
- userId: 1, isRead: 1, createdAt: -1 (for unread notifications)
- userId: 1, createdAt: -1 (for all notifications)
- actor: 1, createdAt: -1 (for activity)
```

---

## 🔗 Database Relationships

### Relationship Diagram

```
User (1) ─── (many) Post
         ├─── (many) Comment
         ├─── (many) Like
         └─── (many) Follow ─── (1) User

Post (1) ─── (many) Like
     ├─── (many) Comment
     └─── (many) Notification

Comment (1) ─── (many) Like
        ├─── (1) Post
        ├─── (1) User
        └─── (many) Comment (for replies)
```

### Design Decisions

1. **Denormalization for Performance**
   - `likesCount`, `commentsCount` denormalized in Post
   - `repliesCount` denormalized in Comment
   - *Why*: Avoids expensive aggregation queries for feed generation

2. **Array for Likes (Post & Comment)**
   - Small arrays (`likes: [ObjectId]`) stored in Post/Comment
   - Separate `Like` collection for queries
   - *Why*: Quick O(1) lookup for like status; aggregate queries for count

3. **Separate Collections vs Embedded**
   - Comments are separate collection (not embedded in Post)
   - *Why*: Nested documents can exceed BSON size limit; easier pagination

4. **Follow Collection**
   - Separate collection instead of nested in User
   - *Why*: Scales better; allows for follow status management (pending, blocked)

5. **Notification Collection**
   - Separate collection for real-time updates
   - *Why*: Independent lifecycle; easier to implement Socket.io updates

---

## 🔌 API Endpoints Overview

### Authentication Endpoints
```
POST   /api/auth/register          - Create new user account
POST   /api/auth/login             - User login
POST   /api/auth/logout            - User logout
POST   /api/auth/refresh-token     - Refresh JWT token
POST   /api/auth/forgot-password   - Password reset request
POST   /api/auth/reset-password    - Reset password
```

### User Endpoints
```
GET    /api/users/:userId          - Get user profile
PUT    /api/users/:userId          - Update user profile
GET    /api/users/:userId/posts    - Get user posts (paginated)
GET    /api/users/:userId/followers - Get user followers (paginated)
GET    /api/users/:userId/following - Get user following (paginated)
GET    /api/users/search           - Search users
```

### Post Endpoints
```
POST   /api/posts                  - Create new post
GET    /api/posts/:postId          - Get post details
PUT    /api/posts/:postId          - Update post
DELETE /api/posts/:postId          - Delete post
GET    /api/posts                  - Get posts (with filters)
```

### Like Endpoints
```
POST   /api/posts/:postId/like     - Like a post
DELETE /api/posts/:postId/like     - Unlike a post
POST   /api/comments/:commentId/like - Like a comment
DELETE /api/comments/:commentId/like - Unlike a comment
```

### Follow Endpoints
```
POST   /api/users/:userId/follow   - Follow user
DELETE /api/users/:userId/follow   - Unfollow user
GET    /api/users/:userId/followers - Get followers (paginated)
GET    /api/users/:userId/following - Get following (paginated)
```

### Comment Endpoints
```
POST   /api/posts/:postId/comments - Create comment
GET    /api/posts/:postId/comments - Get post comments (paginated)
PUT    /api/comments/:commentId    - Update comment
DELETE /api/comments/:commentId    - Delete comment
POST   /api/comments/:commentId/replies - Reply to comment
```

### Feed Endpoints
```
GET    /api/feed                   - Get personalized feed (paginated)
GET    /api/feed/trending          - Get trending posts
GET    /api/feed/explore           - Get explore feed
```

### Notification Endpoints
```
GET    /api/notifications          - Get user notifications (paginated)
PUT    /api/notifications/:notificationId - Mark notification as read
PUT    /api/notifications/read-all - Mark all as read
DELETE /api/notifications/:notificationId - Delete notification
```

---

## 🔐 Authentication & Authorization Flow

### JWT Token Structure

```javascript
Header: {
  "alg": "HS256",
  "typ": "JWT"
}

Payload: {
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "username": "johndoe",
  "iat": 1516239022,
  "exp": 1516242622,
  "type": "access" // or "refresh"
}

Signature: HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

### Token Strategy

- **Access Token**: 15 minutes validity
- **Refresh Token**: 7 days validity
- **Refresh Token Rotation**: New refresh token issued on each refresh

### Authorization Middleware

```
Request Headers:
Authorization: Bearer <access_token>

Middleware Flow:
1. Extract token from header
2. Verify signature and expiry
3. Check token type (access)
4. Attach user data to request
5. Pass to route handler
6. If expired, return 401 with refresh hint
```

---

## 🎯 API Response Standards

### Success Response

```javascript
{
  "success": true,
  "status": 200,
  "data": {
    // Response data here
  },
  "message": "Request successful"
}
```

### Error Response

```javascript
{
  "success": false,
  "status": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "rule": "email"
    }
  }
}
```

### Paginated Response

```javascript
{
  "success": true,
  "status": 200,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 📊 Caching Strategy

### Redis Caching (Optional but Recommended)

```javascript
// User Profile Cache
Key: `user:${userId}`
TTL: 1 hour
Invalidate: On profile update

// User Feed Cache
Key: `feed:${userId}:page:${page}`
TTL: 30 minutes
Invalidate: On new post from followed users

// Post Details Cache
Key: `post:${postId}`
TTL: 1 hour
Invalidate: On post update/delete

// Trending Posts Cache
Key: `trending:${timeRange}`
TTL: 15 minutes
Regenerate: Every 15 minutes

// User Followers/Following Count
Key: `user:${userId}:followers:count`
TTL: 1 hour
```

---

## ⚡ Performance Optimization Strategy

### 1. Database Indexing
- Index frequently queried fields
- Use compound indexes for multi-field queries
- Avoid indexing low-selectivity fields

### 2. Query Optimization
- Use projection to select only needed fields
- Batch multiple queries where possible
- Use aggregation pipeline for complex queries

### 3. Pagination
- Limit default page size (20 items)
- Use cursor-based pagination for large datasets
- Cache frequently accessed pages

### 4. Image Optimization
- Compress images on upload (Multer + Sharp)
- Store in CDN (Cloudinary, AWS S3)
- Multiple image sizes (thumbnail, medium, full)

### 5. Code Optimization
- Connection pooling for MongoDB
- Lazy loading of relations
- Rate limiting on API endpoints

---

## 🛡️ Security Best Practices

### 1. Input Validation
- Validate all user inputs
- Sanitize data before storing
- Use parameterized queries (Mongoose)

### 2. Password Security
- Hash passwords with bcrypt (salt rounds: 10)
- Never store plain passwords
- Enforce strong password policy

### 3. API Security
- CORS configuration
- Rate limiting (20 requests/minute per IP)
- API key validation
- Request size limits

### 4. Data Protection
- Encrypt sensitive data
- Use HTTPS only
- Secure cookie flags (httpOnly, secure, sameSite)

### 5. Authentication
- JWT-based auth (not session-based for scalability)
- Token refresh strategy
- Logout by token blacklist (optional)

---

## 🚀 Scalability Considerations

### 1. Horizontal Scaling
- Stateless API servers
- Load balancer (Nginx)
- Separate database server

### 2. Database Scaling
- MongoDB replication
- Sharding by user_id
- Read replicas for analytics

### 3. Caching Layer
- Redis for frequently accessed data
- CDN for static assets
- Browser caching

### 4. Message Queue
- RabbitMQ/Kafka for async tasks
- Notification queue
- Email/SMS queue

### 5. Monitoring & Logging
- Application logs (Winston/Morgan)
- Database query logs
- Performance metrics (APM)

---

## 📋 Phase 1 Deliverables

### Documentation
- ✅ Project README with overview
- ✅ Database schema design (this document)
- ✅ API specification (endpoints, request/response)
- ✅ Authentication flow documentation
- ✅ Folder structure outline

### Diagrams (to be created)
- [ ] System architecture diagram
- [ ] Database relationship diagram
- [ ] Request-response flow diagram
- [ ] Authentication flow diagram

### Configuration Files
- [ ] `.env.example` file for environment variables
- [ ] `package.json` templates (backend & frontend)
- [ ] `docker-compose.yml` for local development

### Project Setup
- [ ] Initialize Git repository
- [ ] Create folder structure
- [ ] Generate environment config templates

---

## 🎓 Why These Design Decisions?

### 1. MongoDB (NoSQL) over SQL
**Why**: 
- Schema flexibility for future AI data (embeddings, metadata)
- Horizontal scalability
- Faster queries for large arrays (likes, followers)
- JSON-like data structure matches JavaScript objects
- Better for rapid iteration

### 2. JWT vs Sessions
**Why**:
- Stateless (no session storage needed)
- Scales horizontally easily
- Works with microservices
- Mobile-friendly (tokens in headers)

### 3. Denormalization Strategy
**Why**:
- Feed queries are frequent (read-heavy)
- Denormalized counts avoid expensive aggregations
- Trade storage for speed
- Counter increments are atomic operations

### 4. Separate Collections for Comments & Likes
**Why**:
- Post documents can exceed BSON size limit if nested
- Independent pagination for comments
- More efficient queries for specific data

### 5. Follow Collection (Separate)
**Why**:
- Scales better than nested arrays
- Allows follow status management
- Bidirectional relationship queries
- Support for blocking, requests in future

### 6. Redis Caching
**Why**:
- Feed generation is expensive
- User profile accessed frequently
- Trending posts need quick updates
- Real-time statistics

---

## ✅ Phase 1 Checklist

- [x] System architecture planning
- [x] Database schema design
- [x] API endpoints specification
- [x] Authentication & authorization flow
- [x] Caching strategy
- [x] Security considerations
- [x] Scalability planning
- [x] Performance optimization strategy
- [ ] Create project folder structure
- [ ] Initialize Git repository
- [ ] Create `.env.example` files

---

## 🔗 Related Documents

- [README.md](../README.md) - Project overview
- [PHASE_2.md](./PHASE_2.md) - Backend setup & database design (coming next)

---

## 📞 Next Steps

**Phase 2 will cover:**
1. Initialize Node.js + Express backend
2. MongoDB connection & configuration
3. Create all Mongoose schemas
4. Implement database indexes
5. Set up environment variables
6. Create basic folder structure
7. Set up error handling middleware
8. Configure logging

**Preparation for Phase 2:**
- Have Node.js installed
- Have MongoDB running (local or Atlas)
- Understand basic Express concepts
- Familiar with Mongoose ODM

---

**Phase 1 Complete! Ready for Phase 2: Backend Setup & Database Design** 🚀
