import 'package:flutter/material.dart';
import '../models/user_model.dart';

class TypingIndicator extends StatefulWidget {
  final List<String> typingUsers;
  final List<User> workspaceUsers;

  const TypingIndicator({
    super.key,
    required this.typingUsers,
    required this.workspaceUsers,
  });

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    _animationController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.typingUsers.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Typing dots animation
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDot(0),
                const SizedBox(width: 4),
                _buildDot(1),
                const SizedBox(width: 4),
                _buildDot(2),
              ],
            ),
          ),
          const SizedBox(width: 8),
          
          // Typing text
          Flexible(
            child: Text(
              _getTypingText(),
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDot(int index) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        final delay = index * 0.2;
        final opacity = _animation.value > delay && _animation.value < delay + 0.4
            ? 1.0
            : 0.3;
        
        return Opacity(
          opacity: opacity,
          child: Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: Colors.grey[600],
              shape: BoxShape.circle,
            ),
          ),
        );
      },
    );
  }

  String _getTypingText() {
    if (widget.typingUsers.isEmpty) return '';
    
    if (widget.typingUsers.length == 1) {
      final userId = widget.typingUsers.first;
      final userName = _getUserName(userId);
      return '$userName is typing...';
    } else if (widget.typingUsers.length == 2) {
      final user1 = _getUserName(widget.typingUsers[0]);
      final user2 = _getUserName(widget.typingUsers[1]);
      return '$user1 and $user2 are typing...';
    } else {
      return '${widget.typingUsers.length} people are typing...';
    }
  }

  String _getUserName(String userId) {
    final user = widget.workspaceUsers.firstWhere(
      (user) => user.id == userId,
      orElse: () => User(
        id: userId,
        name: 'User $userId',
        email: 'user$userId@example.com',
      ),
    );
    return user.name;
  }
}
