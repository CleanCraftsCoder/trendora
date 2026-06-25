/**
 * Notification Model
 * Stores user notifications for real-time updates
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Recipient
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // Actor (who performed the action)
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor is required'],
    },

    // Notification Type
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'mention', 'share'],
      required: [true, 'Notification type is required'],
    },

    // Related Content
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },

    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },

    // Message
    title: {
      type: String,
      required: [true, 'Title is required'],
    },

    message: {
      type: String,
      trim: true,
      default: '',
    },

    // Action URL for navigation
    actionUrl: {
      type: String,
      required: [true, 'Action URL is required'],
    },

    // Status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'notifications',
  }
);

/**
 * Indexes for performance
 */
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ actor: 1, createdAt: -1 });
notificationSchema.index({ post: 1 });
notificationSchema.index({ comment: 1 });

/**
 * Middleware to update readAt when marking as read
 */
notificationSchema.pre('findOneAndUpdate', function updateReadAt(next) {
  if (this.getUpdate().$set && this.getUpdate().$set.isRead === true) {
    this.getUpdate().$set.readAt = new Date();
  }
  next();
});

/**
 * Static method to get user's notifications
 * @param {string} userId - User ID
 * @param {number} limit - Items to return
 * @param {number} skip - Items to skip
 * @param {boolean} unreadOnly - Return only unread notifications
 * @returns {Promise<Array>} Array of notifications
 */
notificationSchema.statics.getUserNotifications = function getUserNotifications(
  userId,
  limit = 20,
  skip = 0,
  unreadOnly = false
) {
  const query = { userId };

  if (unreadOnly) {
    query.isRead = false;
  }

  return this.find(query)
    .populate('actor', 'username profilePicture firstName lastName')
    .populate('post', 'caption images')
    .populate('comment', 'text')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get unread count
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
notificationSchema.statics.getUnreadCount = function getUnreadCount(userId) {
  return this.countDocuments({
    userId,
    isRead: false,
  });
};

/**
 * Static method to mark all as read
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update result
 */
notificationSchema.statics.markAllAsRead = function markAllAsRead(userId) {
  return this.updateMany(
    { userId, isRead: false },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};

/**
 * Static method to delete old notifications (older than 30 days)
 * @returns {Promise<Object>} Delete result
 */
notificationSchema.statics.deleteOldNotifications = function deleteOldNotifications() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return this.deleteMany({
    createdAt: { $lt: thirtyDaysAgo },
    isRead: true,
  });
};

/**
 * Static method to create notification from event
 * @param {Object} data - Notification data
 * @returns {Promise<Notification>} Created notification
 */
notificationSchema.statics.createFromEvent = function createFromEvent(data) {
  return this.create({
    userId: data.userId,
    actor: data.actorId,
    type: data.type,
    post: data.postId || null,
    comment: data.commentId || null,
    title: data.title,
    message: data.message || '',
    actionUrl: data.actionUrl,
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
