import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  ArrowLeft, 
  Hash, 
  Users, 
  Crown, 
  Shield, 
  User,
  Lock,
  Globe
} from 'lucide-react';
import { workspaceAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const WorkspaceDetail = ({ workspace, onBack, onChannelSelect }) => {
  const [workspaceDetails, setWorkspaceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (workspace?._id) {
      fetchWorkspaceDetails();
    }
  }, [workspace]);

  const fetchWorkspaceDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await workspaceAPI.getWorkspaceDetails(workspace._id);
      
      if (response.success) {
        setWorkspaceDetails(response.result);
      } else {
        setError(response.message || 'Failed to fetch workspace details');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch workspace details');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChannelIcon = (type) => {
    return type === 'private' ? 
      <Lock className="h-4 w-4 text-gray-500" /> : 
      <Hash className="h-4 w-4 text-gray-500" />;
  };

  const isUserInChannel = (channel) => {
    return channel.members?.some(member => member.userId === user?._id);
  };

  const handleUserClick = (selectedUser) => {
    // Navigate to chat interface with user selected for one-to-one chat
    onChannelSelect({ type: 'user', data: selectedUser });
  };

  const handleChannelClick = (selectedChannel) => {
    // Navigate to chat interface with channel selected
    onChannelSelect({ type: 'channel', data: selectedChannel });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading workspace details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Button onClick={onBack} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workspaces
        </Button>
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!workspaceDetails) {
    return null;
  }

  const { workspace: ws, users, channels } = workspaceDetails;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button onClick={onBack} variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workspaces
        </Button>
      </div>

      {/* Workspace Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{ws.name}</CardTitle>
            <Badge variant="secondary">{ws.status}</Badge>
          </div>
          <p className="text-gray-500">{ws.slug}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Members:</span> {ws.memberCount}
            </div>
            <div>
              <span className="font-medium">Created:</span> {new Date(ws.createdAt).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Hash className="h-5 w-5 mr-2" />
              Channels ({channels?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {channels?.length > 0 ? (
              channels.map((channel) => {
                const canAccess = isUserInChannel(channel);
                
                return (
                  <div 
                    key={channel._id} 
                    className={`p-3 rounded-lg border ${canAccess ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60'}`}
                    onClick={() => canAccess && handleChannelClick(channel)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getChannelIcon(channel.type)}
                        <span className="ml-2 font-medium">{channel.name}</span>
                        {channel.type === 'private' && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Private
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {channel.members?.length || 0} members
                      </div>
                    </div>
                    
                    {channel.description && (
                      <p className="text-sm text-gray-600 mt-1">{channel.description}</p>
                    )}
                    
                    {!canAccess && (
                      <p className="text-xs text-red-500 mt-1">
                        You don't have access to this channel
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-4">No channels found</p>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Members ({users?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {users?.length > 0 ? (
              users.map((member) => (
                <div 
                  key={member.userId} 
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleUserClick(member)}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {member.roles?.map((role) => (
                      <div key={role} className="flex items-center">
                        {getRoleIcon(role)}
                        <span className="ml-1 text-xs capitalize">{role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No members found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkspaceDetail;

