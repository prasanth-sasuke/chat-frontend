# Real-Time Chat Application

cd /c/Users/DreamsTechnologies/Downloads/chat-frontend-main/flutter_chat_app
flutter pub get
flutter run -d chrome --web-port=8082

A modern real-time chat application built with React, featuring both one-to-one and group chat capabilities.

## Features

### 🚀 Core Features
- **Real-time messaging** using Socket.IO
- **One-to-one chat** between users
- **Group chat** in channels
- **Online/offline status** indicators
- **Typing indicators** for real-time feedback
- **Message history** with date separators
- **Search functionality** for users and channels
- **Responsive design** with modern UI

### 💬 Chat Types
1. **One-to-One Chat**: Direct messaging between two users
   - Uses `receiverId` parameter for message routing
   - Real-time typing indicators
   - Online status display

2. **Group Chat**: Channel-based messaging
   - Uses `channelId` parameter for message routing
   - Multiple participants
   - Channel member count display

### 🔧 Technical Implementation

#### Socket Events
- `send-message`: One-to-one message sending
- `send-message-to-channel`: Channel message sending
- `typing`: One-to-one typing indicator
- `typing-to-channel`: Channel typing indicator
- `join-channel`: Join channel room
- `join`: Join personal room

#### API Endpoints
- `GET /chat/message?senderId=X&receiverId=Y` - One-to-one messages
- `GET /chat/message?senderId=X&channelId=Y` - Channel messages

#### Message Structure
```javascript
{
  senderId: "user_id",
  receiverId: "receiver_id", // for one-to-one
  channelId: "channel_id",   // for group chat
  workspaceId: "workspace_id",
  content: "message content",
  messageType: "text|image|file|emoji",
  mediaFiles: [] // optional
}
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:5173`

## Usage

### Workspace Navigation
- Select a workspace from the workspace list
- View workspace details including members and channels

### One-to-One Chat
- Click on any user in the workspace members list
- Start a private conversation
- See real-time typing indicators and online status

### Group Chat
- Click on any channel in the workspace
- Join the channel conversation
- Send messages to all channel members

### Chat Interface
- **Left sidebar**: Workspace navigation
- **Middle panel**: User and channel lists with search
- **Main area**: Chat messages and input

## Architecture

### Components
- `ChatInterface`: Main chat component with three-panel layout
- `MessageList`: Message display with grouping and timestamps
- `WorkspaceDetail`: Workspace overview with user/channel selection
- `SocketService`: WebSocket connection management

### State Management
- React Context for authentication
- Local state for chat data and UI state
- Socket.IO for real-time communication

## Socket Connection

The application automatically connects to the Socket.IO server when authenticated:
- **Server**: `https://nexwork-api.dreamstechnologies.com`
- **Authentication**: JWT token-based
- **Reconnection**: Automatic with exponential backoff
- **Transport**: WebSocket with polling fallback

### Online/Offline Status

The application implements real-time online/offline status tracking:

#### Backend Events (Socket.IO)
- `user-online`: Emitted when a user connects
- `user-offline`: Emitted when a user disconnects  
- `online-users`: Initial list of online users sent on connection

#### Frontend Implementation
- **Connection Tracking**: Monitors socket connection status
- **User Status**: Tracks online/offline status for all users
- **Visual Indicators**: 
  - Green dot for online users
  - Gray dot for offline users
  - Connection status in chat header
  - Online user count display

#### How It Works
1. **On Connection**: User joins personal room and receives online users list
2. **Status Updates**: Real-time updates when users connect/disconnect
3. **Visual Feedback**: Status indicators update immediately
4. **Persistence**: Status maintained across chat sessions

#### Debug Information
- Console logs show online/offline events
- Current online users list logged on changes
- Individual user status checks logged

## Message Types

- **Text**: Standard text messages
- **Image**: Image attachments with preview
- **File**: File attachments with download
- **Emoji**: Emoji reactions
- **Media Group**: Multiple media files

## Error Handling

- Connection errors with automatic reconnection
- Message sending failures with user feedback
- Rate limiting protection
- Input validation for message content

## Future Enhancements

- File upload functionality
- Message reactions
- Message editing and deletion
- Read receipts
- Message search
- Voice and video calls
- Push notifications

