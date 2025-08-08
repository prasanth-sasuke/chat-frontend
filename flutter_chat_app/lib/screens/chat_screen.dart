import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/chat_provider.dart';
import '../providers/auth_provider.dart';
import '../models/message_model.dart';
import '../models/user_model.dart';
import '../models/workspace_model.dart';
import '../widgets/message_bubble.dart';
import '../widgets/typing_indicator.dart';
import '../services/socket_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _typingTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToBottom();
      _setupCurrentUser();
      _startConnectionMonitor();
    });
  }

  void _startConnectionMonitor() {
    Timer.periodic(const Duration(seconds: 2), (timer) {
      if (mounted) {
        final chatProvider = Provider.of<ChatProvider>(context, listen: false);
        final wasConnected = chatProvider.isConnected;
        final isConnected = SocketService.instance.isConnected;
        
        if (wasConnected != isConnected) {
          print('🔗 Connection status changed: $wasConnected -> $isConnected');
          chatProvider.updateConnectionStatus(isConnected);
          
          // If reconnected, request online users
          if (isConnected) {
            print('🔌 Reconnected, requesting online users...');
            Future.delayed(const Duration(milliseconds: 200), () {
              chatProvider.requestOnlineUsers();
            });
          }
        }
      }
    });
  }

  void _setupCurrentUser() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    
    if (authProvider.user != null) {
      chatProvider.setCurrentUser(authProvider.user!);
      // Request online users after setting current user
      chatProvider.requestOnlineUsers();
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _typingTimer?.cancel();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _onMessageChanged(String value) {
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    
    // Cancel previous timer
    _typingTimer?.cancel();
    
    if (value.isNotEmpty) {
      chatProvider.startTyping();
      
      // Set timer to stop typing after 3 seconds
      _typingTimer = Timer(const Duration(seconds: 3), () {
        chatProvider.stopTyping();
      });
    } else {
      chatProvider.stopTyping();
    }
  }

  void _sendMessage() {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    chatProvider.sendMessage(message);
    
    _messageController.clear();
    chatProvider.stopTyping();
    _typingTimer?.cancel();
    
    // Scroll to bottom after sending
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToBottom();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<ChatProvider, AuthProvider>(
      builder: (context, chatProvider, authProvider, child) {
        final currentUser = authProvider.user;
        final selectedUser = chatProvider.selectedUser;
        final selectedChannel = chatProvider.selectedChannel;
        final chatType = chatProvider.chatType;

        if (currentUser == null) {
          return const Scaffold(
            body: Center(
              child: Text('User not authenticated'),
            ),
          );
        }

        String chatTitle = 'Chat';
        String chatSubtitle = '';

        if (chatType == 'one-to-one' && selectedUser != null) {
          chatTitle = selectedUser.name;
          final isOnline = chatProvider.isUserOnline(selectedUser.id);
          chatSubtitle = isOnline ? 'Online' : 'Offline';
        } else if (chatType == 'channel' && selectedChannel != null) {
          chatTitle = '#${selectedChannel.name}';
          chatSubtitle = '${selectedChannel.members.length} members';
        }

        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.of(context).pop(),
            ),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(chatTitle),
                if (chatSubtitle.isNotEmpty)
                  Text(
                    chatSubtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
              ],
            ),
            actions: [
              // Connection status indicator
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: chatProvider.isConnected ? Colors.green : Colors.red,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      chatProvider.isConnected ? Icons.circle : Icons.circle_outlined,
                      size: 8,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      chatProvider.isConnected ? 'Connected' : 'Disconnected',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
            ],
          ),
          body: Column(
            children: [
              // Messages Area
              Expanded(
                child: chatProvider.loading && chatProvider.messages.isEmpty
                    ? const Center(
                        child: CircularProgressIndicator(),
                      )
                    : chatProvider.messages.isEmpty
                        ? _buildEmptyState()
                        : _buildMessagesList(chatProvider, currentUser),
              ),

              // Error Message
              if (chatProvider.error != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red[200]!),
                  ),
                  child: Text(
                    chatProvider.error!,
                    style: TextStyle(color: Colors.red[700]),
                  ),
                ),

              // Typing Indicator
              if (chatProvider.typingUsers.isNotEmpty)
                TypingIndicator(
                  typingUsers: chatProvider.typingUsers,
                  workspaceUsers: [], // TODO: Get from workspace provider
                ),

              // Message Input
              _buildMessageInput(chatProvider),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.chat_bubble_outline,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'No messages yet',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Start the conversation by sending a message',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildMessagesList(ChatProvider chatProvider, User currentUser) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: chatProvider.messages.length,
      itemBuilder: (context, index) {
        final message = chatProvider.messages[index];
        final isOwnMessage = message.senderId == currentUser.id;
        
        return MessageBubble(
          message: message,
          isOwnMessage: isOwnMessage,
          showAvatar: !isOwnMessage,
          showTime: true,
          showDebugInfo: true, // Enable debug info to show message IDs
        );
      },
    );
  }

  Widget _buildMessageInput(ChatProvider chatProvider) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Attachment button
          IconButton(
            onPressed: () {
              // TODO: Implement file attachment
            },
            icon: const Icon(Icons.attach_file),
            color: Colors.grey[600],
          ),
          
          // Message input field
          Expanded(
            child: TextField(
              controller: _messageController,
              onChanged: _onMessageChanged,
              onSubmitted: (_) => _sendMessage(),
              enabled: chatProvider.isConnected && !chatProvider.loading,
              decoration: InputDecoration(
                hintText: 'Type a message...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              maxLines: null,
              textCapitalization: TextCapitalization.sentences,
            ),
          ),
          
          const SizedBox(width: 8),
          
          // Send button
          Container(
            decoration: BoxDecoration(
              color: chatProvider.isConnected && !chatProvider.loading
                  ? Theme.of(context).colorScheme.primary
                  : Colors.grey[300],
              shape: BoxShape.circle,
            ),
            child: IconButton(
              onPressed: chatProvider.isConnected && !chatProvider.loading
                  ? _sendMessage
                  : null,
              icon: chatProvider.loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(
                      Icons.send,
                      color: Colors.white,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
