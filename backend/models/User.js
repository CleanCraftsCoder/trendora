/**
 * User Model
 * Stores user account and profile information
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Authentication
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },

    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      index: true,
      match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // Don't return password by default
    },

    // Profile Information
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: 50,
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: 50,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    profilePicture: {
      type: String,
      default: null,
    },

    coverImage: {
      type: String,
      default: null,
    },

    // Account Status
    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
      select: false,
    },

    verificationExpiry: {
      type: Date,
      select: false,
    },

    // Social Stats (Denormalized for performance)
    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    postsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Account Settings
    isPublic: {
      type: Boolean,
      default: true,
    },

    notificationsEnabled: {
      type: Boolean,
      default: true,
    },

    // AI & Recommendation Data (Phase 12)
    abGroup: {
      type: String,
      enum: ['A', 'B'],
      default: () => (Math.random() < 0.5 ? 'A' : 'B'),
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    preferenceVector: {
      type: [Number],
      default: [],
    },

    preferredHashtags: {
      type: [String],
      default: [],
    },

    preferredAuthors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    profileEmbedding: {
      type: [Number],
      default: [],
    },

    searchHistory: [
      {
        query: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Metadata
    lastLogin: {
      type: Date,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

/**
 * Indexes for performance
 */
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ updatedAt: -1 });

/**
 * Pre-save middleware to hash password
 */
userSchema.pre('save', async function hashPassword(next) {
  // Only hash if password is modified or new document
  if (!this.isModified('password')) return next();

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare password
 * @param {string} enteredPassword - Password entered by user
 * @returns {Promise<boolean>} Whether password matches
 */
userSchema.methods.comparePassword = async function comparePassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Method to get public user data (without sensitive info)
 * @returns {Object} Public user data
 */
userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.verificationExpiry;
  delete obj.ipAddress;
  return obj;
};

/**
 * Static method to find by email and select password
 * @param {string} email - User email
 * @returns {Promise<User>} User document with password
 */
userSchema.statics.findByEmailWithPassword = function findByEmailWithPassword(email) {
  return this.findOne({ email }).select('+password');
};

module.exports = mongoose.model('User', userSchema);
