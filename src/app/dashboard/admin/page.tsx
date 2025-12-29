'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect /dashboard/admin to /dashboard/admin/users
export default function AdminPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/admin/users');
  }, [router]);
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-foreground">Redirecting to admin panel...</div>
    </div>
  );
}
