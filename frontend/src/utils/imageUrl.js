/**
 * Image URL Helper
 * Resolves static local assets or cloud storage URLs (e.g. Cloudinary)
 */
export const getImageUrl = (path) => {
  if (!path) return '';
  
  // If the path is already an absolute URL (local dev or cloud storage), return as-is
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  
  // Retrieve CDN configuration from environment
  const cdnUrl = import.meta.env.VITE_CDN_URL || 'http://localhost:5000/uploads';
  
  // Strip trailing /uploads to build backend base url
  const cdnBase = cdnUrl.replace(/\/uploads\/?$/, '');
  
  // Ensure the relative path starts with a slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cdnBase}${cleanPath}`;
};
