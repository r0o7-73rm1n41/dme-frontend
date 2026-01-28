// frontend/src/context/AdminAuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api.js';
import AdminAPI from '../utils/adminApi.js';

const AdminAuthContext = createContext();

export default function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      console.log('Checking admin auth...');
      const response = await AdminAPI.get('/admin-auth/profile');
      console.log('Admin auth response:', response.data);
      if (response.data) {
        setAdmin(response.data);
      }
    } catch (error) {
      console.log('No admin session found:', error.response?.data || error.message);
      setAdmin(null);
      // Clear tokens if unauthorized
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('adminToken');
      }
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (credentials) => {
    try {
      console.log('Attempting admin login with:', credentials.phone);
      const response = await API.post('/admin-auth/login', credentials);
      console.log('Admin login response:', response.data);
      if (response.data) {
        // Backend returns { user: {...}, accessToken: ... }
        const admin = response.data.user || response.data.admin || response.data;
        console.log('Setting admin:', admin);
        setAdmin(admin);
        
        // Store admin tokens in localStorage for persistence
        const token = response.data.accessToken || response.data.token;
        const refreshToken = response.data.refreshToken;
        if (token) {
          localStorage.setItem('adminToken', token);
          // Also set as regular token for API calls
          localStorage.setItem('token', token);
        }
        if (refreshToken) {
          localStorage.setItem('adminRefreshToken', refreshToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        return { success: true, data: response.data };
      }
    } catch (error) {
      console.error('Admin login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const adminRegister = async (registrationData) => {
    try {
      const response = await API.post('/admin-auth/verify-otp', registrationData);
      if (response.data) {
        setAdmin(response.data.admin);
        // Store admin tokens in localStorage for persistence
        const token = response.data.token || response.data.accessToken;
        const refreshToken = response.data.refreshToken;
        if (token) {
          localStorage.setItem('adminToken', token);
          localStorage.setItem('token', token);
        }
        if (refreshToken) {
          localStorage.setItem('adminRefreshToken', refreshToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        return { success: true, data: response.data };
      }
    } catch (error) {
      console.error('Admin registration error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const sendAdminOtp = async (otpData) => {
    try {
      const response = await API.post('/admin-auth/send-otp', otpData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Send admin OTP error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to send OTP' 
      };
    }
  };

  const adminLogout = async () => {
    try {
      await AdminAPI.post('/admin-auth/logout');
    } catch (error) {
      console.error('Admin logout error:', error);
    } finally {
      setAdmin(null);
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  };

  const updateAdmin = (updatedAdmin) => {
    setAdmin(updatedAdmin);
  };

  const refreshAdmin = async () => {
    try {
      const response = await AdminAPI.get('/admin-auth/profile');
      if (response.data) {
        setAdmin(response.data);
      }
    } catch (error) {
      console.error('Refresh admin error:', error);
      setAdmin(null);
    }
  };

  const forgotAdminPassword = async (phone, email) => {
    try {
      const payload = phone ? { phone } : { email };
      const response = await API.post('/admin-auth/forgot-password', payload);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Forgot admin password error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to send reset OTP' 
      };
    }
  };

  const resetAdminPassword = async (payload) => {
    try {
      const response = await API.post('/admin-auth/reset-password', payload);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Reset admin password error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Password reset failed' 
      };
    }
  };

  const value = {
    admin,
    loading,
    adminLogin,
    adminRegister,
    sendAdminOtp,
    adminLogout,
    updateAdmin,
    refreshAdmin,
    checkAdminAuth,
    forgotAdminPassword,
    resetAdminPassword
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

