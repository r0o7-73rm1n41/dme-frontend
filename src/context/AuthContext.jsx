// // frontend/src/context/AuthContext.jsx

import React, { createContext, useEffect, useState } from "react";
import API from "../utils/api";
import { showAlert } from "./AlertContext";
import { socket } from "../socket";

console.log("✅ API_URL being used:", API.defaults.baseURL);


export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      (async () => {
        try {
          const res = await API.get("/auth/me");
          // Backend returns { user: {...} }
          const userData = res.data.user || res.data;
          // Ensure role is set
          const userWithRole = {
            ...userData,
            role: userData.role || 'USER'
          };
          setUser(userWithRole);
          // Connect socket when user is authenticated
          if (!socket.connected) {
            socket.connect();
          }
        } catch (err) {
          showAlert("Authentication check failed. Please login again.", "danger");
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          setUser(null);
          // Disconnect socket on auth failure
          if (socket.connected) {
            socket.disconnect();
          }
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
      // Disconnect socket if no token
      if (socket.connected) {
        socket.disconnect();
      }
    }
  }, []);

  const sendOtp = async (phone) => {
    // Centralized sendOtp which also persists resend cooldown info to localStorage
    const normalized = normalizePhone(phone);
    try {
      const res = await API.post("/auth/register/otp", { phone: normalized });
      // Use server-provided retryAfter when available
      const serverRetry = res?.data?.retryAfter || res?.data?.full?.retryAfter || null;
      if (serverRetry) {
        setResendUntil(normalized, Number(serverRetry));
      } else {
        // default 60s cooldown after send
        setResendUntil(normalized, 60);
      }
      return res;
    } catch (error) {
      // If server provided retry info on error (429), honor it
      const retry = error?.response?.data?.retryAfter || error?.response?.data?.retry_after || null;
      if (retry) setResendUntil(normalized, Number(retry));
      throw error;
    }
  };

  // Helpers for resend persistence (per-phone)
  const RESEND_KEY = (phone) => `otp_resend_until:${phone}`;
  const RESEND_TTL_KEY = (phone) => `otp_resend_ttl:${phone}`;

  const normalizePhone = (phone) => {
    if (!phone) return "";
    const sanitized = String(phone).replace(/\D/g, "").replace(/^0+/, "");
    if (sanitized.length > 10 && sanitized.startsWith("91")) return sanitized.slice(-10);
    if (sanitized.length > 10) return sanitized.slice(-10);
    return sanitized;
  };

  const setResendUntil = (phone, secondsFromNow) => {
    try {
      const until = Date.now() + Number(secondsFromNow) * 1000;
      localStorage.setItem(RESEND_KEY(phone), String(until));
      localStorage.setItem(RESEND_TTL_KEY(phone), String(Number(secondsFromNow)));
    } catch (e) {
      // ignore storage errors
    }
  };

  const getResendUntil = (phone) => {
    try {
      const raw = localStorage.getItem(RESEND_KEY(phone));
      if (!raw) return null;
      const until = Number(raw);
      if (Number.isNaN(until)) return null;
      return until;
    } catch (e) {
      return null;
    }
  };

  const getResendRemaining = (phone) => {
    const normalized = normalizePhone(phone);
    const until = getResendUntil(normalized);
    if (!until) return 0;
    const sec = Math.ceil(Math.max(0, (until - Date.now()) / 1000));
    return sec;
  };

  const getResendInitialTtl = (phone) => {
    try {
      const normalized = normalizePhone(phone);
      const raw = localStorage.getItem(RESEND_TTL_KEY(normalized));
      if (!raw) return 60;
      const ttl = Number(raw);
      if (Number.isNaN(ttl)) return 60;
      return ttl;
    } catch (e) {
      return 60;
    }
  };

  // --- Email resend persistence (same semantics as phone, keyed by email)
  const RESEND_EMAIL_KEY = (email) => `otp_resend_until:email:${email}`;
  const RESEND_EMAIL_TTL_KEY = (email) => `otp_resend_ttl:email:${email}`;

  const setResendUntilEmail = (email, secondsFromNow) => {
    try {
      const until = Date.now() + Number(secondsFromNow) * 1000;
      localStorage.setItem(RESEND_EMAIL_KEY(email), String(until));
      localStorage.setItem(RESEND_EMAIL_TTL_KEY(email), String(Number(secondsFromNow)));
    } catch (e) {
      // ignore storage errors
    }
  };

  const getResendUntilEmail = (email) => {
    try {
      const raw = localStorage.getItem(RESEND_EMAIL_KEY(email));
      if (!raw) return null;
      const until = Number(raw);
      if (Number.isNaN(until)) return null;
      return until;
    } catch (e) {
      return null;
    }
  };

  const getResendRemainingEmail = (email) => {
    try {
      if (!email) return 0;
      const rawUntil = getResendUntilEmail(email);
      if (!rawUntil) return 0;
      const sec = Math.ceil(Math.max(0, (rawUntil - Date.now()) / 1000));
      return sec;
    } catch (e) {
      return 0;
    }
  };

  const getResendInitialTtlEmail = (email) => {
    try {
      const raw = localStorage.getItem(RESEND_EMAIL_TTL_KEY(email));
      if (!raw) return 60;
      const ttl = Number(raw);
      if (Number.isNaN(ttl)) return 60;
      return ttl;
    } catch (e) {
      return 60;
    }
  };

  const sendEmailOtp = async (email) => {
    try {
      const res = await API.post("/auth/register/otp", { email });
      const serverRetry = res?.data?.retryAfter || res?.data?.full?.retryAfter || null;
      if (serverRetry) {
        setResendUntilEmail(email, Number(serverRetry));
      } else {
        setResendUntilEmail(email, 60);
      }
      return res;
    } catch (error) {
      const retry = error?.response?.data?.retryAfter || error?.response?.data?.retry_after || null;
      if (retry) setResendUntilEmail(email, Number(retry));
      throw error;
    }
  };

  const formatSecondsMMSS = (seconds) => {
    const s = Math.max(0, Number(seconds) || 0);
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const verifyOtp = async (payload) => {
    try {
      const res = await API.post("/auth/verify-otp", payload);
      if (res?.data?.user) {
        // Ensure role is set (default to USER)
        const userData = {
          ...res.data.user,
          role: res.data.user.role || 'USER'
        };
        setUser(userData);
        
        // backend may return either `token` or `accessToken` depending on implementation
        const token = res.data.token || res.data.accessToken;
        const refreshToken = res.data.refreshToken;
        if (token) {
          localStorage.setItem("token", token);
        }
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
      }
      return res;
    } catch (error) {
      throw error;
    }
  };

  const register = async (payload) => {
    try {
      const res = await API.post("/auth/register", payload);
      if (res?.data?.user) {
        // Store both access and refresh tokens
        const accessToken = res.data.accessToken;
        const refreshToken = res.data.refreshToken;
        
        if (accessToken) {
          localStorage.setItem("token", accessToken);
        }
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        
        // Set user immediately from registration response with role
        const userData = {
          ...res.data.user,
          role: res.data.user.role || 'USER'  // Ensure role is set
        };
        setUser(userData);
        
        // Then fetch full user data to update profile completeness and other details
        try {
          const userRes = await API.get("/auth/me");
          if (userRes?.data?.user) {
            setUser(userRes.data.user);
          }
        } catch (err) {
          console.warn("Failed to fetch full user profile after registration:", err);
          // Keep the user set from registration response
        }
      }
      showAlert("Registration successful!", "success", 3000);
      return res;
    } catch (error) {
      throw error;
    }
  };

  const login = async (phone, password, email) => {
    try {
      // Ensure password is a string
      if (!password || typeof password !== 'string') {
        throw new Error("Password is required");
      }
      
      const payload = phone ? { phone, password } : { email, password };
      const res = await API.post("/auth/login", payload);
      const token = res.data.token || res.data.accessToken;
      const refreshToken = res.data.refreshToken;
      if (token) {
        localStorage.setItem("token", token);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        // Set user from login response with default role
        const userData = {
          ...(res.data.user || res.data),
          role: (res.data.user?.role || res.data?.role) || 'USER'
        };
        setUser(userData);
        
        // Fetch profile immediately after login to ensure UI updates
        try {
          const profileRes = await API.get("/auth/me", {
            withCredentials: true,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (profileRes?.data?.user) {
            const fullUserData = {
              ...profileRes.data.user,
              role: profileRes.data.user.role || 'USER'
            };
            setUser(fullUserData);
          } else if (res?.data?.user) {
            setUser(userData);
          }
        } catch (profileError) {
          console.warn("Profile fetch failed after login, using response data:", profileError);
          // Fallback to user data from login response
          if (res?.data?.user) {
            setUser(userData);
          }
        }
      } else if (res?.data?.user) {
        const userData = {
          ...res.data.user,
          role: res.data.user.role || 'USER'
        };
        setUser(userData);
      }
      showAlert("Login successful!", "success", 3000);
      // Connect socket after successful login
      if (!socket.connected) {
        socket.connect();
      }
      return res;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (e) {
      // ignore errors
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      // Disconnect socket on logout
      if (socket.connected) {
        socket.disconnect();
      }
    }
  };

  const updateUser = (updatedUser) => {
    setUser(prevUser => ({ ...prevUser, ...updatedUser }));
  };

  const refreshUser = async () => {
    try {
      const res = await API.get("/auth/me");
      setUser(res.data.user);
    } catch (err) {
      showAlert("Failed to refresh user data", "danger");
    }
  };

  const forgotPassword = async (phone, email) => {
    try {
      const payload = phone ? { phone } : { email };
      const res = await API.post("/auth/password/otp", payload);
      return res;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (payload) => {
    try {
      const res = await API.post("/auth/password/reset", payload);
      return res;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sendOtp,
        normalizePhone,
        getResendRemaining,
        getResendInitialTtl,
  // email helpers
  sendEmailOtp,
  getResendRemainingEmail,
  getResendInitialTtlEmail,
        formatSecondsMMSS,
        verifyOtp,
        register,
        login,
        logout,
        updateUser,
        refreshUser,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
