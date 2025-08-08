import 'package:flutter/material.dart';
import '../models/message_model.dart';
import '../models/user_model.dart';
import '../models/workspace_model.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class ChatProvider extends ChangeNotifier {
  List<Message> _messages = [];
  List<User> _onlineUsers = [];
  List<String> _typingUsers = [];
  bool _loading = false;
  String? _error;
  bool _isConnected = false;

  // Chat selection
  User? _selectedUser;
  Channel? _selectedChannel;
  String _chatType = 'one-to-one'; // 'one-to-one' or 'channel'
  
  // Current user (should be set from AuthProvider)
  User? _currentUser;

  List<Message> get messages => _messages;
  List<User> get onlineUsers => _onlineUsers;
  List<String> get typingUsers => _typingUsers;
  bool get loading => _loading;
  String? get error => _error;
  bool get isConnected => _isConnected;
  User? get selectedUser => _selectedUser;
  Channel? get selectedChannel => _selectedChannel;
  String get chatType => _chatType;

  ChatProvider() {
    _setupSocketListeners();
    _updateConnectionStatus();
  }

  void _setupSocketListeners() {
    final socket = SocketService.instance;

    // Message listeners
    socket.onMessage(_handleNewMessage);
    socket.onChannelMessage(_handleNewChannelMessage);
    socket.onAckSendMessage(_handleMessageAck);
    socket.onAckSendChannelMessage(_handleChannelMessageAck);

    // Typing listeners
    socket.onTyping(_handleTyping);
    socket.onStopTyping(_handleStopTyping);
    socket.onChannelTyping(_handleChannelTyping);

    // User status listeners
    socket.onUserOnline(_handleUserOnline);
    socket.onUserOffline(_handleUserOffline);
    socket.onOnlineUsers(_handleOnlineUsers);
  }

  void _handleNewMessage(dynamic data) {
    if (data is Map<String, dynamic> && data['success'] && data['message'] != null) {
      final message = Message.fromJson(data['message']);
      if (_isMessageForCurrentChat(message)) {
        _addMessage(message);
      }
    }
  }

  void _handleNewChannelMessage(dynamic data) {
    if (data is Map<String, dynamic> && data['success'] && data['message'] != null) {
      final message = Message.fromJson(data['message']);
      if (_isMessageForCurrentChat(message)) {
        _addMessage(message);
      }
    }
  }

  void _handleMessageAck(dynamic data) {
    if (data is Map<String, dynamic> && data['success'] && data['message'] != null) {
      final message = Message.fromJson(data['message']);
      print('✅ Message acknowledged with server ID: ${message.id}');
      
      // Replace temporary message with server message
      _replaceTempMessage(message);
    }
  }

  void _handleChannelMessageAck(dynamic data) {
    if (data is Map<String, dynamic> && data['success'] && data['message'] != null) {
      final message = Message.fromJson(data['message']);
      print('✅ Channel message acknowledged with server ID: ${message.id}');
      
      // Replace temporary message with server message
      _replaceTempMessage(message);
    }
  }

  void _handleTyping(dynamic data) {
    if (data is Map<String, dynamic>) {
      final userId = data['userId'];
      if (userId != null && _isTypingForCurrentChat(data)) {
        _addTypingUser(userId);
      }
    }
  }

  void _handleStopTyping(dynamic data) {
    if (data is Map<String, dynamic>) {
      final userId = data['userId'];
      if (userId != null && _isTypingForCurrentChat(data)) {
        _removeTypingUser(userId);
      }
    }
  }

  void _handleChannelTyping(dynamic data) {
    if (data is Map<String, dynamic>) {
      final userId = data['userId'];
      if (userId != null && _isTypingForCurrentChat(data)) {
        _addTypingUser(userId);
      }
    }
  }

  void _handleUserOnline(dynamic data) {
    if (data is Map<String, dynamic>) {
      final userId = data['userId'];
      if (userId != null) {
        print('🟢 User went online: $userId');
        _updateUserOnlineStatus(userId, true);
      }
    }
  }

  void _handleUserOffline(dynamic data) {
    if (data is Map<String, dynamic>) {
      final userId = data['userId'];
      if (userId != null) {
        print('🔴 User went offline: $userId');
        _updateUserOnlineStatus(userId, false);
      }
    }
  }

  void _handleOnlineUsers(dynamic data) {
    if (data is Map<String, dynamic>) {
      final users = data['users'] as List<dynamic>?;
      if (users != null) {
        print('📱 Received online users: ${users.length} users');
        _onlineUsers = users.map((userId) => User(
          id: userId.toString(),
          name: 'User $userId',
          email: 'user$userId@example.com',
          isOnline: true,
        )).toList();
        notifyListeners();
      }
    }
  }

  bool _isMessageForCurrentChat(Message message) {
    if (_chatType == 'one-to-one' && _selectedUser != null) {
      return (message.senderId == _selectedUser!.id || message.receiverId == _selectedUser!.id);
    } else if (_chatType == 'channel' && _selectedChannel != null) {
      return message.channelId == _selectedChannel!.id;
    }
    return false;
  }

  bool _isTypingForCurrentChat(Map<String, dynamic> data) {
    if (_chatType == 'one-to-one' && _selectedUser != null) {
      final receiverId = data['receiverId'];
      final userId = data['userId'];
      return receiverId == _selectedUser!.id || userId == _selectedUser!.id;
    } else if (_chatType == 'channel' && _selectedChannel != null) {
      final channelId = data['channelId'];
      return channelId == _selectedChannel!.id;
    }
    return false;
  }

  void _addMessage(Message message) {
    if (!_messages.any((m) => m.id == message.id)) {
      _messages.add(message);
      _messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      notifyListeners();
    }
  }

  void _replaceTempMessage(Message serverMessage) {
    // Find and replace temporary message with server message
    final tempIndex = _messages.indexWhere((m) => m.id.startsWith('temp_'));
    if (tempIndex != -1) {
      _messages[tempIndex] = serverMessage;
      _messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      print('🔄 Replaced temp message with server message ID: ${serverMessage.id}');
      notifyListeners();
    } else {
      // If no temp message found, just add the server message
      _addMessage(serverMessage);
    }
  }

  void _addTypingUser(String userId) {
    if (!_typingUsers.contains(userId)) {
      _typingUsers.add(userId);
      notifyListeners();
      
      // Remove typing indicator after 3 seconds
      Future.delayed(const Duration(seconds: 3), () {
        _removeTypingUser(userId);
      });
    }
  }

  void _removeTypingUser(String userId) {
    _typingUsers.remove(userId);
    notifyListeners();
  }

  void _updateUserOnlineStatus(String userId, bool isOnline) {
    final index = _onlineUsers.indexWhere((user) => user.id == userId);
    if (index != -1) {
      _onlineUsers[index] = _onlineUsers[index].copyWith(isOnline: isOnline);
      print('📱 Updated user $userId status to: ${isOnline ? 'online' : 'offline'}');
      notifyListeners();
    } else if (isOnline) {
      _onlineUsers.add(User(
        id: userId,
        name: 'User $userId',
        email: 'user$userId@example.com',
        isOnline: true,
      ));
      print('📱 Added new online user: $userId');
      notifyListeners();
    }
  }

  Future<void> loadMessages() async {
    if (_selectedUser == null && _selectedChannel == null) return;

    try {
      _loading = true;
      _error = null;
      notifyListeners();

      List<Message> messages = [];
      
      if (_chatType == 'one-to-one' && _selectedUser != null) {
        messages = await ApiService.getOneToOneMessages(
          _getCurrentUserId(),
          _selectedUser!.id,
        );
      } else if (_chatType == 'channel' && _selectedChannel != null) {
        messages = await ApiService.getChannelMessages(
          _selectedChannel!.id,
          _selectedChannel!.workspaceId,
        );
      }

      _messages = messages;
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> sendMessage(String content) async {
    if (content.trim().isEmpty || !_isConnected) return;

    try {
      _loading = true;
      notifyListeners();

      final socket = SocketService.instance;
      final currentUserId = _getCurrentUserId();
      final workspaceId = _getCurrentWorkspaceId();
      
      // Create a temporary message with client-side ID
      final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
      final tempMessage = Message(
        id: tempId,
        content: content.trim(),
        senderId: currentUserId,
        receiverId: _chatType == 'one-to-one' ? _selectedUser!.id : null,
        channelId: _chatType == 'channel' ? _selectedChannel!.id : null,
        workspaceId: workspaceId,
        messageType: MessageType.text,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        isRead: false,
      );
      
      // Add temporary message to the list immediately
      _addMessage(tempMessage);
      print('📤 Sent message with temp ID: $tempId');

      if (_chatType == 'one-to-one' && _selectedUser != null) {
        socket.sendMessage(
          senderId: currentUserId,
          receiverId: _selectedUser!.id,
          workspaceId: workspaceId,
          content: content.trim(),
        );
      } else if (_chatType == 'channel' && _selectedChannel != null) {
        socket.sendChannelMessage(
          senderId: currentUserId,
          channelId: _selectedChannel!.id,
          workspaceId: workspaceId,
          content: content.trim(),
        );
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void startTyping() {
    if (!_isConnected) return;

    final socket = SocketService.instance;
    final currentUserId = _getCurrentUserId();

    if (_chatType == 'one-to-one' && _selectedUser != null) {
      socket.startTyping(_selectedUser!.id, null, currentUserId);
    } else if (_chatType == 'channel' && _selectedChannel != null) {
      socket.startTypingInChannel(_selectedChannel!.id, _selectedChannel!.workspaceId, currentUserId);
    }
  }

  void stopTyping() {
    if (!_isConnected) return;

    final socket = SocketService.instance;
    final currentUserId = _getCurrentUserId();

    if (_chatType == 'one-to-one' && _selectedUser != null) {
      socket.stopTyping(_selectedUser!.id, null, currentUserId);
    } else if (_chatType == 'channel' && _selectedChannel != null) {
      socket.stopTypingInChannel(_selectedChannel!.id, _selectedChannel!.workspaceId, currentUserId);
    }
  }

  void selectUser(User user) {
    _selectedUser = user;
    _selectedChannel = null;
    _chatType = 'one-to-one';
    _messages.clear();
    _typingUsers.clear();
    loadMessages();
  }

  void selectChannel(Channel channel) {
    _selectedChannel = channel;
    _selectedUser = null;
    _chatType = 'channel';
    _messages.clear();
    _typingUsers.clear();
    
    // Join channel
    SocketService.instance.joinChannel(channel.id, channel.workspaceId);
    loadMessages();
  }

  void clearChat() {
    _selectedUser = null;
    _selectedChannel = null;
    _messages.clear();
    _typingUsers.clear();
    notifyListeners();
  }

  void updateConnectionStatus(bool connected) {
    _isConnected = connected;
    notifyListeners();
  }

  void _updateConnectionStatus() {
    _isConnected = SocketService.instance.isConnected;
    notifyListeners();
  }

  String _getCurrentUserId() {
    // Get from current user
    if (_currentUser != null) {
      return _currentUser!.id;
    }
    return 'current_user_id'; // Placeholder
  }

  String _getCurrentWorkspaceId() {
    // This should be obtained from WorkspaceProvider
    // For now, we'll get it from the selected channel's workspace
    if (_selectedChannel != null) {
      return _selectedChannel!.workspaceId;
    }
    return 'current_workspace_id'; // Placeholder
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void setCurrentUser(User user) {
    _currentUser = user;
    notifyListeners();
  }

  bool isUserOnline(String userId) {
    return _onlineUsers.any((user) => user.id == userId && user.isOnline);
  }

  void requestOnlineUsers() {
    if (SocketService.instance.isConnected) {
      print('📱 Requesting online users...');
      SocketService.instance.requestOnlineUsers();
    }
  }

  @override
  void dispose() {
    // Clean up socket listeners
    final socket = SocketService.instance;
    socket.off('receive-message');
    socket.off('receive-message-to-channel');
    socket.off('ack-send-message');
    socket.off('ack-send-message-to-channel');
    socket.off('typing');
    socket.off('stop-typing');
    socket.off('typing-to-channel');
    socket.off('user-online');
    socket.off('user-offline');
    socket.off('online-users');
    super.dispose();
  }
}
