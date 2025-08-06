import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Send, 
  Hash, 
  Users, 
  Loader2,
  Paperclip,
  Smile,
  User,
  Search,
  MoreVertical,
  Circle,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import socketService from '../../lib/socket';
import MessageList from './MessageList';
import { messageAPI } from '../../lib/api';

const ChatInterface = ({ workspace, onBack, initialChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedChat, setSelectedChat] = useState(initialChat || null); // { type: 'user' | 'channel', data: user/channel }
  const [chatType, setChatType] = useState('one-to-one'); // 'one-to-one' | 'channel'
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatSelector, setShowChatSelector] = useState(false);
  const [processedMessageIds] = useState(new Set());
  
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const listenersRegisteredRef = useRef(false);

  // Filter users and channels based on search
  const filteredUsers = workspace?.users?.filter(u => 
    u.userId !== user?._id && 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Debug: Log workspace users to see their structure
  useEffect(() => {
    if (workspace?.users) {
      console.log('🔍 Workspace users structure:', workspace.users.map(u => ({
        userId: u.userId,
        _id: u._id,
        id: u.id,
        name: u.name
      })));
    }
  }, [workspace?.users]);

  const filteredChannels = workspace?.channels?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  useEffect(() => {
    if (workspace && user) {
      initializeSocket();
    }

    return () => {
      cleanup();
    };
  }, [workspace, user]);

  useEffect(() => {
    if (initialChat && !selectedChat) {
      setSelectedChat(initialChat);
      if (initialChat.type === 'channel') {
        socketService.joinChannel(initialChat.data._id, workspace._id);
      }
    }
  }, [initialChat, selectedChat, workspace]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = () => {
    console.log('🔌 Initializing socket connection for user:', user._id);
    
    // Clean up any existing listeners first
    cleanup();
    
    // Check if socket is already connected
    if (!socketService.isSocketConnected()) {
      console.log('🔌 Socket not connected, waiting for connection...');
      // Wait for socket to connect before setting up listeners
      setTimeout(() => {
        setupSocketListeners();
      }, 500); // Reduced delay
    } else {
      setupSocketListeners();
    }
  };

  const setupSocketListeners = () => {
    console.log('🔌 Setting up socket event listeners...');
    
    // Prevent multiple listener registrations
    if (listenersRegisteredRef.current) {
      console.log('🔄 Listeners already registered, skipping...');
      return;
    }
    
    // Join personal room
    socketService.joinPersonalRoom(user._id);
    
    // Set up socket event listeners for one-to-one chat only
    socketService.onMessage(handleNewOneToOneMessage);
    socketService.onTyping(handleTyping);
    socketService.onStopTyping(handleStopTyping);
    socketService.onOnlineUsers(handleOnlineUsers);
    socketService.onUserOnline(handleUserOnline);
    socketService.onUserOffline(handleUserOffline);
    socketService.onAckSendMessage(handleMessageAck);
    
    // Set up socket ready listener
    socketService.onSocketReady(() => {
      console.log('🔌 Socket is ready, requesting online users...');
      // Request online users from backend
      socketService.getSocket().emit('request-online-users');
    });
    
    listenersRegisteredRef.current = true;
    console.log('🔌 Socket event listeners set up');
    
    // Check connection status
    const connected = socketService.isSocketConnected();
    setIsConnected(connected);
    console.log('🔗 Socket connection status:', connected);
    
    // Immediately request online users if socket is already connected
    if (connected) {
      console.log('🔌 Socket already connected, requesting online users immediately...');
      socketService.getSocket().emit('request-online-users');
    }
  };

  const cleanup = () => {
    // Remove event listeners for one-to-one chat only
    socketService.off('receive-message', handleNewOneToOneMessage);
    socketService.off('typing', handleTyping);
    socketService.off('stop-typing', handleStopTyping);
    socketService.offOnlineUsers(handleOnlineUsers);
    socketService.offUserOnline(handleUserOnline);
    socketService.offUserOffline(handleUserOffline);
    socketService.off('ack-send-message', handleMessageAck);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Reset listener registration flag
    listenersRegisteredRef.current = false;
  };

  const loadMessages = async () => {
    if (!selectedChat || !user) return;

    try {
      setLoading(true);
      setError('');
      
      console.log('📥 Loading messages for:', selectedChat.type, selectedChat.data);

      let response;
      // Only handle one-to-one chat (channels are handled by ChannelChatInterface)
      if (selectedChat.type === 'user') {
        console.log('📥 Loading one-to-one messages:', user._id, '->', selectedChat.data.userId);
        response = await messageAPI.getOneToOneMessages(
          user._id, 
          selectedChat.data.userId
        );
      } else {
        console.log('❌ Channel messages are handled by ChannelChatInterface');
        return;
      }

      console.log('📥 API Response:', response);

      if (response.success) {
        const messages = response.result?.messages || [];
        console.log('📥 Loaded messages:', messages.length);
        console.log('📥 Messages data:', messages);
        
        // Clear processed message IDs when loading new messages
        processedMessageIds.clear();
        
        // Add loaded messages to processed set
        messages.forEach(msg => processedMessageIds.add(msg._id));
        
        setMessages(messages);
      } else {
        console.error('❌ Failed to load messages:', response.message);
        console.error('❌ Full response:', response);
        setError(response.message || 'Failed to load messages');
      }
    } catch (err) {
      console.error('❌ Load messages error:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleNewOneToOneMessage = (data) => {
    if (data.success && data.message && selectedChat?.type === 'user') {
      const message = data.message;
      const messageId = message._id;
      
      // Check if we've already processed this message
      if (processedMessageIds.has(messageId)) {
        console.log('🔄 Message already processed, skipping:', messageId);
        return;
      }
      
      if (message.senderId === selectedChat.data.userId || message.receiverId === selectedChat.data.userId) {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(msg => msg._id === messageId);
          if (messageExists) {
            console.log('🔄 Message already exists, skipping duplicate:', messageId);
            return prev;
          }
          
          // Mark message as processed
          processedMessageIds.add(messageId);
          return [...prev, message];
        });
      }
    }
  };

  const handleMessageAck = (data) => {
    if (data.success && data.message) {
      console.log('One-to-one message sent successfully:', data.message);
      const messageId = data.message._id;
      
      // Check if we've already processed this message
      if (processedMessageIds.has(messageId)) {
        console.log('🔄 Message already processed, skipping:', messageId);
        return;
      }
      
      // Add the message to local state when we get acknowledgment
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(msg => msg._id === messageId);
        if (messageExists) {
          console.log('🔄 Message already exists, skipping duplicate:', messageId);
          return prev;
        }
        
        // Mark message as processed
        processedMessageIds.add(messageId);
        return [...prev, data.message];
      });
    }
  };

  const handleTyping = (data) => {
    console.log('✍️ Received typing event:', data);
    if (data.userId !== user._id && selectedChat?.type === 'user') {
      // Check if the typing is for the current chat
      const isForCurrentChat = selectedChat.data.userId === data.userId || 
                              selectedChat.data.userId === data.receiverId;
      
      if (isForCurrentChat) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.userId);
          return [...filtered, { userId: data.userId, timestamp: Date.now() }];
        });

        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }, 3000);
      }
    }
  };

  const handleStopTyping = (data) => {
    console.log('✍️ Received stop typing event:', data);
    if (data.userId !== user._id && selectedChat?.type === 'user') {
      // Check if the stop typing is for the current chat
      const isForCurrentChat = selectedChat.data.userId === data.userId || 
                              selectedChat.data.userId === data.receiverId;
      
      if (isForCurrentChat) {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    }
  };

  // Channel typing is handled by ChannelChatInterface

  const handleOnlineUsers = (data) => {
    console.log('📱 Received online users:', data.users?.length || 0, 'users');
    
    // Convert array of user IDs to array of user objects with status
    const onlineUserObjects = (data.users || []).map(userId => ({
      userId,
      status: 'online'
    }));
    
    // Use functional update to avoid race conditions
    setOnlineUsers(prevUsers => {
      // Only update if the data is actually different
      const newUserIds = new Set(onlineUserObjects.map(u => u.userId));
      const prevUserIds = new Set(prevUsers.map(u => u.userId));
      
      if (newUserIds.size !== prevUserIds.size || 
          ![...newUserIds].every(id => prevUserIds.has(id))) {
        console.log('📱 Updating online users:', onlineUserObjects.length, 'users');
        return onlineUserObjects;
      }
      return prevUsers;
    });
  };

  const handleUserOnline = (data) => {
    console.log('🟢 User went online:', data.userId);
    setOnlineUsers(prev => {
      const updatedUsers = [...prev];
      const userIndex = updatedUsers.findIndex(u => u.userId === data.userId);
      if (userIndex !== -1) {
        updatedUsers[userIndex] = { ...updatedUsers[userIndex], status: 'online' };
      } else {
        updatedUsers.push({ userId: data.userId, status: 'online' });
      }
      return updatedUsers;
    });
  };

  const handleUserOffline = (data) => {
    console.log('🔴 User went offline:', data.userId);
    setOnlineUsers(prev => {
      const updatedUsers = [...prev];
      const userIndex = updatedUsers.findIndex(u => u.userId === data.userId);
      if (userIndex !== -1) {
        updatedUsers[userIndex] = { ...updatedUsers[userIndex], status: 'offline' };
      }
      return updatedUsers;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected || !selectedChat) {
      console.log('❌ Cannot send message:', {
        messageEmpty: !newMessage.trim(),
        notConnected: !isConnected,
        noChat: !selectedChat
      });
      return;
    }

    try {
      setLoading(true);
      console.log('📤 Sending message:', {
        type: selectedChat.type,
        content: newMessage.trim(),
        connected: isConnected
      });
      
      // One-to-one message only (channels are handled by ChannelChatInterface)
      if (selectedChat.type === 'user') {
        // Stop typing indicator when sending message
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          socketService.stopTyping(selectedChat.data.userId, null, user._id);
        }
        
        const messageData = {
          senderId: user._id,
          receiverId: selectedChat.data.userId,
          workspaceId: workspace._id,
          content: newMessage.trim(),
          messageType: 'text'
        };
        console.log('📤 One-to-one message data:', messageData);
        console.log('📤 Socket connected:', socketService.isSocketConnected());
        socketService.sendMessage(messageData);
      } else {
        console.log('❌ Channel messages are handled by ChannelChatInterface');
        return;
      }
      
      setNewMessage('');
      setError('');
    } catch (err) {
      console.error('❌ Send message error:', err);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator for one-to-one chat only
    if (e.target.value.trim() && isConnected && selectedChat && selectedChat.type === 'user') {
      console.log('✍️ Sending typing indicator to:', selectedChat.data.userId);
      socketService.startTyping(selectedChat.data.userId, null, user._id);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing indicator after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        console.log('✍️ Stopping typing indicator');
        socketService.stopTyping(selectedChat.data.userId, null, user._id);
      }, 3000);
    } else if (!e.target.value.trim() && typingTimeoutRef.current) {
      // Stop typing immediately if input is cleared
      clearTimeout(typingTimeoutRef.current);
      socketService.stopTyping(selectedChat.data.userId, null, user._id);
    }
  };

  const handleUserSelect = (selectedUser) => {
    setSelectedChat({ type: 'user', data: selectedUser });
    setChatType('one-to-one');
    setMessages([]);
  };

  // Channel selection is now handled by the parent component routing
  // This component only handles one-to-one chat

  const isUserOnline = (userId) => {
    const isOnline = onlineUsers.some(u => u.userId === userId && u.status === 'online');
    // Only log in debug mode to reduce console noise
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log(`🔍 Checking if user ${userId} is online:`, isOnline);
    }
    return isOnline;
  };

  // Debug: Log online users whenever they change (reduced frequency)
  useEffect(() => {
    if (onlineUsers.length > 0) {
      console.log('🔍 Online users state changed:', onlineUsers.length, 'users online');
    }
  }, [onlineUsers]);

  // Debug function to log current online users (only when needed)
  const logOnlineUsers = () => {
    if (onlineUsers.length > 0) {
      console.log('📊 Current online users:', onlineUsers);
    }
  };

  // Test backend connectivity
  const testBackendConnection = async () => {
    try {
      console.log('🧪 Testing backend connection...');
      
      // Test workspace details API
      if (workspace?._id) {
        const response = await fetch(`http://localhost:8000/workspace/get-workspace-details/${workspace._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        const data = await response.json();
        console.log('🧪 Workspace API test:', data.success ? '✅ Success' : '❌ Failed');
      }
      
      // Test socket connection
      const socketConnected = socketService.isSocketConnected();
      console.log('🧪 Socket connection test:', socketConnected ? '✅ Connected' : '❌ Disconnected');
      
      // Test message API if we have a selected chat
      if (selectedChat && selectedChat.type === 'user') {
        console.log('🧪 Testing message API...');
        try {
          const messageResponse = await messageAPI.getOneToOneMessages(
            user._id, 
            selectedChat.data.userId
          );
          console.log('🧪 Message API test:', messageResponse.success ? '✅ Success' : '❌ Failed');
          console.log('🧪 Message API response:', messageResponse);
        } catch (msgError) {
          console.error('🧪 Message API test failed:', msgError);
        }
      }
      
    } catch (error) {
      console.error('🧪 Backend test failed:', error);
    }
  };

  // Run backend test on component mount
  useEffect(() => {
    if (workspace && user) {
      testBackendConnection();
    }
  }, [workspace, user]);

  // Call debug function when online users change (but limit frequency)
  useEffect(() => {
    const timeoutId = setTimeout(logOnlineUsers, 1000);
    return () => clearTimeout(timeoutId);
  }, [onlineUsers]);

  // Monitor connection status with faster updates
  useEffect(() => {
    const checkConnection = () => {
      const connected = socketService.isSocketConnected();
      if (connected !== isConnected) {
        console.log('🔗 Connection status changed:', isConnected, '->', connected);
        setIsConnected(connected);
        
        // If reconnected, request online users
        if (connected) {
          console.log('🔌 Reconnected, requesting online users...');
          setTimeout(() => {
            socketService.getSocket().emit('request-online-users');
          }, 200);
        }
      }
    };

    const interval = setInterval(checkConnection, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [isConnected]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showChatSelector && !event.target.closest('.chat-selector')) {
        setShowChatSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showChatSelector]);

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getSelectedChatName = () => {
    if (!selectedChat) return '';
    return selectedChat.data.name || selectedChat.data.email || 'Unknown';
  };

  const getSelectedChatStatus = () => {
    if (!selectedChat) return '';
    
    if (selectedChat.type === 'user') {
      const isOnline = isUserOnline(selectedChat.data.userId);
      return isOnline ? 'Online' : 'Offline';
    } else {
      return `${selectedChat.data.members?.length || 0} members`;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area - Full Width */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Button onClick={onBack} variant="ghost" size="sm" className="mr-3">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Chat Selector */}
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowChatSelector(!showChatSelector)}
                      className="chat-selector flex items-center space-x-2"
                    >
                      {selectedChat ? (
                        <>
                          {selectedChat.type === 'user' ? (
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {getUserInitials(selectedChat.data.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                isUserOnline(selectedChat.data.userId) ? 'bg-green-500' : 'bg-gray-400'
                              }`} />
                            </div>
                          ) : (
                            <Hash className="h-5 w-5 text-gray-500" />
                          )}
                          <span className="font-medium">{getSelectedChatName()}</span>
                        </>
                      ) : (
                        <span className="text-gray-500">Select a chat</span>
                      )}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    
                    {/* Chat Selector Dropdown */}
                    {showChatSelector && (
                      <div className="chat-selector absolute top-full left-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                        {/* Search */}
                        <div className="p-3 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search users and channels..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        
                        {/* Users */}
                        <div className="p-3 border-b">
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Users</h3>
                          <div className="space-y-1">
                            {filteredUsers.map((userItem) => (
                              <div
                                key={userItem.userId}
                                onClick={() => {
                                  handleUserSelect(userItem);
                                  setShowChatSelector(false);
                                }}
                                className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-50"
                              >
                                <div className="relative">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {getUserInitials(userItem.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white ${
                                    isUserOnline(userItem.userId) ? 'bg-green-500' : 'bg-gray-400'
                                  }`} 
                                  title={`${userItem.name} is ${isUserOnline(userItem.userId) ? 'online' : 'offline'} (ID: ${userItem.userId})`}
                                  />
                                </div>
                                <div className="ml-2 flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{userItem.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{userItem.email}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Channels */}
                        <div className="p-3">
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Channels</h3>
                          <div className="space-y-1">
                            {filteredChannels.map((channel) => (
                              <div
                                key={channel._id}
                                onClick={() => {
                                  handleChannelSelect(channel);
                                  setShowChatSelector(false);
                                }}
                                className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-50"
                              >
                                <Hash className="h-4 w-4 text-gray-500" />
                                <div className="ml-2 flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{channel.name}</p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {channel.members?.length || 0} members
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedChat && (
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">{getSelectedChatStatus()}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-500">
                    {onlineUsers.filter(u => u.status === 'online').length} online
                  </div>
                  <div className={`flex items-center text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      console.log('🔍 Debug: Current online users:', onlineUsers);
                      console.log('🔍 Debug: Current user:', user);
                      console.log('🔍 Debug: Socket connected:', socketService.isSocketConnected());
                      console.log('🔍 Debug: Workspace users:', workspace?.users);
                      if (selectedChat?.type === 'user') {
                        console.log('🔍 Debug: Selected chat user ID:', selectedChat.data.userId);
                        console.log('🔍 Debug: Is selected user online:', isUserOnline(selectedChat.data.userId));
                      }
                      
                      // Test socket connection
                      if (socketService.isSocketConnected()) {
                        console.log('🔌 Testing socket connection...');
                        socketService.getSocket().emit('test-event', { message: 'Test from frontend' });
                        // Also request online users
                        console.log('🔌 Requesting online users...');
                        socketService.getSocket().emit('request-online-users');
                        
                        // Test message loading
                        if (selectedChat?.type === 'user') {
                          console.log('🔍 Testing message loading...');
                          loadMessages();
                        }
                      }
                    }}
                  >
                    Debug
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden">
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading messages...</span>
                </div>
              ) : (
                <MessageList 
                  messages={messages}
                  currentUser={user}
                  typingUsers={typingUsers}
                  workspaceUsers={workspace?.users || []}
                />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Alert */}
            {error && (
              <Alert className="mx-4 mb-2 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Message Input */}
            <div className="bg-white border-t px-6 py-4">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <Button type="button" variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={`Message ${selectedChat.type === 'user' ? selectedChat.data.name : `#${selectedChat.data.name}`}`}
                    disabled={loading || !isConnected}
                    className="pr-12"
                    maxLength={10000}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-1 top-1/2 transform -translate-y-1/2"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || loading || !isConnected}
                  size="sm"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              
              {/* Typing Indicators */}
              {typingUsers.length > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  {typingUsers.length === 1 
                    ? (() => {
                        const typingUser = typingUsers[0];
                        // Try to get user name with different ID formats
                        let userName = selectedChat?.data?.name || 'Someone';
                        if (workspace?.users && workspace.users.length > 0) {
                          let user = workspace.users.find(u => u.userId === typingUser.userId);
                          if (!user) user = workspace.users.find(u => u._id === typingUser.userId);
                          if (!user) user = workspace.users.find(u => u.id === typingUser.userId);
                          if (user) userName = user.name;
                        }
                        return `${userName} is typing...`;
                      })()
                    : `${typingUsers.length} people are typing...`
                  }
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">No chat selected</p>
              <p className="text-sm text-gray-500">Click the dropdown to select a user or channel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;