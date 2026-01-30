// frontend/src/socket.js
import { io } from "socket.io-client";

// Get auth token from localStorage
const token = localStorage.getItem("token");

// Determine the base URL for Socket.IO (should connect to backend, not frontend)
const getSocketURL = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api$/, "");
  }
  
  // For production (cloudflared tunnel), use current hostname
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // Development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5000";
  }
  
  // Production: use same hostname (cloudflared tunnel)
  // Backend should be accessible on same domain
  return `${protocol}//${hostname}${port && port !== '80' && port !== '443' && port !== '3000' ? ':' + port : ''}`;
};

const SOCKET_URL = getSocketURL();

console.log("🔌 Socket.IO URL:", SOCKET_URL);

// Initialize socket with dynamic token
const getSocketAuth = () => {
  const currentToken = localStorage.getItem("token");
  return { token: currentToken };
};

// Initialize socket
export const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"], // fallback to polling if websocket fails
  auth: getSocketAuth,
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Function to reconnect socket with new token
export const reconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
  socket.auth = getSocketAuth;
  socket.connect();
};

// Handle connection events for debugging
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("connect_error", async (err) => {
  console.error("❌ Socket connection error:", err.message);
  
  // If auth failed, try refreshing token and reconnecting
  if (err.message.includes('Authentication') || err.message.includes('jwt')) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        // Try to refresh token
        const axios = (await import('axios')).default;
        // Use same URL as socket but with /api path
        const API_URL = SOCKET_URL + '/api';
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, {
          headers: { 'Content-Type': 'application/json' }
        });
        const newAccessToken = refreshResponse.data.accessToken;
        localStorage.setItem("token", newAccessToken);
        
        // Update socket auth and reconnect
        socket.auth = getSocketAuth;
        socket.connect();
        console.log("✅ Socket reconnected with refreshed token");
      } catch (refreshError) {
        console.error("❌ Token refresh failed for socket:", refreshError);
      }
    }
  } else {
    console.log("📡 Falling back to polling...");
  }
});

socket.on("disconnect", (reason) => {
  console.warn("⚠️ Socket disconnected:", reason);
});
// });
