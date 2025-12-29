'use client'
import React, { useState } from 'react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import Header from '@/components/layout/Header';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen overflow-hidden">
          {/* Admin Sidebar */}
          <AdminSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

          {/* Main content */}
          <div className="flex-1 flex flex-col lg:ml-0 min-w-0">
            <Header title="Admin Panel" />
            
            {/* Content area */}
            <main className="flex-1 overflow-auto bg-background">
              <div className="p-6">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

