import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/workspace_provider.dart';
import '../providers/chat_provider.dart';
import '../models/user_model.dart';
import '../models/workspace_model.dart';
import 'chat_screen.dart';
import '../widgets/user_list_tile.dart';
import '../widgets/channel_list_tile.dart';

class WorkspaceDetailScreen extends StatefulWidget {
  const WorkspaceDetailScreen({super.key});

  @override
  State<WorkspaceDetailScreen> createState() => _WorkspaceDetailScreenState();
}

class _WorkspaceDetailScreenState extends State<WorkspaceDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<WorkspaceProvider>(
      builder: (context, workspaceProvider, child) {
        final workspace = workspaceProvider.selectedWorkspace;
        
        if (workspace == null) {
          return const Scaffold(
            body: Center(
              child: Text('No workspace selected'),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(workspace.name),
            bottom: TabBar(
              controller: _tabController,
              tabs: const [
                Tab(text: 'Users'),
                Tab(text: 'Channels'),
              ],
            ),
          ),
          body: Column(
            children: [
              // Search Bar
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: TextField(
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value.toLowerCase();
                    });
                  },
                  decoration: InputDecoration(
                    hintText: 'Search users and channels...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                ),
              ),
              
              // Tab Content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildUsersTab(workspace),
                    _buildChannelsTab(workspace),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildUsersTab(Workspace workspace) {
    // Convert members to User objects for display
    final users = workspace.members.map((member) {
      return User(
        id: member['userId'] ?? '',
        name: member['name'] ?? 'Unknown User',
        email: member['email'] ?? '',
        avatar: member['avatar'] ?? '',
        isOnline: member['isOnline'] ?? false,
        lastSeen: DateTime.now(), // You might want to parse this from member data
      );
    }).toList();

    final filteredUsers = users.where((user) {
      return user.name.toLowerCase().contains(_searchQuery) ||
             user.email.toLowerCase().contains(_searchQuery);
    }).toList();

    if (filteredUsers.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.people_outline,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isEmpty ? 'No members found' : 'No members match your search',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

                return Consumer<ChatProvider>(
              builder: (context, chatProvider, child) {
                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: filteredUsers.length,
                  itemBuilder: (context, index) {
                    final user = filteredUsers[index];
                    final isOnline = chatProvider.isUserOnline(user.id);
                    return UserListTile(
                      user: user,
                      onTap: () => _startChatWithUser(user),
                      isOnline: isOnline,
                    );
                  },
                );
              },
            );
  }

  Widget _buildChannelsTab(Workspace workspace) {
    final filteredChannels = workspace.channels.where((channel) {
      return channel.name.toLowerCase().contains(_searchQuery) ||
             channel.description.toLowerCase().contains(_searchQuery);
    }).toList();

    if (filteredChannels.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.tag_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isEmpty ? 'No channels found' : 'No channels match your search',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: filteredChannels.length,
      itemBuilder: (context, index) {
        final channel = filteredChannels[index];
        return ChannelListTile(
          channel: channel,
          onTap: () => _joinChannel(channel),
        );
      },
    );
  }

  void _startChatWithUser(User user) {
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    chatProvider.selectUser(user);
    
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const ChatScreen(),
      ),
    );
  }

  void _joinChannel(Channel channel) {
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    chatProvider.selectChannel(channel);
    
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const ChatScreen(),
      ),
    );
  }
}
