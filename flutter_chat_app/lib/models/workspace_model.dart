import 'user_model.dart';

class Channel {
  final String id;
  final String name;
  final String description;
  final List<String> members;
  final String workspaceId;
  final DateTime createdAt;
  final DateTime updatedAt;

  Channel({
    required this.id,
    required this.name,
    required this.description,
    required this.members,
    required this.workspaceId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Channel.fromJson(Map<String, dynamic> json) {
    return Channel(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      members: List<String>.from(json['members'] ?? []),
      workspaceId: json['workspaceId'] ?? '',
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'description': description,
      'members': members,
      'workspaceId': workspaceId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class Workspace {
  final String id;
  final String name;
  final String description;
  final List<User> users;
  final List<Channel> channels;
  final List<Map<String, dynamic>> members; // Added to match React structure
  final int memberCount; // Added to match API response
  final String ownerId;
  final DateTime createdAt;
  final DateTime updatedAt;

  Workspace({
    required this.id,
    required this.name,
    required this.description,
    required this.users,
    required this.channels,
    required this.members,
    required this.memberCount,
    required this.ownerId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Workspace.fromJson(Map<String, dynamic> json) {
    return Workspace(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      users: (json['users'] as List<dynamic>?)
          ?.map((user) => User.fromJson(user))
          .toList() ?? [],
      channels: (json['channels'] as List<dynamic>?)
          ?.map((channel) => Channel.fromJson(channel))
          .toList() ?? [],
      members: (json['members'] as List<dynamic>?)
          ?.map((member) => Map<String, dynamic>.from(member))
          .toList() ?? [],
      memberCount: json['memberCount'] ?? 0,
      ownerId: json['ownerId'] ?? '',
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  // Factory method for basic workspace data (from get-all endpoint)
  factory Workspace.fromBasicJson(Map<String, dynamic> json) {
    return Workspace(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      users: [], // Will be loaded separately
      channels: [], // Will be loaded separately
      members: [], // Will be loaded separately
      memberCount: json['memberCount'] ?? 0,
      ownerId: json['ownerId'] ?? '',
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  // Factory method for detailed workspace data (from get-workspace-details endpoint)
  factory Workspace.fromDetailedJson(
    Map<String, dynamic> workspaceData,
    List<dynamic> usersData,
    List<dynamic> channelsData,
  ) {
    // Convert users data to User objects
    final users = usersData.map((userData) {
      return User(
        id: userData['userId'] ?? '',
        name: userData['name'] ?? '',
        email: userData['email'] ?? '',
        avatar: userData['avatar'] ?? '',
        isOnline: false, // Default value
        lastSeen: DateTime.now(), // Default value
      );
    }).toList();

    // Convert channels data to Channel objects
    final channels = channelsData.map((channelData) {
      return Channel(
        id: channelData['_id'] ?? '',
        name: channelData['name'] ?? '',
        description: channelData['description'] ?? '',
        members: (channelData['members'] as List<dynamic>?)
            ?.map((member) => member['userId']?.toString() ?? '')
            .toList() ?? [],
        workspaceId: channelData['workspaceId'] ?? '',
        createdAt: DateTime.parse(channelData['createdAt'] ?? DateTime.now().toIso8601String()),
        updatedAt: DateTime.parse(channelData['updatedAt'] ?? DateTime.now().toIso8601String()),
      );
    }).toList();

    // Convert users to members format for compatibility
    final members = usersData.map((userData) {
      return {
        'userId': userData['userId'] ?? '',
        'name': userData['name'] ?? '',
        'email': userData['email'] ?? '',
        'role': (userData['roles'] as List<dynamic>?)?.firstOrNull ?? 'member',
      };
    }).toList();

    return Workspace(
      id: workspaceData['_id'] ?? '',
      name: workspaceData['name'] ?? '',
      description: workspaceData['description'] ?? '',
      users: users,
      channels: channels,
      members: members,
      memberCount: workspaceData['memberCount'] ?? users.length,
      ownerId: workspaceData['owner'] ?? '',
      createdAt: DateTime.parse(workspaceData['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(workspaceData['updatedAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'description': description,
      'users': users.map((user) => user.toJson()).toList(),
      'channels': channels.map((channel) => channel.toJson()).toList(),
      'members': members,
      'memberCount': memberCount,
      'ownerId': ownerId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
