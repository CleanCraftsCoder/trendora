# ARCHITECTURE - Trendora

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React.js)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Auth       │  │   Profile    │  │   Post       │  │   Feed       │   │
│  │   Pages      │  │   Pages      │  │   Pages      │  │   Pages      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              Redux/Context API - State Management                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │   HTTP Client (Axios) | WebSocket (Socket.io)                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓ HTTPS
┌─────────────────────────────────────────────────────────────────────────────┐
│                   API GATEWAY / LOAD BALANCER (Nginx)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  - CORS Configuration    - Rate Limiting    - Request Validation            │
│  - SSL/TLS Termination   - Request Logging  - Load Distribution             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER (Node.js/Express)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Middleware Layer                                 │   │
│  │  - CORS Handler    - Auth Middleware    - Error Handler             │   │
│  │  - Request Logger  - Rate Limiter       - Validation                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Routes Layer                                     │   │
│  │  /auth   /users   /posts   /comments   /follow   /notifications    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Controllers Layer                                │   │
│  │  Business logic for each route                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Services Layer                                   │   │
│  │  - UserService    - PostService    - FeedService   - AIService     │   │
│  │  - AuthService    - NotificationService                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Utils / Helpers                                  │   │
│  │  - JWT Utilities   - Password Hashing   - Validators               │   │
│  │  - Response Formatting - Error Handling                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
              ↙                            ↓                            ↘
        ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
        │   MongoDB    │          │   Redis      │          │   File       │
        │   Database   │          │   Cache      │          │   Storage    │
        │              │          │              │          │   (S3/CDN)   │
        │ - User data  │          │ - Sessions   │          │              │
        │ - Posts      │          │ - Feed cache │          │ - Images     │
        │ - Comments   │          │ - User data  │          │ - Videos     │
        │ - Followers  │          │              │          │              │
        │ - Likes      │          │              │          │              │
        └──────────────┘          └──────────────┘          └──────────────┘
```

---

## 📊 Request-Response Flow

### Example: User Likes a Post

```
1. CLIENT (Frontend)
   └─> User clicks "Like" button on post
   └─> Redux dispatches ACTION: likePost(postId)
   └─> HTTP POST request to /api/posts/:postId/like
   └─> Includes: Authorization header with JWT token

2. GATEWAY (Nginx/Load Balancer)
   └─> Receives request
   └─> Validates SSL/TLS certificate
   └─> Checks rate limits
   └─> Routes to backend server

3. BACKEND (Express.js)
   └─> Auth Middleware
       └─> Verifies JWT token
       └─> Extracts userId from token
       └─> Attaches user to request object
   └─> Validation Middleware
       └─> Validates postId format
       └─> Checks if post exists
   └─> Route Handler
       └─> Calls likeController.likePost(postId, userId)

4. CONTROLLER
   └─> Calls postService.likePost(postId, userId)

5. SERVICE
   └─> Creates Like document in MongoDB
   └─> Updates Post.likesCount (increment)
   └─> Creates Notification record
   └─> Invalidates Cache
       └─> Redis cache key: post:{postId}
       └─> Redis cache key: feed:{userId}

6. DATABASE
   └─> MongoDB operations completed
   └─> Notification sent to notification queue

7. RESPONSE
   └─> Success: 201 Created
   └─> Data: { postId, isLiked: true, likesCount: 43 }
   └─> Includes: X-RateLimit headers

8. CLIENT (Frontend)
   └─> Redux updates state
   └─> UI re-renders with new like count
   └─> Like button changes appearance
   └─> Toast notification shown
```

---

## 🔐 Authentication & Authorization Flow

### Signup Flow

```
1. User fills signup form
   ├─> Frontend validates inputs (client-side)
   └─> POST /api/auth/register
       {
         email, username, password,
         firstName, lastName
       }

2. Backend validation
   ├─> Check email format
   ├─> Check email uniqueness
   ├─> Check username uniqueness
   ├─> Check password strength
   └─> Check username format

3. Password hashing
   └─> bcrypt.hash(password, 10)
   └─> Generate random salt
   └─> Hash password with salt

4. Create user in DB
   └─> Insert User document
   └─> Set default values:
       ├─> followersCount: 0
       ├─> followingCount: 0
       ├─> postsCount: 0
       └─> isVerified: false

5. Generate tokens
   └─> Access Token (15 min)
       └─> JWT with userId, email, type: 'access'
   └─> Refresh Token (7 days)
       └─> JWT with userId, type: 'refresh'
   └─> Store refresh token in Redis

6. Return response
   └─> 201 Created
   └─> accessToken (in response body)
   └─> refreshToken (in response body)
   └─> User object

7. Frontend
   └─> Store tokens in secure storage
   └─> accessToken: sessionStorage
   └─> refreshToken: httpOnly cookie
   └─> Redirect to home page
```

### Login Flow

```
1. User submits login form
   └─> POST /api/auth/login { email, password }

2. Find user by email
   └─> User.findOne({ email })
   └─> If not found → return 401 Unauthorized

3. Verify password
   └─> bcrypt.compare(password, hashedPassword)
   └─> If not match → return 401 Unauthorized

4. Update last login
   └─> User.updateOne(
         { _id: userId },
         { lastLogin: now(), ipAddress, deviceInfo }
       )

5. Generate tokens
   └─> Access Token (15 min)
   └─> Refresh Token (7 days)
   └─> Store refresh token hash in Redis

6. Return tokens
   └─> 200 OK
   └─> accessToken
   └─> refreshToken
   └─> User object with stats
```

### Token Refresh Flow

```
1. Access token expired
   └─> Frontend receives 401 Unauthorized

2. Check refresh token
   └─> POST /api/auth/refresh-token { refreshToken }

3. Validate refresh token
   └─> JWT.verify(refreshToken, refreshSecret)
   └─> Check token in Redis
   └─> If invalid → return 401

4. Generate new tokens
   └─> New access token (15 min)
   └─> New refresh token (7 days)
   └─> Invalidate old refresh token in Redis

5. Return new tokens
   └─> 200 OK
   └─> new accessToken
   └─> new refreshToken

6. Frontend
   └─> Update stored tokens
   └─> Retry original request with new token
```

### Protected Route Flow

```
Client Request
     ↓
Authorization: Bearer <access_token>
     ↓
Middleware: verifyAuth()
     ├─> Extract token from header
     ├─> JWT.verify(token, secret)
     ├─> Check token type === 'access'
     ├─> Check token expiry
     ├─> Look up user in DB
     └─> If all valid: attach user to req
         └─> req.user = { userId, email, username }
     
If invalid → return 401 Unauthorized
     ↓
Route handler executes with req.user available
```

---

## 🗄️ Data Flow: Creating a Post with Image

```
STEP 1: Frontend
├─> User selects images
├─> Fill caption, hashtags
└─> Click "Post"

STEP 2: File Upload Preparation
├─> Frontend sends multipart/form-data request
├─> POST /api/posts
├─> Headers:
│   ├─ Authorization: Bearer <token>
│   ├─ Content-Type: multipart/form-data
└─> Body:
    ├─ caption (text)
    ├─ hashtags (array)
    └─ images (files)

STEP 3: Backend Receives Request
├─> Middleware: verifyAuth()
│   └─> Validates JWT token
├─> Middleware: validatePostInput()
│   ├─> Validates caption length (1-2000 chars)
│   ├─> Validates hashtags format
│   └─> Validates image count (1-10 images)
├─> Middleware: processImages() [Multer]
│   ├─> Accepts images to /uploads/posts/
│   ├─> Generates temporary file paths
│   └─> Checks file size (max 5MB each)
└─> Route handler: postController.createPost()

STEP 4: Upload to Cloud Storage
├─> Service: postService.uploadImages()
├─> For each image:
│   ├─> Read from temp location
│   ├─> Compress (80% quality, max 1200px)
│   ├─> Generate 3 sizes:
│   │   ├─> Thumbnail (300x300)
│   │   ├─> Medium (600x600)
│   │   └─> Full (1200x1200)
│   ├─> Upload to S3/CDN
│   ├─> Get public URLs
│   └─> Delete temp files
└─> Returns: Array of image URLs

STEP 5: Create Post Document
├─> Service: postService.createPost()
├─> Post object:
│   ├─ author: userId
│   ├─ caption: text
│   ├─ images: [URLs]
│   ├─ hashtags: array
│   ├─ likesCount: 0
│   ├─ commentsCount: 0
│   ├─ visibility: "public"
│   ├─ createdAt: now()
│   └─ updatedAt: now()
└─> MongoDB: db.posts.insertOne(postObject)

STEP 6: Update Cache
├─> Invalidate user post count cache
│   └─ Redis: DEL user:{userId}:postsCount
├─> Invalidate user feed cache
│   └─ Redis: DEL feed:{userId}:*
├─> Invalidate follower feeds
│   ├─> Get all followers
│   ├─ For each follower:
│       └─ Redis: DEL feed:{followerId}:*
└─> Cache post object
    └─ Redis: SET post:{postId} <postObject> EX 3600

STEP 7: Trigger Notifications
├─> Queue notification service
├─> For each follower:
│   └─ Create notification record
│       ├─ type: "post"
│       ├─ userId: followerId
│       ├─ actor: postAuthor
│       ├─ post: postId
│       └─ title: "User posted new content"
└─> Emit Socket.io event to connected followers

STEP 8: Return Response
├─> Status: 201 Created
├─> Response body:
│   ├─ postId
│   ├─ author (user details)
│   ├─ caption
│   ├─ images (URLs)
│   ├─ hashtags
│   ├─ likesCount: 0
│   ├─ commentsCount: 0
│   └─ createdAt
└─> Headers:
    └─ X-RateLimit-Remaining

STEP 9: Frontend Updates
├─> Remove loading state
├─> Update Redux state
├─> Add post to user's posts list
├─> Update post count
├─> Show success notification
├─> Clear form
└─> (Optional) Redirect to post details page

STEP 10: Real-time Updates
├─> Socket.io emits to followers
│   └─> Event: "newPost"
│   └─> Payload: postObject
├─> Connected followers receive update
├─> Their feed components re-render
└─> New post appears in real-time
```

---

## 🔄 Feed Generation Architecture

### Personalized Feed Algorithm

```
GET /api/feed?page=1&limit=20

STEP 1: Get User's Following List
├─> Redis Cache: user:{userId}:following
├─> If not cached:
│   └─> MongoDB: Follow.find({ followerId: userId })
│   └─> Cache result 1 hour
└─> followingIds = [id1, id2, id3, ...]

STEP 2: Get User's Engagement History
├─> Redis Cache: user:{userId}:engagement
├─> If not cached:
│   └─> MongoDB:
│       ├─ Recent liked post IDs (last 100)
│       ├─ Recent commented post IDs (last 50)
│       └─ Cache 30 minutes
└─> engagementData = { likes, comments, ...}

STEP 3: Query Posts from Following
├─> Check Redis: feed:{userId}:page:{page}
├─> If cached and fresh:
│   └─> Return cached results (skip to Step 6)
└─> If not cached:
    └─> MongoDB.aggregate():
        ├─ MATCH: author in followingIds
        ├─ MATCH: visibility = "public" OR shared
        ├─ MATCH: isDeleted = false
        ├─ SORT: createdAt DESC
        ├─ SKIP: (page-1) * 20
        ├─ LIMIT: 20
        ├─ LOOKUP: author (user details)
        ├─ LOOKUP: likes (count & check if user liked)
        ├─ LOOKUP: comments (count)
        └─ PROJECT: select required fields

STEP 4: Scoring & Ranking (AI-ready)
For each post, calculate engagement score:

score = (
  likes_count * 2.0 +
  comments_count * 3.0 +
  shares_count * 5.0 +
  time_decay_factor * 0.5 +
  user_engagement_factor * 1.5
)

time_decay_factor = 1 / (hours_old + 1)
user_engagement_factor = (user_liked_similar_posts / total_similar_posts)

Re-sort by score if needed

STEP 5: Cache Results
├─> Redis: SET feed:{userId}:page:{page}
├─> Value: Serialized feed array
├─> TTL: 30 minutes
└─> Also cache: feed:{userId}:meta { total, pages }

STEP 6: Construct Response
├─> For each post:
│   ├─ Enrich with user details
│   ├─ Add engagement flags (isLiked, isFollowing)
│   ├─ Format timestamps
│   └─ Limit image URLs
└─> Add pagination metadata

STEP 7: Return Response
└─> {
     data: [posts],
     pagination: {
       page, limit, total, pages,
       hasNextPage, hasPrevPage
     }
   }
```

### Cache Invalidation Strategy

```
When a user likes a post:
├─> Update Post.likesCount
├─> Invalidate:
│   ├─ Redis: feed:*:page:*
│   ├─ Redis: post:{postId}
│   └─ Redis: trending:*
└─> Affected users: post author + all followers

When a user follows someone:
├─> Update User.followingCount
├─> Invalidate:
│   ├─ Redis: user:{userId}:following
│   ├─ Redis: feed:{userId}:page:*
│   └─ Redis: user:{userId}:followers:count
└─> User's feed will include new posts next refresh

When a new post is created:
├─> Invalidate:
│   ├─ Redis: feed:*:page:* (all followers' feeds)
│   ├─ Redis: user:{authorId}:postsCount
│   └─ Redis: trending:*
└─> New post visible to followers next page load
```

---

## 🔗 Scalability Architecture

### Current Single Server Setup

```
┌──────────────────────────────────┐
│   React.js Frontend (deployed)   │
│   - Static files on CDN          │
└──────────────────────────────────┘
              ↓ HTTPS
┌──────────────────────────────────┐
│   Node.js Backend Server         │
│   - Single Express.js instance   │
│   - Single process               │
└──────────────────────────────────┘
        ↙                    ↘
┌──────────────┐      ┌──────────────┐
│   MongoDB    │      │   Redis      │
│   Single     │      │   Single     │
└──────────────┘      └──────────────┘
```

### Horizontal Scaling Architecture (Future)

```
┌──────────────────────────────────┐
│  Static Files (AWS CloudFront)   │
└──────────────────────────────────┘
              ↓ HTTPS
┌──────────────────────────────────┐
│   Load Balancer (Nginx/ALB)      │
│   - SSL Termination              │
│   - Request Routing              │
│   - Health Checks                │
└──────────────────────────────────┘
   ↙        ↓        ↓        ↘
┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
│ API │  │ API │  │ API │  │ API │
│ Srv │  │ Srv │  │ Srv │  │ Srv │
│ #1  │  │ #2  │  │ #3  │  │ #4  │
└─────┘  └─────┘  └─────┘  └─────┘
   ↙        ↓        ↓        ↘
┌──────────────────────────────────┐
│   Redis Cluster                  │
│   - Session store                │
│   - Cache layer                  │
└──────────────────────────────────┘
         ↙              ↘
    ┌─────────┐    ┌──────────────┐
    │ MongoDB │    │ MongoDB      │
    │ Primary │    │ Replica Set  │
    │ (Write) │    │ (Read)       │
    └─────────┘    └──────────────┘
```

---

## 📊 Database Indexing Strategy

```javascript
// User Collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })

// Post Collection
db.posts.createIndex({ author: 1, createdAt: -1 })
db.posts.createIndex({ createdAt: -1 })
db.posts.createIndex({ hashtags: 1 })
db.posts.createIndex({ location: "2dsphere" })

// Comment Collection
db.comments.createIndex({ postId: 1, createdAt: -1 })
db.comments.createIndex({ author: 1, createdAt: -1 })
db.comments.createIndex({ parentComment: 1 })

// Like Collection
db.likes.createIndex({ userId: 1, postId: 1 }, { unique: true })
db.likes.createIndex({ postId: 1 })

// Follow Collection
db.follows.createIndex({ followerId: 1, followingId: 1 }, { unique: true })
db.follows.createIndex({ followingId: 1 })

// Notification Collection
db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 })
db.notifications.createIndex({ userId: 1, createdAt: -1 })
```

---

## 🚀 Deployment Architecture

```
Local Development
└─> Single process, hot reload

Staging
└─> Docker container, similar to production

Production
└─> Docker container on:
    ├─ AWS ECS
    ├─ Kubernetes (K8s)
    ├─ Heroku
    └─ DigitalOcean

CI/CD Pipeline
├─> GitHub/GitLab Actions
├─> Automated tests
├─> Build Docker image
├─> Push to registry
├─> Deploy to staging
├─> Run integration tests
└─> Deploy to production
```

---

## 🔗 Related Documents

- [PHASE_1.md](./PHASE_1.md) - Database schema design
- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - API endpoints
- [README.md](../README.md) - Project overview

---

**Architecture Document Complete!** 🏗️
