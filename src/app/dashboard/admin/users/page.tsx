'use client'
import React, { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { Users, CreditCard, Plus, Search, RefreshCw } from 'lucide-react';
import Card from '@/components/shared/Card';
import { UserProfile } from '@/firebase/firestore/userProfile';
import { getFirebaseIdTokenWithRetry } from '@/utils/getFirebaseToken';
import { useToast } from '@/context/ToastContext';

interface UserWithStatus extends UserProfile {
  status: 'active' | 'inactive';
}

export default function AdminUsersPage(): React.ReactElement {
  const { user } = useAuthContext();
  const { showSuccess, showError } = useToast();
  
  // User management state
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [isAddingCredits, setIsAddingCredits] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    
    setLoadingUsers(true);
    try {
      const idToken = await getFirebaseIdTokenWithRetry(3, 1000);
      if (!idToken) {
        showError('Authentication Error', 'Failed to get authentication token');
        return;
      }
      
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      
      const data = await response.json();
      
      // Add status based on last login (inactive if > 30 days)
      const usersWithStatus: UserWithStatus[] = data.users.map((u: UserProfile) => {
        const lastLogin = new Date(u.lastLoginAt);
        const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
        return {
          ...u,
          status: daysSinceLogin > 30 ? 'inactive' : 'active'
        };
      });
      
      setUsers(usersWithStatus);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to fetch users');
    } finally {
      setLoadingUsers(false);
    }
  }, [user, showError]);

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle add credits
  const handleAddCredits = async () => {
    if (!selectedUser || !creditAmount) return;
    
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      showError('Invalid Amount', 'Please enter a valid positive number');
      return;
    }
    
    if (!user) return;
    
    setIsAddingCredits(true);
    try {
      const idToken = await getFirebaseIdTokenWithRetry(3, 1000);
      if (!idToken) {
        showError('Authentication Error', 'Failed to get authentication token');
        return;
      }
      
      const response = await fetch(`/api/admin/users/${selectedUser.uid}/credits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          reason: creditReason || 'Admin credit adjustment'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add credits');
      }
      
      showSuccess('Credits Added', `Successfully added ${amount} credits to ${selectedUser.email}`);
      
      // Refresh users list
      await fetchUsers();
      
      // Reset form
      setShowCreditModal(false);
      setSelectedUser(null);
      setCreditAmount('');
      setCreditReason('');
    } catch (error) {
      console.error('Error adding credits:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to add credits');
    } finally {
      setIsAddingCredits(false);
    }
  };

  // Open credit modal
  const openCreditModal = (user: UserWithStatus) => {
    setSelectedUser(user);
    setCreditAmount('');
    setCreditReason('');
    setShowCreditModal(true);
  };

  // Filter users by search query
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">Manage users, credits, and user accounts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Users</p>
              <p className="text-3xl font-bold text-foreground">{totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Users</p>
              <p className="text-3xl font-bold text-foreground">{activeUsers}</p>
            </div>
            <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Credits</p>
              <p className="text-3xl font-bold text-foreground">{totalCredits.toLocaleString()}</p>
            </div>
            <CreditCard className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Users Table Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-[#000C60]" />
            <h2 className="text-xl font-semibold text-foreground">All Users</h2>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="flex items-center space-x-2 text-[#000C60] hover:text-[#000C60]/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000C60] focus:border-transparent bg-background text-foreground"
            />
          </div>
        </div>

        {/* Users Table */}
        {loadingUsers ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-[#000C60]" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Email</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Name</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Credits</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Admin</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Last Login</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3 text-sm text-foreground">{user.email}</td>
                    <td className="p-3 text-sm text-foreground">{user.displayName}</td>
                    <td className="p-3 text-sm font-semibold text-foreground">
                      {user.credits.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.admin
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openCreditModal(user)}
                        className="flex items-center space-x-1 text-[#000C60] hover:text-[#000C60]/80 transition-colors text-sm font-medium"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Add Credits</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Credits Modal */}
      {showCreditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Add Credits</h3>
              <button
                onClick={() => setShowCreditModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">User</p>
                <p className="font-medium text-foreground">{selectedUser.email}</p>
                <p className="text-sm text-muted-foreground">Current credits: {selectedUser.credits.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Credit Amount
                </label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000C60] focus:border-transparent bg-background text-foreground"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="e.g. Promotional credits, Customer support"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000C60] focus:border-transparent bg-background text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreditModal(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCredits}
                disabled={!creditAmount || isAddingCredits}
                className="px-6 py-2 bg-[#000C60] text-white rounded-lg hover:bg-[#000C60]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isAddingCredits ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Add Credits</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

