import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _isAuthenticated = false;
  bool _loading = true;
  String? _error;

  User? get user => _user;
  bool get isAuthenticated => _isAuthenticated;
  bool get loading => _loading;
  String? get error => _error;

  AuthProvider() {
    _initializeAuth();
  }

  Future<void> _initializeAuth() async {
    try {
      _loading = true;
      notifyListeners();

      final user = await ApiService.getCurrentUser();
      if (user != null) {
        _user = user;
        _isAuthenticated = true;
        
        // Connect to socket
        await SocketService.instance.connect();
        SocketService.instance.joinPersonalRoom(user.id);
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email) async {
    try {
      _loading = true;
      _error = null;
      notifyListeners();

      final response = await ApiService.login(email);
      return response['success'] ?? false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> verifyOTP(String email, String otp) async {
    try {
      _loading = true;
      _error = null;
      notifyListeners();

      final response = await ApiService.verifyOTP(email, otp);
      if (response['success']) {
        _user = User.fromJson(response['result']['user']);
        _isAuthenticated = true;
        
        // Connect to socket
        await SocketService.instance.connect();
        SocketService.instance.joinPersonalRoom(_user!.id);
        
        return true;
      } else {
        _error = response['message'] ?? 'OTP verification failed';
        return false;
      }
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    try {
      await ApiService.logout();
      await SocketService.instance.disconnect();
      
      _user = null;
      _isAuthenticated = false;
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
