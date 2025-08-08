enum MessageType { text, image, file, audio, video }

class Message {
  final String id;
  final String content;
  final String senderId;
  final String? receiverId;
  final String? channelId;
  final String workspaceId;
  final MessageType messageType;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isRead;
  final Map<String, dynamic>? metadata;

  Message({
    required this.id,
    required this.content,
    required this.senderId,
    this.receiverId,
    this.channelId,
    required this.workspaceId,
    required this.messageType,
    required this.createdAt,
    required this.updatedAt,
    this.isRead = false,
    this.metadata,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['_id'] ?? '',
      content: json['content'] ?? '',
      senderId: json['senderId'] ?? '',
      receiverId: json['receiverId'],
      channelId: json['channelId'],
      workspaceId: json['workspaceId'] ?? '',
      messageType: _parseMessageType(json['messageType'] ?? 'text'),
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
      isRead: json['isRead'] ?? false,
      metadata: json['metadata'],
    );
  }

  static MessageType _parseMessageType(String type) {
    switch (type.toLowerCase()) {
      case 'image':
        return MessageType.image;
      case 'file':
        return MessageType.file;
      case 'audio':
        return MessageType.audio;
      case 'video':
        return MessageType.video;
      default:
        return MessageType.text;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'content': content,
      'senderId': senderId,
      'receiverId': receiverId,
      'channelId': channelId,
      'workspaceId': workspaceId,
      'messageType': messageType.name,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'isRead': isRead,
      'metadata': metadata,
    };
  }

  Message copyWith({
    String? id,
    String? content,
    String? senderId,
    String? receiverId,
    String? channelId,
    String? workspaceId,
    MessageType? messageType,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isRead,
    Map<String, dynamic>? metadata,
  }) {
    return Message(
      id: id ?? this.id,
      content: content ?? this.content,
      senderId: senderId ?? this.senderId,
      receiverId: receiverId ?? this.receiverId,
      channelId: channelId ?? this.channelId,
      workspaceId: workspaceId ?? this.workspaceId,
      messageType: messageType ?? this.messageType,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isRead: isRead ?? this.isRead,
      metadata: metadata ?? this.metadata,
    );
  }

  bool get isOneToOne => receiverId != null && channelId == null;
  bool get isChannelMessage => channelId != null;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Message && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'Message(id: $id, content: $content, senderId: $senderId, type: $messageType)';
  }
}
