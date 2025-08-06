import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import WorkspaceList from './components/workspace/WorkspaceList';
import WorkspaceDetail from './components/workspace/WorkspaceDetail';
import ChatInterface from './components/chat/ChatInterface';
import ChannelChatInterface from './components/chat/ChannelChatInterface';
import { Loader2 } from 'lucide-react';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={() => window.location.reload()} />;
  }

  return children;
};

// Main App Content
const AppContent = () => {
  const [currentView, setCurrentView] = useState('workspaces'); // 'workspaces', 'workspace-detail', 'chat', 'channel-chat'
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const { user, logout } = useAuth();

  const handleWorkspaceSelect = (workspace) => {
    setSelectedWorkspace(workspace);
    setCurrentView('workspace-detail');
  };

  const handleChannelSelect = (chatData) => {
    setSelectedChannel(chatData);
    if (chatData.type === 'channel') {
      setCurrentView('channel-chat');
    } else {
      setCurrentView('chat');
    }
  };

  const handleBackToWorkspaces = () => {
    setSelectedWorkspace(null);
    setSelectedChannel(null);
    setCurrentView('workspaces');
  };

  const handleBackToWorkspaceDetail = () => {
    setSelectedChannel(null);
    setCurrentView('workspace-detail');
  };

  const handleLogout = () => {
    logout();
    setCurrentView('workspaces');
    setSelectedWorkspace(null);
    setSelectedChannel(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'workspace-detail':
        return (
          <WorkspaceDetail
            workspace={selectedWorkspace}
            onBack={handleBackToWorkspaces}
            onChannelSelect={handleChannelSelect}
          />
        );
      
      case 'chat':
        return (
          <ChatInterface
            workspace={selectedWorkspace}
            onBack={handleBackToWorkspaceDetail}
            initialChat={selectedChannel}
          />
        );
      
      case 'channel-chat':
        return (
          <ChannelChatInterface
            workspace={selectedWorkspace}
            channel={selectedChannel.data}
            onBack={handleBackToWorkspaceDetail}
          />
        );
      
      default:
        return (
          <WorkspaceList onWorkspaceSelect={handleWorkspaceSelect} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {currentView !== 'chat' && (
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Real-Time Chat App
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Welcome, {user?.name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={currentView === 'chat' ? 'h-screen' : 'min-h-screen'}>
        {renderCurrentView()}
      </main>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppContent />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;

