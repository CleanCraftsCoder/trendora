const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/environment');

let storage;

const isCloudinaryConfigured = 
  config.CLOUDINARY_CLOUD_NAME && 
  config.CLOUDINARY_API_KEY && 
  config.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  });


  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      let folder = 'trendora/misc';
      if (file.fieldname === 'profilePicture') {
        folder = 'trendora/profile-pictures';
      } else if (file.fieldname === 'coverImage') {
        folder = 'trendora/cover-images';
      } else if (file.fieldname === 'images') {
        folder = 'trendora/posts';
      } else if (file.fieldname === 'image') {
        folder = 'trendora/temp';
      }
      
      return {
        folder: folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      };
    },
  });
} else {
  const createDirIfNotExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      let dest = config.MULTER_UPLOAD_PATH || './uploads';
      
      if (file.fieldname === 'profilePicture') {
        dest = path.join(dest, 'profile-pictures');
      } else if (file.fieldname === 'coverImage') {
        dest = path.join(dest, 'cover-images');
      } else if (file.fieldname === 'images') {
        dest = path.join(dest, 'posts');
      } else if (file.fieldname === 'image') {
        dest = path.join(dest, 'temp');
      }
      
      createDirIfNotExists(dest);
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  });
}

const fileFilter = (req, file, cb) => {
  const allowed = (config.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(',');
  
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE || 5242880, // Default 5MB
  },
  fileFilter: fileFilter,
});

upload.getFileUrl = (file) => {
  if (!file) return '';
  if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
    return file.path;
  }
  
  let subfolder = '';
  if (file.fieldname === 'profilePicture') {
    subfolder = 'profile-pictures/';
  } else if (file.fieldname === 'coverImage') {
    subfolder = 'cover-images/';
  } else if (file.fieldname === 'images') {
    subfolder = 'posts/';
  } else if (file.fieldname === 'image') {
    subfolder = 'temp/';
  }
  return `/uploads/${subfolder}${file.filename}`;
};

module.exports = upload;
