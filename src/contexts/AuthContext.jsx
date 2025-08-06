import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import socketService from '../lib/socket';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const refresh = localStorage.getItem('refreshToken');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setAccessToken(token);
      setRefreshToken(refresh);
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
      
      // Connect to socket with token
      socketService.connect(token);
      if (JSON.parse(userData)._id) {
        socketService.joinPersonalRoom(JSON.parse(userData)._id);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email) => {
    try {
      const response = await authAPI.login(email);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await authAPI.verify(email, otp);
      
      if (response.success) {
        const { accessToken: token, refreshToken: refresh, user: userData } = response.result;
        
        // Store tokens and user data
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refresh);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setAccessToken(token);
        setRefreshToken(refresh);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Connect to socket
        socketService.connect(token);
        socketService.joinPersonalRoom(userData._id);
        
        return response;
      }
      
      throw new Error(response.message || 'OTP verification failed');
    } catch (error) {
      throw new Error(error.response?.data?.message || 'OTP verification failed');
    }
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Reset state
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    // Disconnect socket
    socketService.disconnect();
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    accessToken,
    refreshToken,
    login,
    verifyOTP,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

