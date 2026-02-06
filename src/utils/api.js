// frontend/src/utils/api.js
import axios from "axios";
import { showAlert } from "../context/AlertContext";

// Import axios for direct use in token refresh (avoiding recursion)
const axiosDirect = axios.create();

let hasShownRateLimitAlert = false;

// Dynamic API URL detection for production
// const getAPIURL = () => {
//   // Use environment variable if set
//   if (import.meta.env.VITE_API_URL) {
//     return import.meta.env.VITE_API_URL;
//   }
  
//   // For production (cloudflared tunnel), use current hostname
//   const hostname = window.location.hostname;
//   const protocol = window.location.protocol;
//   const port = window.location.port;
  
//   // If port exists and not standard ports, include it
//   if (port && port !== '80' && port !== '443' && port !== '3000') {
//     return `${protocol}//${hostname}:${port}/api`;
//   }
  
//   // For cloudflared tunnel (no port in URL), use same hostname
//   if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
//     // Production: assume backend on same domain or port 5000
//     // If backend is on different port, set REACT_APP_API_URL env var
//     return `${protocol}//${hostname}${port ? ':' + port : ''}/api`;
//   }
  
//   // Development fallback
//   return "http://localhost:5000/api";
// };
const getAPIURL = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_API_BASE_URL) {
    return `${import.meta.env.VITE_API_BASE_URL}/api`;
  }

  // For production (cloudflared tunnel), use current hostname
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // If port exists and not standard ports, include it
  if (port && port !== '80' && port !== '443' && port !== '3000') {
    return `${protocol}//${hostname}:${port}/api`;
  }
  
  // For cloudflared tunnel (no port in URL), use same hostname
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${protocol}//${hostname}${port ? ':' + port : ''}/api`;
  }
  
  // Development fallback
  return "http://localhost:5000/api";
};


const API_URL = getAPIURL();
// const API_URL =
//   import.meta.env.VITE_API_URL ||
//   "https://api.dailymindeducation.com/api";


// Log the API URL for debugging
console.log("🌐 API Base URL:", API_URL);

const API = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add token to requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Proactive token refresh - refresh token before it expires
let tokenRefreshTimer = null;

const scheduleTokenRefresh = () => {
  // Clear existing timer
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
  }

  // Refresh token 2 minutes before expiration (15 min - 2 min = 13 min)
  const refreshDelay = 13 * 60 * 1000; // 13 minutes

  tokenRefreshTimer = setTimeout(async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        const refreshResponse = await API.post("/auth/refresh", { refreshToken });
        const newAccessToken = refreshResponse.data.accessToken;
        localStorage.setItem("token", newAccessToken);
        console.log("✅ Token refreshed proactively");
        // Schedule next refresh
        scheduleTokenRefresh();
      } catch (error) {
        console.error("❌ Proactive token refresh failed:", error);
        // Don't redirect here - let the 401 handler deal with it
      }
    }
  }, refreshDelay);
};

// Schedule token refresh on app load if token exists
if (localStorage.getItem("token") && localStorage.getItem("refreshToken")) {
  scheduleTokenRefresh();
}

// Reconnect socket when token is refreshed
export const reconnectSocketOnTokenRefresh = () => {
  if (typeof window !== 'undefined') {
    import('../socket').then(({ reconnectSocket }) => {
      reconnectSocket();
    }).catch(() => {
      // Socket module not available, ignore
    });
  }
};

// Global Axios interceptor for error handling
API.interceptors.response.use(
  (response) => {
    // Schedule token refresh after successful requests
    if (response.config?.url?.includes('/auth/login') || response.config?.url?.includes('/auth/register')) {
      scheduleTokenRefresh();
    }
    return response;
  },
  async (error) => {
    // Don't log network errors that are expected (like connection closed during quiz)
    const isNetworkError = !error.response && error.message?.includes('Network');
    const isQuizEndpoint = error.config?.url?.includes('/quiz/');
    
    if (!isNetworkError || !isQuizEndpoint) {
      console.error("🚨 API Error:", error?.response || error);
    }

    const message =
      (typeof error?.response?.data === 'string' ? error.response.data :
       error?.response?.data?.message) ||
      error?.message ||
      "Network error occurred. Please try again.";

    // Show alert for errors (but not for rate limits during quiz)
    if (error.response?.status === 429) {
      if (!hasShownRateLimitAlert) {
        showAlert(message, 'danger', 3000);
        hasShownRateLimitAlert = true;
        // Reset after 1 minute
        setTimeout(() => { hasShownRateLimitAlert = false; }, 60000);
      }
    } else if (error.response?.status !== 401 && !isNetworkError) {
      // Don't show alerts for 401 or network errors during quiz
      showAlert(message, 'danger', 3000);
    }

    // Handle 401 unauthorized - try token refresh
    if (error.response?.status === 401 && !error.config._retry) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          // Try to refresh token (without using API to avoid recursion)
        const refreshResponse = await axiosDirect.post(`${API_URL}/auth/refresh`, { refreshToken }, {
          headers: { 'Content-Type': 'application/json' }
        });
        const newAccessToken = refreshResponse.data.accessToken;
        
        // Update stored token
        localStorage.setItem("token", newAccessToken);
        
        // Reconnect socket with new token (dynamically import to avoid circular dependency)
        import('../socket').then(({ reconnectSocket }) => {
          reconnectSocket();
        }).catch(() => {
          // Socket module not available, ignore
        });
        
        // Schedule next refresh
        scheduleTokenRefresh();
          
          // Retry the original request with new token
          error.config.headers.Authorization = `Bearer ${newAccessToken}`;
          error.config._retry = true;
          
          return API.request(error.config);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          // Refresh failed, remove tokens and redirect
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          if (tokenRefreshTimer) {
            clearTimeout(tokenRefreshTimer);
            tokenRefreshTimer = null;
          }
          if (!["/login", "/register"].includes(window.location.pathname)) {
            window.location.href = "/login";
          }
        }
      } else {
        // No refresh token, remove token and redirect
        localStorage.removeItem("token");
        if (tokenRefreshTimer) {
          clearTimeout(tokenRefreshTimer);
          tokenRefreshTimer = null;
        }
        if (!["/login", "/register"].includes(window.location.pathname)) {
          window.location.href = "/login";
        }
      }
    }

    error.message = message;
    return Promise.reject(error);
  }
);

export default API;