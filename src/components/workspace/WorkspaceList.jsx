import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Hash, Crown, Shield } from 'lucide-react';
import { workspaceAPI } from '../../lib/api';

const WorkspaceList = ({ onWorkspaceSelect }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await workspaceAPI.getAllWorkspaces();
      
      if (response.success) {
        setWorkspaces(response.result);
      } else {
        setError(response.message || 'Failed to fetch workspaces');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch workspaces');
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
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUserRole = (workspace, userId) => {
    const member = workspace.members?.find(m => m.userId === userId);
    return member?.role || 'member';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading workspaces...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4 border-red-200 bg-red-50">
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="text-center p-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Workspaces Found</h3>
        <p className="text-gray-500">You don't have access to any workspaces yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Workspaces</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => {
          const userRole = getUserRole(workspace, workspace.owner); // This should be current user ID
          
          return (
            <Card key={workspace._id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{workspace.name}</CardTitle>
                  {getRoleIcon(userRole)}
                </div>
                <p className="text-sm text-gray-500">
                  {workspace.slug}
                </p>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-1" />
                    {workspace.members?.length || 0} members
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {workspace.status}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mb-4">
                  Created: {new Date(workspace.createdAt).toLocaleDateString()}
                </div>
                
                <Button 
                  onClick={() => onWorkspaceSelect(workspace)}
                  className="w-full"
                  size="sm"
                >
                  Open Workspace
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default WorkspaceList;

