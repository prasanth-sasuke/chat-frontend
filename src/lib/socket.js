import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token) {
    if (this.socket) {
      this.disconnect();
    }

    console.log('🔌 Attempting to connect to socket server...');
    this.socket = io("http://localhost:8000", {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000, // Reduced timeout
      reconnection: true,
      reconnectionAttempts: 10, // More attempts
      reconnectionDelay: 500, // Faster reconnection
      reconnectionDelayMax: 2000, // Max delay
      maxReconnectionAttempts: 10
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.isConnected = true;
      
      // Test if we can receive events
      this.socket.on('test-event', (data) => {
        console.log('🔌 Received test event:', data);
      });

      // Emit a custom event to notify that socket is ready
      this.socket.emit('socket-ready', { timestamp: Date.now() });
      
      // Start heartbeat to keep connection alive
      this.startHeartbeat();
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join personal room
  joinPersonalRoom(userId) {
    if (this.socket) {
      this.socket.emit('join', { userId });
    }
  }

  // Join channel room
  joinChannel(channelId, workspaceId) {
    if (this.socket) {
      this.socket.emit('join-channel', { channelId, workspaceId });
    }
  }

  // Send one-to-one message
  sendMessage(messageData) {
    if (this.socket) {
      this.socket.emit('send-message', messageData);
    }
  }

  // Send channel message
  sendChannelMessage(messageData) {
    if (this.socket) {
      this.socket.emit('send-message-to-channel', messageData);
    }
  }

  // Typing indicators
  startTyping(receiverId, conversationId, userId) {
    if (this.socket) {
      this.socket.emit('typing', { receiverId, conversationId, userId });
    }
  }

  stopTyping(receiverId, conversationId, userId) {
    if (this.socket) {
      this.socket.emit('stop-typing', { receiverId, conversationId, userId });
    }
  }

  startTypingInChannel(channelId, workspaceId, userId) {
    if (this.socket) {
      this.socket.emit('typing-to-channel', { channelId, workspaceId, userId });
    }
  }

  stopTypingInChannel(channelId, workspaceId, userId) {
    if (this.socket) {
      this.socket.emit('stop-typing-to-channel', { channelId, workspaceId, userId });
    }
  }

  // Event listeners
  onMessage(callback) {
    if (this.socket) {
      this.socket.on('receive-message', callback);
    }
  }

  onChannelMessage(callback) {
    if (this.socket) {
      this.socket.on('receive-message-to-channel', callback);
    }
  }

  onTyping(callback) {
    if (this.socket) {
      this.socket.on('typing', callback);
    }
  }

  onStopTyping(callback) {
    if (this.socket) {
      this.socket.on('stop-typing', callback);
    }
  }

  onChannelTyping(callback) {
    if (this.socket) {
      this.socket.on('typing-to-channel', callback);
    }
  }

  onUserOnline(callback) {
    if (this.socket) {
      console.log('🔌 Setting up user-online listener');
      this.socket.on('user-online', (data) => {
        console.log('🔌 Received user-online event:', data);
        callback(data);
      });
    } else {
      console.error('🔌 Cannot set up user-online listener: socket not connected');
    }
  }

  onUserOffline(callback) {
    if (this.socket) {
      console.log('🔌 Setting up user-offline listener');
      this.socket.on('user-offline', (data) => {
        console.log('🔌 Received user-offline event:', data);
        callback(data);
      });
    } else {
      console.error('🔌 Cannot set up user-offline listener: socket not connected');
    }
  }

  onOnlineUsers(callback) {
    if (this.socket) {
      console.log('🔌 Setting up online-users listener');
      this.socket.on('online-users', (data) => {
        console.log('🔌 Received online-users event:', data);
        callback(data);
      });
    } else {
      console.error('🔌 Cannot set up online-users listener: socket not connected');
    }
  }

  onAckSendMessage(callback) {
    if (this.socket) {
      this.socket.on('ack-send-message', callback);
    }
  }

  onAckSendChannelMessage(callback) {
    if (this.socket) {
      this.socket.on('ack-send-message-to-channel', callback);
    }
  }

  // Remove event listeners
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Remove specific event listeners
  offUserOnline(callback) {
    if (this.socket) {
      this.socket.off('user-online', callback);
    }
  }

  offUserOffline(callback) {
    if (this.socket) {
      this.socket.off('user-offline', callback);
    }
  }

  offOnlineUsers(callback) {
    if (this.socket) {
      this.socket.off('online-users', callback);
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Check connection status
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }

  // Wait for socket to be ready
  onSocketReady(callback) {
    if (this.socket) {
      this.socket.on('socket-ready', callback);
    }
  }

  // Start heartbeat to keep connection alive
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;

