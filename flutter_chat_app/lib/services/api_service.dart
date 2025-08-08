import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user_model.dart';
import '../models/workspace_model.dart';
import '../models/message_model.dart';

class ApiService {
  static const String baseUrl = 'https://nexwork-api.dreamstechnologies.com';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static Future<String?> get _accessToken async {
    return await _storage.read(key: 'accessToken');
  }

  static Future<Map<String, String>> get _headers async {
    final token = await _accessToken;
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Auth API calls
  static Future<Map<String, dynamic>> login(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/user/public/login'),
        headers: await _headers,
        body: json.encode({'email': email}),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200) {
        return data;
      } else {
        throw Exception(data['message'] ?? 'Login failed');
      }
    } catch (e) {
      throw Exception('Login failed: $e');
    }
  }

  static Future<Map<String, dynamic>> verifyOTP(String email, String otp) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/user/public/verify'),
        headers: await _headers,
        body: json.encode({'email': email, 'otp': otp}),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success']) {
        // Store tokens securely
        await _storage.write(key: 'accessToken', value: data['result']['accessToken']);
        await _storage.write(key: 'refreshToken', value: data['result']['refreshToken']);
        await _storage.write(key: 'user', value: json.encode(data['result']['user']));
        return data;
      } else {
        throw Exception(data['message'] ?? 'OTP verification failed');
      }
    } catch (e) {
      throw Exception('OTP verification failed: $e');
    }
  }

  // Workspace API calls
  static Future<List<Workspace>> getAllWorkspaces() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/workspace/get-all'),
        headers: await _headers,
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success']) {
        return (data['result'] as List)
            .map((workspace) => Workspace.fromBasicJson(workspace))
            .toList();
      } else {
        throw Exception(data['message'] ?? 'Failed to fetch workspaces');
      }
    } catch (e) {
      throw Exception('Failed to fetch workspaces: $e');
    }
  }

  static Future<Workspace> getWorkspaceDetails(String workspaceId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/workspace/get-workspace-details/$workspaceId'),
        headers: await _headers,
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success']) {
        // The API returns: { result: { workspace: {...}, users: [...], channels: [...] } }
        final result = data['result'];
        final workspaceData = result['workspace'];
        final usersData = result['users'] ?? [];
        final channelsData = result['channels'] ?? [];
        
        // Create workspace with users and channels
        return Workspace.fromDetailedJson(workspaceData, usersData, channelsData);
      } else {
        throw Exception(data['message'] ?? 'Failed to fetch workspace details');
      }
    } catch (e) {
      throw Exception('Failed to fetch workspace details: $e');
    }
  }

  static Future<Channel> getChannelDetails(String channelId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/workspace/channels/$channelId'),
        headers: await _headers,
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success']) {
        return Channel.fromJson(data['result']);
      } else {
        throw Exception(data['message'] ?? 'Failed to fetch channel details');
      }
    } catch (e) {
      throw Exception('Failed to fetch channel details: $e');
    }
  }

  // Message API calls
  static Future<List<Message>> getOneToOneMessages(
    String senderId,
    String receiverId, {
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/chat/message?receiverId=$receiverId&skip=${(page - 1) * limit}&limit=$limit'),
        headers: await _headers,
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success']) {
        return (data['result']['messages'] as List)
            .map((message) => Message.fromJson(message))
            .toList();
      } else {
        throw Exception(data['message'] ?? 'Failed to fetch messages');
      }
    } catch (e) {
      throw Exception('Failed to fetch messages: $e');
    }
  }

  static Future<List<Message>> getChannelMessages(
    String channelId,
    String workspaceId, {
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/chat/message?channelId=$channelId&skip=${(page - 1) * limit}&limit=$limit'),
        headers: await _headers,
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success']) {
        return (data['result']['messages'] as List)
            .map((message) => Message.fromJson(message))
            .toList();
      } else {
        throw Exception(data['message'] ?? 'Failed to fetch channel messages');
      }
    } catch (e) {
      throw Exception('Failed to fetch channel messages: $e');
    }
  }

  // Logout
  static Future<void> logout() async {
    await _storage.deleteAll();
  }

  // Get current user
  static Future<User?> getCurrentUser() async {
    try {
      final userData = await _storage.read(key: 'user');
      if (userData != null) {
        return User.fromJson(json.decode(userData));
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
