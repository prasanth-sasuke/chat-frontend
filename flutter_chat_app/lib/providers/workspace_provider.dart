import 'package:flutter/material.dart';
import '../models/workspace_model.dart';
import '../services/api_service.dart';

class WorkspaceProvider extends ChangeNotifier {
  List<Workspace> _workspaces = [];
  Workspace? _selectedWorkspace;
  bool _loading = false;
  String? _error;

  List<Workspace> get workspaces => _workspaces;
  Workspace? get selectedWorkspace => _selectedWorkspace;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> loadWorkspaces() async {
    try {
      _loading = true;
      _error = null;
      notifyListeners();

      _workspaces = await ApiService.getAllWorkspaces();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> selectWorkspace(Workspace workspace) async {
    try {
      _loading = true;
      _error = null;
      notifyListeners();

      // Load full workspace details
      final detailedWorkspace = await ApiService.getWorkspaceDetails(workspace.id);
      _selectedWorkspace = detailedWorkspace;
      
      // Update the workspace in the list with full details
      final index = _workspaces.indexWhere((w) => w.id == workspace.id);
      if (index != -1) {
        _workspaces[index] = detailedWorkspace;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadWorkspaceStats(String workspaceId) async {
    try {
      // Load full workspace details
      final detailedWorkspace = await ApiService.getWorkspaceDetails(workspaceId);
      
      // Update the workspace in the list with full details
      final index = _workspaces.indexWhere((w) => w.id == workspaceId);
      if (index != -1) {
        _workspaces[index] = detailedWorkspace;
        notifyListeners();
      }
    } catch (e) {
      // Don't show error for stats loading, just log it
      print('Failed to load workspace stats: $e');
    }
  }

  void clearSelectedWorkspace() {
    _selectedWorkspace = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
