# Flutter Real-Time Chat App

A modern, real-time chat application built with Flutter that supports both one-to-one and group conversations. This app is a complete conversion of the React chat application to Flutter.

## Features

- 🔐 **Authentication**: Email-based OTP authentication
- 💬 **Real-time Messaging**: Instant message delivery using Socket.IO
- 👥 **One-to-One Chat**: Private conversations between users
- 📢 **Channel Chat**: Group conversations with multiple members
- 🏢 **Workspace Management**: Organize users and channels by workspaces
- 📱 **Modern UI**: Beautiful Material Design 3 interface
- 🔄 **Real-time Status**: Online/offline indicators and typing indicators
- 📨 **Message Types**: Support for text, images, files, audio, and video messages
- 🔍 **Search**: Search users and channels within workspaces
- 🔒 **Secure Storage**: Secure token storage using flutter_secure_storage

## Screenshots

The app includes the following screens:
- **Splash Screen**: App loading and authentication check
- **Login Screen**: Email and OTP verification
- **Home Screen**: Workspace list and navigation
- **Workspace Detail**: Users and channels management
- **Chat Screen**: Real-time messaging interface

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── models/                   # Data models
│   ├── user_model.dart
│   ├── workspace_model.dart
│   └── message_model.dart
├── services/                 # API and Socket services
│   ├── api_service.dart
│   └── socket_service.dart
├── providers/               # State management
│   ├── auth_provider.dart
│   ├── workspace_provider.dart
│   └── chat_provider.dart
├── screens/                 # App screens
│   ├── splash_screen.dart
│   ├── login_screen.dart
│   ├── home_screen.dart
│   ├── workspace_detail_screen.dart
│   └── chat_screen.dart
└── widgets/                 # Reusable widgets
    ├── custom_text_field.dart
    ├── workspace_card.dart
    ├── user_list_tile.dart
    ├── channel_list_tile.dart
    ├── message_bubble.dart
    └── typing_indicator.dart
```

## Getting Started

### Prerequisites

- Flutter SDK (3.0.0 or higher)
- Dart SDK (3.0.0 or higher)
- Android Studio / VS Code
- Android Emulator or Physical Device

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flutter_chat_app
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Run the app**
   ```bash
   flutter run
   ```

### Configuration

The app is configured to connect to the backend API at `https://nexwork-api.dreamstechnologies.com`. Make sure the backend server is running and accessible.

## Dependencies

### Core Dependencies
- `flutter`: Flutter SDK
- `provider`: State management
- `http`: HTTP requests
- `socket_io_client`: Real-time communication
- `shared_preferences`: Local storage
- `flutter_secure_storage`: Secure token storage

### UI Dependencies
- `intl`: Date and time formatting
- `flutter_svg`: SVG support
- `cached_network_image`: Image caching

### Additional Features
- `image_picker`: Image selection
- `file_picker`: File selection
- `permission_handler`: Permission management
- `flutter_local_notifications`: Push notifications
- `connectivity_plus`: Network connectivity

## Architecture

### State Management
The app uses the Provider pattern for state management with three main providers:

1. **AuthProvider**: Manages authentication state and user sessions
2. **WorkspaceProvider**: Handles workspace data and selection
3. **ChatProvider**: Manages chat state, messages, and real-time communication

### API Service
The `ApiService` class handles all HTTP requests to the backend:
- Authentication (login, OTP verification)
- Workspace management
- Message retrieval

### Socket Service
The `SocketService` class manages real-time communication:
- WebSocket connection
- Message sending/receiving
- Typing indicators
- Online status updates

## Key Features Implementation

### Real-time Messaging
- Uses Socket.IO for real-time communication
- Automatic reconnection handling
- Message acknowledgment system
- Typing indicators with debouncing

### Authentication
- Email-based OTP authentication
- Secure token storage
- Automatic session restoration
- Logout functionality

### UI/UX
- Material Design 3 components
- Responsive layout
- Smooth animations
- Loading states and error handling

## API Endpoints

The app communicates with the following backend endpoints:

- `POST /user/public/login` - Send OTP
- `POST /user/public/verify` - Verify OTP
- `GET /workspace/get-all` - Get all workspaces
- `GET /workspace/get-workspace-details/{id}` - Get workspace details
- `GET /chat/message` - Get messages (one-to-one or channel)

## Socket Events

### Client to Server
- `join` - Join personal room
- `join-channel` - Join channel room
- `send-message` - Send one-to-one message
- `send-message-to-channel` - Send channel message
- `typing` - Start typing indicator
- `stop-typing` - Stop typing indicator

### Server to Client
- `receive-message` - Receive one-to-one message
- `receive-message-to-channel` - Receive channel message
- `typing` - User typing indicator
- `stop-typing` - User stopped typing
- `user-online` - User went online
- `user-offline` - User went offline
- `online-users` - List of online users

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

## Future Enhancements

- Push notifications
- File upload/download
- Voice and video calls
- Message reactions
- Message search
- Dark mode support
- Offline message queuing
- Message encryption
