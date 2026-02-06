// frontend/src/utils/imageHelper.js
// For local storage, images are served from /images/ route (not /uploads/images/)

// Dynamic API base URL detection for production
const getAPIBase = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace("/api", "");
  }
  
  // For production (cloudflared tunnel), use current hostname
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // If port exists and not standard ports, include it
  if (port && port !== '80' && port !== '443' && port !== '3000') {
    return `${protocol}//${hostname}:${port}`;
  }
  
  // For cloudflared tunnel (no port in URL), use same hostname
  // Backend should be accessible on same domain or configured port
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Production: assume backend on same domain or port 5000
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
  }
  
  // Development fallback
  return "http://localhost:5000";
};

export const getImageURL = (path) => {
  if (!path) return "/default-user.png";

  // Already full URL (Cloudinary, S3, or external)
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // Cloudinary public_id format - generate Cloudinary URL
  // Cloudinary public_id can contain folder structure (e.g., "profile-images/xyz" or "blogs/xyz")
  const cloudName = 'dabplosxc'; // From backend config
  const publicId = path.replace(/^\/+/, ""); // Remove leading slashes
  
  // Check if it's a profile image (profile-images folder) or blog image
  if (publicId.includes('profile-images/') || publicId.includes('blogs/')) {
    // Profile images: use face detection and crop
    if (publicId.includes('profile-images/')) {
      return `https://res.cloudinary.com/${cloudName}/image/upload/w_400,h_400,c_fill,g_face,q_auto,f_auto/${publicId}`;
    }
    // Blog images: use fit crop
    return `https://res.cloudinary.com/${cloudName}/image/upload/w_800,h_600,c_fill,q_auto,f_auto/${publicId}`;
  }
  
  // Default: assume it's a profile image or use generic transformation
  // If public_id doesn't contain folder, it might be a direct upload
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_400,h_400,c_fill,q_auto,f_auto/${publicId}`;
};

// Helper for PDF URLs (Cloudinary)
export const getPDFURL = (path) => {
  if (!path) return null;

  // Already full URL (Cloudinary or external)
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // Cloudinary public_id format - use backend API endpoint for signed URLs
  // PDFs should be accessed via backend endpoint for security
  // const API_BASE = getAPIBase(); // Unused - PDFs handled via backend endpoint
  // Extract blogId from path if possible, otherwise return null
  // This will be handled by the backend endpoint /blogs/:blogId/pdf
  return null; // Return null to force using backend endpoint
};
