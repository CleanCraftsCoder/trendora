# API SPECIFICATION - Trendora

## 📚 Table of Contents

1. [API Base URL](#api-base-url)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Codes](#error-codes)
5. [Rate Limiting](#rate-limiting)
6. [Authentication Endpoints](#authentication-endpoints)
7. [User Endpoints](#user-endpoints)
8. [Post Endpoints](#post-endpoints)
9. [Like Endpoints](#like-endpoints)
10. [Follow Endpoints](#follow-endpoints)
11. [Comment Endpoints](#comment-endpoints)
12. [Feed Endpoints](#feed-endpoints)
13. [Notification Endpoints](#notification-endpoints)

---

## 🔧 API Base URL

```
Development: http://localhost:5000/api
Production: https://api.trendora.com/api
```

**API Version**: v1 (implicit in all endpoints)

---

## 🔐 Authentication

All protected endpoints require JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## 📦 Response Format

### Success Response
```json
{
  "success": true,
  "status": 200,
  "data": {
    // Response payload
  },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "status": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "field": "email",
      "rule": "email_format"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Paginated Response
```json
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

## ⚠️ Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT token |
| `FORBIDDEN` | 403 | User doesn't have permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `TOKEN_EXPIRED` | 401 | JWT token expired |
| `INVALID_TOKEN` | 401 | Invalid JWT token |

---

## ⏱️ Rate Limiting

- **General Endpoints**: 100 requests/minute per IP
- **Auth Endpoints**: 10 requests/minute per IP
- **Upload Endpoints**: 20 requests/minute per user

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1642248600
```

---

## 🔑 Authentication Endpoints

### 1. Register New User

**Endpoint**: `POST /auth/register`

**Public**: Yes

**Request Body**:
```json
{
  "email": "john@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules**:
- `email`: Valid email format, unique in database
- `username`: 3-20 characters, alphanumeric + underscore, unique
- `password`: Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
- `firstName`: 1-50 characters
- `lastName`: 1-50 characters

**Success Response** (201):
```json
{
  "success": true,
  "status": 201,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "username": "johndoe",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "507f1f77bcf86cd799439011",
      "email": "john@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "profilePicture": null,
      "bio": "",
      "isVerified": false,
      "followersCount": 0,
      "followingCount": 0,
      "postsCount": 0
    }
  },
  "message": "User registered successfully"
}
```

**Error Response** (400/409):
```json
{
  "success": false,
  "status": 409,
  "error": {
    "code": "CONFLICT",
    "message": "Email already exists",
    "details": {
      "field": "email"
    }
  }
}
```

---

### 2. Login User

**Endpoint**: `POST /auth/login`

**Public**: Yes

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "507f1f77bcf86cd799439011",
      "email": "john@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "profilePicture": null,
      "bio": "",
      "isVerified": false,
      "followersCount": 10,
      "followingCount": 5,
      "postsCount": 3
    }
  },
  "message": "Login successful"
}
```

**Error Response** (401):
```json
{
  "success": false,
  "status": 401,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

---

### 3. Logout User

**Endpoint**: `POST /auth/logout`

**Protected**: Yes (Requires JWT)

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "Logout successful"
}
```

---

### 4. Refresh Token

**Endpoint**: `POST /auth/refresh-token`

**Public**: Yes (Uses refresh token)

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "message": "Token refreshed successfully"
}
```

---

### 5. Forgot Password

**Endpoint**: `POST /auth/forgot-password`

**Public**: Yes

**Request Body**:
```json
{
  "email": "john@example.com"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "Password reset link sent to your email"
}
```

---

### 6. Reset Password

**Endpoint**: `POST /auth/reset-password`

**Public**: Yes

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "Password reset successful"
}
```

---

## 👥 User Endpoints

### 1. Get User Profile

**Endpoint**: `GET /users/:userId`

**Protected**: No

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Web developer | Coffee enthusiast",
    "profilePicture": "https://cdn.trendora.com/users/507f1f77bcf86cd799439011/profile.jpg",
    "coverImage": "https://cdn.trendora.com/users/507f1f77bcf86cd799439011/cover.jpg",
    "followersCount": 250,
    "followingCount": 120,
    "postsCount": 45,
    "isPublic": true,
    "isVerified": false,
    "createdAt": "2024-01-01T10:00:00Z",
    "isFollowing": false,
    "isFollowedBy": false
  }
}
```

---

### 2. Update User Profile

**Endpoint**: `PUT /users/:userId`

**Protected**: Yes (Only own profile)

**Request Body** (Multipart Form Data):
```
firstName: "John"
lastName: "Doe"
bio: "Updated bio"
profilePicture: <file>
coverImage: <file>
```

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Updated bio",
    "profilePicture": "https://cdn.trendora.com/users/507f1f77bcf86cd799439011/profile.jpg",
    "coverImage": "https://cdn.trendora.com/users/507f1f77bcf86cd799439011/cover.jpg"
  },
  "message": "Profile updated successfully"
}
```

---

### 3. Search Users

**Endpoint**: `GET /users/search?q=<query>&limit=20&page=1`

**Protected**: No

**Query Parameters**:
- `q` (required): Search query (username or name)
- `limit`: Items per page (default: 20, max: 50)
- `page`: Page number (default: 1)

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "profilePicture": "https://cdn.trendora.com/users/507f1f77bcf86cd799439011/profile.jpg",
      "isFollowing": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

---

## 📝 Post Endpoints

### 1. Create Post

**Endpoint**: `POST /posts`

**Protected**: Yes

**Request Body** (Multipart Form Data):
```
caption: "Beautiful sunset! 🌅"
images: <file1>, <file2>
hashtags: ["sunset", "nature", "photography"]
location: "San Francisco, CA"
visibility: "public"
```

**Success Response** (201):
```json
{
  "success": true,
  "status": 201,
  "data": {
    "postId": "507f1f77bcf86cd799439012",
    "author": {
      "userId": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "profilePicture": "https://cdn.trendora.com/users/507f1f77bcf86cd799439011/profile.jpg"
    },
    "caption": "Beautiful sunset! 🌅",
    "images": [
      "https://cdn.trendora.com/posts/507f1f77bcf86cd799439012/1.jpg"
    ],
    "hashtags": ["sunset", "nature", "photography"],
    "likesCount": 0,
    "commentsCount": 0,
    "sharesCount": 0,
    "visibility": "public",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Post created successfully"
}
```

---

### 2. Get Post Details

**Endpoint**: `GET /posts/:postId`

**Protected**: No

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": {
    "postId": "507f1f77bcf86cd799439012",
    "author": {
      "userId": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "profilePicture": "https://cdn.trendora.com/users/507f1f77bcf86cd799439011/profile.jpg",
      "isFollowing": false
    },
    "caption": "Beautiful sunset! 🌅",
    "images": [
      "https://cdn.trendora.com/posts/507f1f77bcf86cd799439012/1.jpg"
    ],
    "hashtags": ["sunset", "nature", "photography"],
    "likesCount": 42,
    "commentsCount": 8,
    "sharesCount": 5,
    "isLiked": false,
    "visibility": "public",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 3. Update Post

**Endpoint**: `PUT /posts/:postId`

**Protected**: Yes (Owner only)

**Request Body**:
```json
{
  "caption": "Updated caption",
  "hashtags": ["sunset", "nature"],
  "visibility": "friends"
}
```

**Success Response** (200): Similar to Get Post Details

---

### 4. Delete Post

**Endpoint**: `DELETE /posts/:postId`

**Protected**: Yes (Owner only)

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "Post deleted successfully"
}
```

---

## ❤️ Like Endpoints

### 1. Like Post

**Endpoint**: `POST /posts/:postId/like`

**Protected**: Yes

**Success Response** (201):
```json
{
  "success": true,
  "status": 201,
  "data": {
    "postId": "507f1f77bcf86cd799439012",
    "isLiked": true,
    "likesCount": 43
  },
  "message": "Post liked successfully"
}
```

---

### 2. Unlike Post

**Endpoint**: `DELETE /posts/:postId/like`

**Protected**: Yes

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": {
    "postId": "507f1f77bcf86cd799439012",
    "isLiked": false,
    "likesCount": 42
  },
  "message": "Post unliked successfully"
}
```

---

## 👤 Follow Endpoints

### 1. Follow User

**Endpoint**: `POST /users/:userId/follow`

**Protected**: Yes

**Success Response** (201):
```json
{
  "success": true,
  "status": 201,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "isFollowing": true,
    "followersCount": 251
  },
  "message": "User followed successfully"
}
```

---

### 2. Unfollow User

**Endpoint**: `DELETE /users/:userId/follow`

**Protected**: Yes

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "isFollowing": false,
    "followersCount": 250
  },
  "message": "User unfollowed successfully"
}
```

---

### 3. Get User Followers

**Endpoint**: `GET /users/:userId/followers?limit=20&page=1`

**Protected**: No

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "userId": "507f1f77bcf86cd799439013",
      "username": "janedoe",
      "firstName": "Jane",
      "lastName": "Doe",
      "profilePicture": "https://cdn.trendora.com/users/507f1f77bcf86cd799439013/profile.jpg",
      "isFollowing": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 250,
    "pages": 13,
    "hasNextPage": true
  }
}
```

---

### 4. Get User Following

**Endpoint**: `GET /users/:userId/following?limit=20&page=1`

**Protected**: No

**Success Response** (200): Similar to Get User Followers

---

## 💬 Comment Endpoints

### 1. Create Comment

**Endpoint**: `POST /posts/:postId/comments`

**Protected**: Yes

**Request Body**:
```json
{
  "text": "Amazing photo! 📸",
  "parentComment": null
}
```

**Success Response** (201):
```json
{
  "success": true,
  "status": 201,
  "data": {
    "commentId": "507f1f77bcf86cd799439014",
    "postId": "507f1f77bcf86cd799439012",
    "author": {
      "userId": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "profilePicture": "https://cdn.trendora.com/users/507f1f77bcf86cd799439011/profile.jpg"
    },
    "text": "Amazing photo! 📸",
    "likesCount": 0,
    "repliesCount": 0,
    "createdAt": "2024-01-15T11:00:00Z"
  },
  "message": "Comment created successfully"
}
```

---

### 2. Get Post Comments

**Endpoint**: `GET /posts/:postId/comments?limit=20&page=1`

**Protected**: No

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "commentId": "507f1f77bcf86cd799439014",
      "postId": "507f1f77bcf86cd799439012",
      "author": {
        "userId": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "profilePicture": "https://cdn.trendora.com/users/507f1f77bcf86cd799439011/profile.jpg"
      },
      "text": "Amazing photo! 📸",
      "likesCount": 2,
      "repliesCount": 1,
      "isLiked": false,
      "createdAt": "2024-01-15T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  }
}
```

---

### 3. Update Comment

**Endpoint**: `PUT /comments/:commentId`

**Protected**: Yes (Owner only)

**Request Body**:
```json
{
  "text": "Updated comment text"
}
```

**Success Response** (200): Similar to Get Post Comments (single comment)

---

### 4. Delete Comment

**Endpoint**: `DELETE /comments/:commentId`

**Protected**: Yes (Owner only)

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "Comment deleted successfully"
}
```

---

## 🏠 Feed Endpoints

### 1. Get Personalized Feed

**Endpoint**: `GET /feed?limit=20&page=1`

**Protected**: Yes

**Query Parameters**:
- `limit`: Items per page (default: 20, max: 50)
- `page`: Page number (default: 1)

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "postId": "507f1f77bcf86cd799439012",
      "author": {
        "userId": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "profilePicture": "https://cdn.trendora.com/users/507f1f77bcf86cd799439011/profile.jpg"
      },
      "caption": "Beautiful sunset! 🌅",
      "images": ["https://cdn.trendora.com/posts/507f1f77bcf86cd799439012/1.jpg"],
      "likesCount": 42,
      "commentsCount": 8,
      "isLiked": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNextPage": true
  }
}
```

---

### 2. Get Trending Posts

**Endpoint**: `GET /feed/trending?timeRange=24h&limit=20&page=1`

**Protected**: No

**Query Parameters**:
- `timeRange`: "24h", "7d", "30d" (default: "24h")
- `limit`: Items per page (default: 20)
- `page`: Page number (default: 1)

**Success Response** (200): Similar to Personalized Feed

---

### 3. Get Explore Feed

**Endpoint**: `GET /feed/explore?limit=20&page=1`

**Protected**: No

**Success Response** (200): Similar to Personalized Feed

---

## 🔔 Notification Endpoints

### 1. Get Notifications

**Endpoint**: `GET /notifications?limit=20&page=1&unread=false`

**Protected**: Yes

**Query Parameters**:
- `limit`: Items per page (default: 20)
- `page`: Page number (default: 1)
- `unread`: Filter unread only (default: false)

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "notificationId": "507f1f77bcf86cd799439015",
      "type": "like",
      "actor": {
        "userId": "507f1f77bcf86cd799439013",
        "username": "janedoe",
        "profilePicture": "https://cdn.trendora.com/users/507f1f77bcf86cd799439013/profile.jpg"
      },
      "title": "Jane Doe liked your post",
      "message": "Jane Doe liked your post",
      "actionUrl": "/posts/507f1f77bcf86cd799439012",
      "isRead": false,
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "pages": 1,
    "unreadCount": 3
  }
}
```

---

### 2. Mark Notification as Read

**Endpoint**: `PUT /notifications/:notificationId`

**Protected**: Yes

**Request Body**:
```json
{
  "isRead": true
}
```

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "Notification marked as read"
}
```

---

### 3. Mark All Notifications as Read

**Endpoint**: `PUT /notifications/read-all`

**Protected**: Yes

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "All notifications marked as read"
}
```

---

### 4. Delete Notification

**Endpoint**: `DELETE /notifications/:notificationId`

**Protected**: Yes

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "Notification deleted successfully"
}
```

---

## 📋 Summary

| Feature | Endpoints | Count |
|---------|-----------|-------|
| Authentication | 6 | 6 |
| Users | 3 | 3 |
| Posts | 4 | 4 |
| Likes | 2 | 2 |
| Follows | 4 | 4 |
| Comments | 4 | 4 |
| Feed | 3 | 3 |
| Notifications | 4 | 4 |
| **Total** | | **30** |

---

## 🔗 Related Documents

- [PHASE_1.md](./PHASE_1.md) - Database schema and system design
- [README.md](../README.md) - Project overview

---

**API Specification Complete!** 🚀
