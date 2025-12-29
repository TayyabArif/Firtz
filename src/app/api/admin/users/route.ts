import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/firebase/firebase-admin';
import { UserProfile } from '@/firebase/firestore/userProfile';
import { isUserAdmin } from '@/firebase/firestore/userProfileServer';

// Get Firebase ID token from request
async function getAuthToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Verify admin access (check if user has admin: true in profile)
async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; uid?: string; email?: string }> {
  try {
    const { auth } = await import('@/firebase/firebase-admin');
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user has admin role in their profile
    const isAdmin = await isUserAdmin(decodedToken.uid);
    
    return {
      isAdmin,
      uid: decodedToken.uid,
      email: decodedToken.email || undefined
    };
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return { isAdmin: false };
  }
}

// GET /api/admin/users - Get all users
export async function GET(request: NextRequest) {
  try {
    // Get and verify auth token
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: No token provided' },
        { status: 401 }
      );
    }
    
    // Verify admin access
    const { isAdmin } = await verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Fetch all users from Firestore
    const usersSnapshot = await firestore.collection('users').get();
    const users: UserProfile[] = [];
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        uid: doc.id,
        email: userData.email || '',
        displayName: userData.displayName || '',
        photoURL: userData.photoURL,
        credits: userData.credits || 0,
        createdAt: userData.createdAt || '',
        lastLoginAt: userData.lastLoginAt || '',
        isNewUser: userData.isNewUser || false,
        admin: userData.admin || false
      });
    });
    
    // Sort by last login (most recent first)
    users.sort((a, b) => {
      const dateA = new Date(a.lastLoginAt).getTime();
      const dateB = new Date(b.lastLoginAt).getTime();
      return dateB - dateA;
    });
    
    return NextResponse.json({
      success: true,
      users,
      count: users.length
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

