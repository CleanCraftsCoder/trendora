/**
 * Trend Model
 * Stores hashtag frequency stats, calculated trending scores, and associated posts
 */

const mongoose = require('mongoose');

const trendSchema = new mongoose.Schema(
  {
    hashtag: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Current window usage (last 24 hours)
    currentCount: {
      type: Number,
      default: 0,
    },

    // Historical window usage (24 hours to 7 days)
    previousCount: {
      type: Number,
      default: 0,
    },

    // Calculated trending score
    score: {
      type: Number,
      default: 0,
      index: true,
    },

    // Whether this is a fast-growing, emerging topic
    isEmerging: {
      type: Boolean,
      default: false,
    },

    // Hydrated posts carrying this hashtag
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],

    // Usage counts over time for time-series analytics
    countHistory: [
      {
        count: {
          type: Number,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'trends',
  }
);

module.exports = mongoose.model('Trend', trendSchema);
