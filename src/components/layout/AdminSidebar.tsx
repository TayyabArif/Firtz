'use client'
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import signOut from '@/firebase/auth/signOut';
import { 
  Users, 
  Settings,
  Database,
  ArrowLeft,
  Menu,
  LogOut,
  User as UserIcon,
  Shield,
  CreditCard
} from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';

const adminNavigationItems = [
  { name: 'User Management', href: '/dashboard/admin/users', icon: Users },
  { name: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
  { name: 'Database', href: '/dashboard/admin/database', icon: Database },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, refreshUserProfile } = useAuthContext();

  const handleSignOut = async () => {
    const { result, error } = await signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      return;
    }
    
    router.push('/signin');
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-6 left-6 z-50 p-2 rounded-lg bg-card border border-border text-foreground hover:bg-accent transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#0E353C] border-r border-[#1a4a54] transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-6">
            <div className="flex items-center justify-center w-full">
              <div className="relative">
                <Image
                  src="/fitst-logo.svg"
                  alt="Admin Panel Logo"
                  width={160}
                  height={36}
                  style={{ width: 'auto', height: 'auto' }}
                  priority
                  className="h-9 w-auto"
                />
              </div>
            </div>
          </div>

          {/* Back to Dashboard Button */}
          <div className="px-6 mb-4">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#164a54] text-white hover:bg-[#1a4a54] transition-colors border border-[#1a4a54]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>
          </div>

          {/* Admin Badge */}
          <div className="px-6 mb-6">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30">
              <Shield className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Admin Mode</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-6 space-y-1 overflow-y-auto">
            {adminNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[#93E85F] text-black shadow-lg shadow-[#93E85F]/20'
                      : 'text-gray-300 hover:bg-[#164a54] hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-black' : 'text-gray-300 group-hover:text-white'} transition-colors`} />
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-black rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-[#1a4a54]">
            {/* Credits Display */}
            {userProfile && typeof userProfile.credits === 'number' && (
              <div className={`mb-3 px-4 py-2 rounded-xl border ${
                userProfile.credits < 50 
                  ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' 
                  : userProfile.credits < 100
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                  : 'bg-gradient-to-r from-[#000C60]/10 to-[#00B087]/10 border-[#000C60]/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className={`h-3 w-3 ${
                      userProfile.credits < 50 
                        ? 'text-red-600' 
                        : userProfile.credits < 100
                        ? 'text-yellow-600'
                        : 'text-[#000C60]'
                    }`} />
                    <span className={`text-xs font-medium ${
                      userProfile.credits < 50 
                        ? 'text-red-600' 
                        : userProfile.credits < 100
                        ? 'text-yellow-600'
                        : 'text-[#000C60]'
                    }`}>Available Credits</span>
                  </div>
                  <span className={`text-sm font-bold ${
                    userProfile.credits < 50 
                      ? 'text-red-600' 
                      : userProfile.credits < 100
                      ? 'text-yellow-600'
                      : 'text-[#000C60]'
                  }`}>{userProfile.credits.toLocaleString()}</span>
                </div>
                {userProfile.credits < 50 && (
                  <div className="mt-1 text-xs text-red-600">
                    ⚠️ Low credits! Consider purchasing more.
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-[#164a54] border border-[#1a4a54]">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-[#00B087] to-[#00A078] rounded-full flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-gray-300 text-xs truncate">
                  {userProfile?.email || user?.email || 'No email'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-300 hover:text-white transition-colors p-1"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

