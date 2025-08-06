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
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import socketService from '../../lib/socket';
import MessageList from './MessageList';
import { messageAPI } from '../../lib/api';

const ChannelChatInterface = ({ workspace, channel, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [channelMembers, setChannelMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberList, setShowMemberList] = useState(false);
  const [processedMessageIds] = useState(new Set());
  
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const listenersRegisteredRef = useRef(false);

  // Filter channel members based on search
  const filteredMembers = channelMembers.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (workspace && user && channel) {
      initializeSocket();
      loadChannelMembers();
    }

    return () => {
      cleanup();
    };
  }, [workspace, user, channel]);

  useEffect(() => {
    if (channel) {
      loadMessages();
    }
  }, [channel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = () => {
    console.log('🔌 Initializing channel socket connection for user:', user._id);
    
    // Clean up any existing listeners first
    cleanup();
    
    // Check if socket is already connected
    if (!socketService.isSocketConnected()) {
      console.log('🔌 Socket not connected, waiting for connection...');
      setTimeout(() => {
        setupSocketListeners();
      }, 500);
    } else {
      setupSocketListeners();
    }
  };

  const setupSocketListeners = () => {
    console.log('🔌 Setting up channel socket event listeners...');
    
    // Prevent multiple listener registrations
    if (listenersRegisteredRef.current) {
      console.log('🔄 Listeners already registered, skipping...');
      return;
    }
    
    // Join channel room
    socketService.joinChannel(channel._id, workspace._id);
    
    // Set up socket event listeners for channel
    socketService.onChannelMessage(handleNewChannelMessage);
    socketService.onChannelTyping(handleChannelTyping);
    socketService.onAckSendChannelMessage(handleChannelMessageAck);
    
    listenersRegisteredRef.current = true;
    console.log('🔌 Channel socket event listeners set up');
    
    // Check connection status
    const connected = socketService.isSocketConnected();
    setIsConnected(connected);
    console.log('🔗 Channel socket connection status:', connected);
  };

  const cleanup = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Remove socket event listeners to prevent duplicates
    socketService.off('receive-message-to-channel', handleNewChannelMessage);
    socketService.off('typing-to-channel', handleChannelTyping);
    socketService.off('ack-send-message-to-channel', handleChannelMessageAck);
    
    // Reset listener registration flag
    listenersRegisteredRef.current = false;
  };

  const loadChannelMembers = async () => {
    try {
      // Load channel members from the channel data
      if (channel.members) {
        setChannelMembers(channel.members);
      }
    } catch (err) {
      console.error('❌ Load channel members error:', err);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📥 Loading channel messages for:', channel.name);
      
      const response = await messageAPI.getChannelMessages(channel._id, workspace._id, 1, 50);
      
      if (response.success) {
        console.log('📥 Loaded channel messages:', response.result.messages?.length || 0);
        console.log('📥 Channel messages data:', response.result.messages);
        
        // Clear processed message IDs when loading new messages
        processedMessageIds.clear();
        
        // Add loaded messages to processed set
        const messages = response.result.messages || [];
        messages.forEach(msg => processedMessageIds.add(msg._id));
        
        setMessages(messages);
      } else {
        console.error('❌ Failed to load channel messages:', response.message);
        console.error('❌ Full channel response:', response);
        setError(response.message || 'Failed to load messages');
      }
    } catch (err) {
      console.error('❌ Load channel messages error:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewChannelMessage = (data) => {
    if (data.success && data.message) {
      const messageId = data.message._id;
      
      // Check if we've already processed this message
      if (processedMessageIds.has(messageId)) {
        console.log('🔄 Message already processed, skipping:', messageId);
        return;
      }
      
      // Only add message if it's not from the current user (to avoid duplicates)
      if (data.message.senderId !== user._id) {
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
    }
  };

  const handleChannelTyping = (data) => {
    if (data.channelId === channel._id) {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        return [...filtered, { userId: data.userId, channelId: data.channelId }];
      });
      
      // Clear typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }, 3000);
    }
  };

  const handleChannelMessageAck = (data) => {
    if (data.success && data.message) {
      console.log('✅ Channel message sent successfully');
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isConnected) return;
    
    try {
      setLoading(true);
      setError('');
      
      const messageData = {
        senderId: user._id,
        channelId: channel._id,
        workspaceId: workspace._id,
        content: newMessage.trim(),
        messageType: 'text'
      };
      
      console.log('📤 Sending channel message:', messageData);
      console.log('📤 Socket connected:', socketService.isSocketConnected());
      
      // Send via socket
      socketService.sendChannelMessage(messageData);
      
      setNewMessage('');
      setError('');
    } catch (err) {
      console.error('❌ Send channel message error:', err);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator for channel
    if (e.target.value.trim() && isConnected) {
      socketService.startTypingInChannel(channel._id, workspace._id, user._id);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        // Stop typing indicator
        socketService.stopTypingInChannel(channel._id, workspace._id, user._id);
      }, 3000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    const typingUserNames = typingUsers
      .filter(u => u.channelId === channel._id)
      .map(u => {
        const member = channelMembers.find(m => m.userId === u.userId);
        return member?.name || 'Someone';
      });
    
    if (typingUserNames.length === 0) return null;
    
    return (
      <div className="text-sm text-gray-500 italic">
        {typingUserNames.join(', ')} {typingUserNames.length === 1 ? 'is' : 'are'} typing...
      </div>
    );
  };

  const getMemberStatus = (member) => {
    // You can implement online status for channel members here
    return 'offline'; // Placeholder
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button onClick={onBack} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Hash className="h-5 w-5 text-gray-500" />
                  <span className="font-semibold text-lg">{channel.name}</span>
                </div>
                
                <Badge variant="secondary" className="text-xs">
                  {channelMembers.length} members
                </Badge>
                
                {channel.type === 'private' && (
                  <Badge variant="outline" className="text-xs">
                    Private
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMemberList(!showMemberList)}
              >
                <Users className="h-4 w-4 mr-2" />
                Members
              </Button>
              
              <div className="flex items-center space-x-1">
                <Circle className={`h-2 w-2 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
          
          {channel.description && (
            <p className="text-sm text-gray-600 mt-2">{channel.description}</p>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading messages...</span>
                </div>
              ) : error ? (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageSquare className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Start the conversation in #{channel.name}</p>
                </div>
              ) : (
                <MessageList 
                  messages={messages} 
                  currentUser={user}
                  typingUsers={typingUsers}
                  workspaceUsers={channelMembers}
                />
              )}
              
              {getTypingIndicator()}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t p-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={`Message #${channel.name}`}
                    disabled={!isConnected || loading}
                    className="pr-20"
                  />
                  
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !isConnected || loading}
                  size="sm"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Members Sidebar */}
          {showMemberList && (
            <div className="w-80 bg-white border-l">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Channel Members</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMemberList(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="mt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-96">
                {filteredMembers.map((member) => (
                  <div key={member.userId} className="p-3 hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {member.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm truncate">
                            {member.name}
                          </span>
                          <Circle className={`h-2 w-2 ${getMemberStatus(member) === 'online' ? 'text-green-500' : 'text-gray-300'}`} />
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {member.email}
                          </span>
                          {member.role && (
                            <Badge variant="outline" className="text-xs">
                              {member.role}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelChatInterface; 