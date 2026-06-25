# PHASE 2: Backend Setup & Database Design

## 🎯 Phase 2 Objective

Initialize and configure the Node.js/Express backend with MongoDB connection, create all Mongoose schemas with proper indexing, and set up the foundational middleware for the entire application.

**Time Estimate**: 2-3 days
**Status**: 🚀 IN PROGRESS

---

## 📋 Phase 2 Features

### 1. Node.js Project Initialization
- Initialize npm project with package.json
- Install core dependencies
- Configure scripts for development and production

### 2. Express.js Setup
- Create Express application
- Configure middleware (CORS, body parser, compression)
- Set up error handling middleware
- Configure environment variables

### 3. MongoDB Connection
- Establish MongoDB connection with Mongoose
- Configure connection pooling
- Set up database reconnection logic
- Test connection on startup

### 4. Mongoose Schemas
- User schema with validation
- Post schema with denormalized counts
- Comment schema with nested replies
- Like schema with compound indexes
- Follow schema with relationship tracking
- Notification schema for real-time updates

### 5. Configuration Management
- Environment variables (.env)
- Database configuration
- Logger configuration
- Constants definition

### 6. Basic Middleware
- Error handler middleware
- Request logging middleware
- Validation helpers
- Response formatting utilities

---

## 📁 Backend Folder Structure (Phase 2)

```
backend/
├── config/
│   ├── database.js          # MongoDB connection
│   ├── environment.js       # Environment config
│   └── constants.js         # App constants
├── models/
│   ├── User.js              # User schema
│   ├── Post.js              # Post schema
│   ├── Comment.js           # Comment schema
│   ├── Like.js              # Like schema
│   ├── Follow.js            # Follow schema
│   └── Notification.js      # Notification schema
├── middlewares/
│   ├── errorHandler.js      # Error handling
│   ├── auth.js              # Auth middleware (Phase 3)
│   └── validation.js        # Input validation
├── utils/
│   ├── logger.js            # Winston logger
│   ├── response.js          # Response formatter
│   └── validators.js        # Validation helpers
├── app.js                   # Express app setup
├── server.js                # Server startup
├── package.json             # Dependencies
├── .env.example             # Environment template
├── .env                     # Local config (git ignored)
└── .gitignore               # Git ignore rules
```

---

## 🛠️ What We'll Build in Phase 2

### 1. package.json
```json
{
  "name": "trendora-backend",
  "version": "1.0.0",
  "description": "Trendora Backend - AI-Powered Social Media",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.x",
    "mongoose": "^7.x",
    "dotenv": "^16.x",
    "cors": "^2.8.x",
    "helmet": "^7.x",
    "winston": "^3.x",
    "bcryptjs": "^2.4.x"
  }
}
```

### 2. Database Connection (config/database.js)
- MongoDB URI configuration
- Connection pooling
- Event listeners (connected, disconnected, error)
- Reconnection logic

### 3. Mongoose Schemas
All 6 schemas with:
- Field definitions and types
- Validation rules
- Default values
- Index creation
- Timestamps (createdAt, updatedAt)

### 4. Middleware
- Error handler
- Request logging
- Input validation
- Response formatting

### 5. Logger Setup (Winston)
- File logging
- Console logging
- Log levels (error, warn, info, debug)
- Log rotation

---

## 📊 MongoDB Connection Pattern

```javascript
// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## 🗄️ Schema Overview

### User Schema
```javascript
{
  email: String (unique, lowercase),
  username: String (unique, lowercase),
  password: String (hashed),
  firstName: String,
  lastName: String,
  bio: String,
  profilePicture: String,
  coverImage: String,
  followersCount: Number (default: 0),
  followingCount: Number (default: 0),
  postsCount: Number (default: 0),
  isVerified: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- email: unique
- username: unique
- createdAt: desc
```

### Post Schema
```javascript
{
  author: ObjectId (ref: User),
  caption: String,
  images: [String],
  likes: [ObjectId],
  likesCount: Number (default: 0),
  commentsCount: Number (default: 0),
  sharesCount: Number (default: 0),
  hashtags: [String],
  mentions: [ObjectId],
  visibility: String (enum: public, private, friends),
  isArchived: Boolean (default: false),
  isDeleted: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- author, createdAt: desc
- createdAt: desc
- hashtags
- likes (for quick lookup)
```

### Comment Schema
```javascript
{
  postId: ObjectId (ref: Post),
  author: ObjectId (ref: User),
  text: String,
  parentComment: ObjectId (ref: Comment, optional),
  mentions: [ObjectId],
  likes: [ObjectId],
  likesCount: Number (default: 0),
  repliesCount: Number (default: 0),
  isEdited: Boolean (default: false),
  isDeleted: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- postId, createdAt: desc
- author, createdAt: desc
- parentComment
```

### Like Schema
```javascript
{
  userId: ObjectId (ref: User),
  postId: ObjectId (ref: Post, optional),
  commentId: ObjectId (ref: Comment, optional),
  likeType: String (enum: post, comment),
  createdAt: Date
}

Indexes:
- userId, postId: unique compound
- postId
- userId, createdAt: desc
```

### Follow Schema
```javascript
{
  followerId: ObjectId (ref: User),
  followingId: ObjectId (ref: User),
  status: String (enum: pending, accepted, blocked),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- followerId, followingId: unique compound
- followingId
- followerId
- createdAt: desc
```

### Notification Schema
```javascript
{
  userId: ObjectId (ref: User),
  type: String (enum: like, comment, follow, mention, share),
  actor: ObjectId (ref: User),
  post: ObjectId (ref: Post, optional),
  comment: ObjectId (ref: Comment, optional),
  title: String,
  message: String,
  actionUrl: String,
  isRead: Boolean (default: false),
  createdAt: Date
}

Indexes:
- userId, isRead, createdAt: desc
- userId, createdAt: desc
- actor, createdAt: desc
```

---

## 🔧 Middleware Architecture

### 1. Error Handler Middleware
```javascript
// Handle all errors
// Return standardized error response
// Log errors to file
```

### 2. Request Logger Middleware
```javascript
// Log incoming requests
// Log response times
// Log error details
```

### 3. Validation Helpers
```javascript
// Validate email format
// Validate password strength
// Validate input lengths
// Sanitize user input
```

### 4. Response Formatter
```javascript
// Format success responses
// Format error responses
// Format paginated responses
```

---

## 📝 Environment Configuration

Key variables needed:
```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://...
DB_NAME=trendora

# Logging
LOG_LEVEL=debug
LOG_DIR=./logs

# JWT (for Phase 3)
JWT_SECRET=...
JWT_ACCESS_EXPIRY=15m

# Other services (for later phases)
REDIS_HOST=localhost
AWS_S3_BUCKET=...
```

---

## ✅ Phase 2 Deliverables

### Code Files
- [ ] `package.json` - Dependencies defined
- [ ] `server.js` - Server entry point
- [ ] `app.js` - Express app configuration
- [ ] `config/database.js` - MongoDB connection
- [ ] `config/environment.js` - Environment config
- [ ] `config/constants.js` - App constants
- [ ] `utils/logger.js` - Winston logger
- [ ] `utils/response.js` - Response formatter
- [ ] `utils/validators.js` - Validation helpers
- [ ] `middlewares/errorHandler.js` - Error handler
- [ ] `middlewares/validation.js` - Input validation
- [ ] `models/User.js` - User schema
- [ ] `models/Post.js` - Post schema
- [ ] `models/Comment.js` - Comment schema
- [ ] `models/Like.js` - Like schema
- [ ] `models/Follow.js` - Follow schema
- [ ] `models/Notification.js` - Notification schema

### Configuration
- [ ] `.env` file created with values
- [ ] `package.json` scripts configured
- [ ] `.gitignore` updated

### Testing
- [ ] Server starts without errors
- [ ] MongoDB connection successful
- [ ] All schemas load correctly
- [ ] Database indexes created

### Documentation
- [ ] `.env.example` completed
- [ ] Code comments added
- [ ] README for backend created

---

## 🚀 Getting Started with Phase 2

### Prerequisites ✅
- Node.js v16+ installed
- MongoDB running (local or Atlas)
- npm/yarn ready
- Git configured

### Step 1: Navigate to Backend
```bash
cd backend
```

### Step 2: Initialize Node Project
```bash
npm init -y
```

### Step 3: Install Dependencies
```bash
npm install express mongoose dotenv cors helmet winston bcryptjs
npm install --save-dev nodemon eslint
```

### Step 4: Create Folder Structure
```bash
mkdir config models middlewares utils
```

### Step 5: Create .env File
```bash
cp .env.example .env
# Edit with your MongoDB URI and other config
```

### Step 6: Start Development
```bash
npm run dev
```

---

## 🔗 Key Concepts (Phase 2)

### 1. Mongoose Schemas
- Define data structure
- Add validation rules
- Create indexes for performance
- Add pre/post hooks for business logic

### 2. Middleware
- Process requests before reaching routes
- Error handling
- Logging
- Request validation

### 3. Connection Pooling
- Reuse database connections
- Improve performance
- Handle connection failures

### 4. Logging
- Track application behavior
- Debug issues
- Monitor performance
- Audit user actions

---

## 🎓 Learning Outcomes (Phase 2)

After completing Phase 2, you'll understand:
- How Express.js apps are structured
- How to connect to MongoDB with Mongoose
- How to create and manage Mongoose schemas
- How to implement middleware in Express
- How to handle errors gracefully
- How to configure a Node.js application
- How to set up proper logging
- How to validate user input

---

## 📚 Related Documents

- [PHASE_1.md](./PHASE_1.md) - Database schema details
- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - API endpoints
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Setup guide

---

## 🎯 Phase 2 Success Criteria

✅ Express server running on port 5000
✅ MongoDB connected and logging connection
✅ All 6 Mongoose schemas created
✅ Database indexes created
✅ Error handler working
✅ Logger configured and working
✅ Response formatter standardized
✅ Environment variables loaded correctly
✅ No console errors on startup
✅ Ready for Phase 3 (Authentication)

---

## 🔄 Next Phase

**Phase 3: Authentication System** will build on Phase 2 by:
1. Creating auth routes (/api/auth/register, /api/auth/login)
2. Implementing JWT token generation
3. Creating auth middleware for protected routes
4. Password hashing with bcrypt
5. User registration and login logic

---

**Phase 2 Overview Complete! Let's start building! 🚀**
