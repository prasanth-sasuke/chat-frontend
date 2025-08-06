import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Image, File, Smile } from 'lucide-react';

const MessageList = ({ messages, currentUser, typingUsers = [], workspaceUsers = [] }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt || currentMessage.sentAt);
    const previousDate = new Date(previousMessage.createdAt || previousMessage.sentAt);
    
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  const shouldGroupMessage = (currentMessage, previousMessage) => {
    if (!previousMessage) return false;
    
    const currentTime = new Date(currentMessage.createdAt || currentMessage.sentAt);
    const previousTime = new Date(previousMessage.createdAt || previousMessage.sentAt);
    const timeDiff = currentTime - previousTime;
    
    return (
      currentMessage.senderId === previousMessage.senderId &&
      timeDiff < 5 * 60 * 1000 && // 5 minutes
      !shouldShowDateSeparator(currentMessage, previousMessage)
    );
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getSenderName = (message) => {
    // If it's the current user, show "You"
    if (message.senderId === currentUser?._id) return 'You';
    
    // Try to get sender name from message data
    if (message.senderName) return message.senderName;
    if (message.sender?.name) return message.sender.name;
    
    // Try to get from workspace users with different ID formats
    if (message.senderId && workspaceUsers && workspaceUsers.length > 0) {
      // Try exact match first
      let sender = workspaceUsers.find(u => u.userId === message.senderId);
      
      // If not found, try with _id format
      if (!sender) {
        sender = workspaceUsers.find(u => u._id === message.senderId);
      }
      
      // If not found, try with id format
      if (!sender) {
        sender = workspaceUsers.find(u => u.id === message.senderId);
      }
      
      if (sender) {
        console.log('✅ Found sender:', sender.name, 'for ID:', message.senderId);
        return sender.name;
      }
    }
    
    // Debug logging
    console.log('❌ Could not find sender for ID:', message.senderId);
    console.log('📋 Available workspace users:', workspaceUsers ? workspaceUsers.map(u => ({ id: u.userId || u._id || u.id, name: u.name })) : 'No workspace users');
    
    // Fallback to user ID or generic name
    return message.senderId ? `User ${message.senderId.slice(-4)}` : 'Unknown User';
  };

  const renderMessageContent = (message) => {
    switch (message.messageType) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.content && <p>{message.content}</p>}
            {message.mediaFiles?.map((file, index) => (
              <div key={index} className="max-w-sm">
                <img 
                  src={file.fileUrl} 
                  alt={file.fileName}
                  className="rounded-lg max-w-full h-auto"
                />
                <p className="text-xs text-gray-500 mt-1">{file.fileName}</p>
              </div>
            ))}
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            {message.content && <p>{message.content}</p>}
            {message.mediaFiles?.map((file, index) => (
              <div key={index} className="flex items-center p-2 bg-gray-100 rounded-lg max-w-sm">
                <File className="h-4 w-4 text-gray-500 mr-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'emoji':
        return (
          <div className="flex items-center">
            <Smile className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-2xl">{message.content}</span>
          </div>
        );
      
      default:
        return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  const renderMessage = (message, index) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const isGrouped = shouldGroupMessage(message, previousMessage);
    const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
    const isOwnMessage = message.senderId === currentUser?._id;
    const timestamp = message.createdAt || message.sentAt;
    const senderName = getSenderName(message);

    return (
      <div key={message._id || index}>
        {/* Date Separator */}
        {showDateSeparator && (
          <div className="flex items-center justify-center my-4">
            <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
              {formatDate(timestamp)}
            </div>
          </div>
        )}

        {/* Message */}
        <div className={`flex items-start px-4 py-1 hover:bg-gray-50 ${isGrouped ? 'mt-1' : 'mt-4'} ${
          isOwnMessage ? 'justify-end' : 'justify-start'
        }`}>
          {isOwnMessage ? (
            /* Own Message - Right Side */
            <div className="flex items-end space-x-2 max-w-[70%]">
              <div className="flex flex-col items-end">
                {!isGrouped && (
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs text-gray-500">
                      {formatTime(timestamp)}
                    </span>
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  </div>
                )}
                
                <div className="bg-blue-500 text-white rounded-lg px-3 py-2 text-sm">
                  {renderMessageContent(message)}
                </div>
              </div>
              
              {!isGrouped && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">
                    {getUserInitials(currentUser?.name || 'You')}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ) : (
            /* Other User's Message - Left Side */
            <div className="flex items-start space-x-2 max-w-[70%]">
              {!isGrouped && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">
                    {getUserInitials(senderName)}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className="flex flex-col">
                {!isGrouped && (
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">
                      {senderName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(timestamp)}
                    </span>
                  </div>
                )}
                
                <div className="bg-gray-200 text-gray-900 rounded-lg px-3 py-2 text-sm">
                  {renderMessageContent(message)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Be the first to send a message!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="pb-4">
        {messages.map((message, index) => renderMessage(message, index))}
        
        {/* Typing Indicators */}
        {typingUsers && typingUsers.length > 0 && (
          <div className="flex items-start space-x-3 px-4 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-gray-500 italic">
                {typingUsers.length === 1 
                  ? (() => {
                      const typingUser = typingUsers[0];
                      // Try to get user name with different ID formats (same logic as getSenderName)
                      let userName = 'Someone';
                      if (workspaceUsers && workspaceUsers.length > 0) {
                        let user = workspaceUsers.find(u => u.userId === typingUser.userId);
                        if (!user) user = workspaceUsers.find(u => u._id === typingUser.userId);
                        if (!user) user = workspaceUsers.find(u => u.id === typingUser.userId);
                        if (user) userName = user.name;
                      }
                      return `${userName} is typing...`;
                    })()
                  : `${typingUsers.length} people are typing...`
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageList;

