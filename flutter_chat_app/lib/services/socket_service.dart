import 'dart:convert';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/message_model.dart';
import 'dart:async';

class SocketService {
  static SocketService? _instance;
  static SocketService get instance => _instance ??= SocketService._internal();
  
  SocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool get isConnected => _isConnected && _socket?.connected == true;

  Future<void> connect() async {
    if (_socket != null) {
      await disconnect();
    }

    final token = await _storage.read(key: 'accessToken');
    if (token == null) {
      throw Exception('No access token available');
    }

    _socket = IO.io(
      'https://nexwork-api.dreamstechnologies.com',
      IO.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setAuth({'token': token})
          .setTimeout(10000)
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(500)
          .setReconnectionDelayMax(2000)
          .setReconnectionAttempts(10)
          .build(),
    );

    _setupEventListeners();
  }

  void _setupEventListeners() {
    _socket?.onConnect((_) {
      print('🔌 Connected to socket server');
      _isConnected = true;
      _socket?.emit('socket-ready', {'timestamp': DateTime.now().millisecondsSinceEpoch});
      _startHeartbeat();
    });

    _socket?.onDisconnect((_) {
      print('🔌 Disconnected from socket server');
      _isConnected = false;
      _stopHeartbeat();
    });

    _socket?.onConnectError((error) {
      print('🔌 Connection error: $error');
      _isConnected = false;
    });

    _socket?.onError((error) {
      print('🔌 Socket error: $error');
    });
  }

  Future<void> disconnect() async {
    _stopHeartbeat();
    _socket?.disconnect();
    _socket = null;
    _isConnected = false;
  }

  // Join personal room
  void joinPersonalRoom(String userId) {
    _socket?.emit('join', {'userId': userId});
  }

  // Join channel room
  void joinChannel(String channelId, String workspaceId) {
    _socket?.emit('join-channel', {'channelId': channelId, 'workspaceId': workspaceId});
  }

  // Send one-to-one message
  void sendMessage({
    required String senderId,
    required String receiverId,
    required String workspaceId,
    required String content,
    MessageType messageType = MessageType.text,
  }) {
    _socket?.emit('send-message', {
      'senderId': senderId,
      'receiverId': receiverId,
      'workspaceId': workspaceId,
      'content': content,
      'messageType': messageType.name,
    });
  }

  // Send channel message
  void sendChannelMessage({
    required String senderId,
    required String channelId,
    required String workspaceId,
    required String content,
    MessageType messageType = MessageType.text,
  }) {
    _socket?.emit('send-message-to-channel', {
      'senderId': senderId,
      'channelId': channelId,
      'workspaceId': workspaceId,
      'content': content,
      'messageType': messageType.name,
    });
  }

  // Typing indicators
  void startTyping(String receiverId, String? conversationId, String userId) {
    _socket?.emit('typing', {
      'receiverId': receiverId,
      'conversationId': conversationId,
      'userId': userId,
    });
  }

  void stopTyping(String receiverId, String? conversationId, String userId) {
    _socket?.emit('stop-typing', {
      'receiverId': receiverId,
      'conversationId': conversationId,
      'userId': userId,
    });
  }

  void startTypingInChannel(String channelId, String workspaceId, String userId) {
    _socket?.emit('typing-to-channel', {
      'channelId': channelId,
      'workspaceId': workspaceId,
      'userId': userId,
    });
  }

  void stopTypingInChannel(String channelId, String workspaceId, String userId) {
    _socket?.emit('stop-typing-to-channel', {
      'channelId': channelId,
      'workspaceId': workspaceId,
      'userId': userId,
    });
  }

  // Event listeners
  void onMessage(Function(dynamic) callback) {
    _socket?.on('receive-message', callback);
  }

  void onChannelMessage(Function(dynamic) callback) {
    _socket?.on('receive-message-to-channel', callback);
  }

  void onTyping(Function(dynamic) callback) {
    _socket?.on('typing', callback);
  }

  void onStopTyping(Function(dynamic) callback) {
    _socket?.on('stop-typing', callback);
  }

  void onChannelTyping(Function(dynamic) callback) {
    _socket?.on('typing-to-channel', callback);
  }

  void onUserOnline(Function(dynamic) callback) {
    _socket?.on('user-online', callback);
  }

  void onUserOffline(Function(dynamic) callback) {
    _socket?.on('user-offline', callback);
  }

  void onOnlineUsers(Function(dynamic) callback) {
    _socket?.on('online-users', callback);
  }

  void onAckSendMessage(Function(dynamic) callback) {
    _socket?.on('ack-send-message', callback);
  }

  void onAckSendChannelMessage(Function(dynamic) callback) {
    _socket?.on('ack-send-message-to-channel', callback);
  }

  // Remove event listeners
  void off(String event, [Function(dynamic)? callback]) {
    _socket?.off(event, callback);
  }

  void offUserOnline(Function(dynamic) callback) {
    _socket?.off('user-online', callback);
  }

  void offUserOffline(Function(dynamic) callback) {
    _socket?.off('user-offline', callback);
  }

  void offOnlineUsers(Function(dynamic) callback) {
    _socket?.off('online-users', callback);
  }

  // Get socket instance
  IO.Socket? getSocket() {
    return _socket;
  }

  // Request online users
  void requestOnlineUsers() {
    _socket?.emit('request-online-users');
  }

  // Heartbeat
  Timer? _heartbeatTimer;
  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (_socket?.connected == true) {
        _socket?.emit('heartbeat', {'timestamp': DateTime.now().millisecondsSinceEpoch});
      }
    });
  }

  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }
}
