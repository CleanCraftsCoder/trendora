# Trendora Backend

Node.js/Express backend for Trendora - An AI-powered social media platform.

## 🚀 Quick Start

### Prerequisites
- Node.js v16 or higher
- npm v8 or higher
- MongoDB (local or MongoDB Atlas)
- Git

### Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trendora
   JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_minimum_32_characters
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Server will start on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── config/
│   ├── environment.js       # Environment variables
│   ├── database.js          # MongoDB configuration
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
│   ├── validation.js        # Input validation
│   └── auth.js              # Authentication (Phase 3)
├── utils/
│   ├── logger.js            # Winston logger
│   ├── response.js          # Response formatter
│   └── validators.js        # Validation helpers
├── routes/                  # API routes (Phase 3+)
├── controllers/             # Route controllers (Phase 3+)
├── services/                # Business logic (Phase 3+)
├── app.js                   # Express app
├── server.js                # Server startup
├── package.json             # Dependencies
└── .env.example             # Environment template
```

## 📚 Available Scripts

### Development
```bash
npm run dev          # Start development server with hot reload
npm start            # Start production server
```

### Testing & Quality
```bash
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Check code style
npm run lint:fix     # Fix code style issues
```

### Database
```bash
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available variables:

**Core Configuration**
- `NODE_ENV` - Environment (development/production/test)
- `PORT` - Server port (default: 5000)
- `APP_NAME` - Application name

**Database**
- `MONGODB_URI` - MongoDB connection string
- `DB_NAME` - Database name

**Authentication**
- `JWT_SECRET` - JWT signing key
- `JWT_ACCESS_EXPIRY` - Access token expiry
- `JWT_REFRESH_EXPIRY` - Refresh token expiry
- `JWT_REFRESH_SECRET` - Refresh token key

**Redis Cache**
- `REDIS_HOST` - Redis server host
- `REDIS_PORT` - Redis server port
- `REDIS_PASSWORD` - Redis password

**Logging**
- `LOG_LEVEL` - Log level (error/warn/info/debug)
- `LOG_DIR` - Log directory
- `LOG_FILE` - Log filename

**File Upload**
- `MULTER_UPLOAD_PATH` - Upload directory
- `MAX_FILE_SIZE` - Max file size (bytes)
- `ALLOWED_FILE_TYPES` - Allowed MIME types

**AWS S3 (Optional)**
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET` - S3 bucket name
- `AWS_S3_REGION` - AWS region

**CORS**
- `CORS_ORIGIN` - Allowed origins (comma-separated)

## 🗄️ Database Schema

### Collections

All collections are properly indexed for performance:

**User** - User accounts and profiles
**Post** - Social media posts with images
**Comment** - Post comments with nested replies
**Like** - Like tracking for posts/comments
**Follow** - User follow relationships
**Notification** - Real-time notifications

See `docs/PHASE_1.md` for detailed schema documentation.

## 🔐 Security Features

- ✅ Password hashing with bcryptjs
- ✅ JWT authentication
- ✅ CORS configuration
- ✅ Helmet for security headers
- ✅ Input validation and sanitization
- ✅ Error handling
- ✅ Rate limiting (configured)
- ✅ MongoDB injection prevention

## 🚨 Error Handling

All errors follow a standardized format:

```json
{
  "success": false,
  "status": 400,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
```

Error codes are defined in `config/constants.js`.

## 📝 Logging

Winston logger configured with:
- Console output with colors
- File logging
- Error log rotation
- Configurable log levels

Logs stored in `logs/` directory.

## 🧪 Testing

Tests will be added in later phases. When implemented:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test -- --coverage  # With coverage
```

## 📡 API Endpoints

Endpoints will be added in subsequent phases:
- **Phase 3** - Authentication endpoints
- **Phase 4** - User endpoints
- **Phase 5** - Post endpoints
- **Phase 6+** - Additional features

See `docs/API_SPECIFICATION.md` for complete endpoint documentation.

## 🔄 Database Connection

MongoDB connection is established automatically on server startup:

```
✅ Connected to MongoDB
✅ Connection pooling configured
✅ Reconnection logic enabled
✅ Event listeners set up
```

Connection events are logged to console and file.

## 🛠️ Development Tips

1. **Code Organization**: Follow the folder structure strictly
2. **Error Handling**: Use `asyncHandler` middleware for async routes
3. **Logging**: Use logger instance for all logging
4. **Validation**: Use validation rules from `middlewares/validation.js`
5. **Response Format**: Use response utilities from `utils/response.js`
6. **Database Operations**: Use Mongoose methods with proper error handling

## 📋 Checklist for Phase 2

- [x] package.json created with all dependencies
- [x] Environment configuration set up
- [x] MongoDB connection configured
- [x] All 6 Mongoose schemas created with indexes
- [x] Logger configured (Winston)
- [x] Response formatter utilities created
- [x] Validation helpers created
- [x] Error handler middleware created
- [x] Input validation middleware created
- [x] Express app configured
- [x] Server startup file created
- [x] Graceful shutdown implemented
- [x] Health check endpoint added

## 🚀 Next Phase

**Phase 3: Authentication System** will add:
- Registration endpoint
- Login endpoint
- JWT token generation
- Protected route middleware
- Password reset flow
- Email verification

## 📚 Documentation

- [Phase 2 Documentation](../docs/PHASE_2.md)
- [API Specification](../docs/API_SPECIFICATION.md)
- [System Architecture](../docs/ARCHITECTURE.md)
- [Database Schema](../docs/PHASE_1.md)

## 🤝 Contributing

When adding new features:
1. Follow the existing code style
2. Add proper error handling
3. Log important events
4. Update relevant documentation
5. Test thoroughly before commit

## 📞 Support

For issues or questions:
1. Check documentation first
2. Review error logs
3. Check MongoDB connection
4. Verify environment variables

## 📄 License

MIT License - See LICENSE file for details

---

**Phase 2 Status**: ✅ COMPLETE

Ready to move to Phase 3: Authentication System

Start with: `npm run dev`
