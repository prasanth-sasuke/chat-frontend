import axios from 'axios';

const BASE_URL = 'http://localhost:8000';  

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // Implement token refresh logic here if needed
          // For now, just redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  // Login - send OTP to email
  login: async (email) => {
    const response = await api.post('/user/public/login', { email });
    return response.data;
  },

  // Verify OTP
  verify: async (email, otp) => {
    const response = await api.post('/user/public/verify', { email, otp });
    return response.data;
  },
};

// Workspace API calls
export const workspaceAPI = {
  // Get all workspaces
  getAllWorkspaces: async () => {
    const response = await api.get('/workspace/get-all');
    return response.data;
  },

  // Get workspace details by ID
  getWorkspaceDetails: async (workspaceId) => {
    const response = await api.get(`/workspace/get-workspace-details/${workspaceId}`);
    return response.data;
  },

  // Get channel details
  getChannelDetails: async (channelId) => {
    const response = await api.get(`/workspace/channels/${channelId}`);
    return response.data;
  },
};

// Message API calls (if needed for REST endpoints)
export const messageAPI = {
  // Get conversation messages for one-to-one chat
  getOneToOneMessages: async (senderId, receiverId, page = 1, limit = 50) => {
    const response = await api.get(`/chat/message?receiverId=${receiverId}&skip=${(page - 1) * limit}&limit=${limit}`);
    return response.data;
  },

  // Get channel messages for group chat
  getChannelMessages: async (channelId, workspaceId, page = 1, limit = 50) => {
    const response = await api.get(`/chat/message?channelId=${channelId}&skip=${(page - 1) * limit}&limit=${limit}`);
    return response.data;
  },

  // Get conversation messages (legacy)
  getConversationMessages: async (conversationId, page = 1, limit = 50) => {
    const response = await api.get(`/messages/conversation/${conversationId}?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get channel messages (legacy)
  getChannelMessagesLegacy: async (channelId, page = 1, limit = 50) => {
    const response = await api.get(`/messages/channel/${channelId}?page=${page}&limit=${limit}`);
    return response.data;
  },
};

export default api;

