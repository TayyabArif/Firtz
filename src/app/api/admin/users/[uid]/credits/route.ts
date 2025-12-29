import { NextRequest, NextResponse } from 'next/server';
import { addCreditsServer, isUserAdmin } from '@/firebase/firestore/userProfileServer';

// Get Firebase ID token from request
async function getAuthToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Verify admin access (check if user has admin: true in profile)
async function verifyAdmin(token: string): Promise<boolean> {
  try {
    const { auth } = await import('@/firebase/firebase-admin');
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user has admin role in their profile
    return await isUserAdmin(decodedToken.uid);
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return false;
  }
}

// POST /api/admin/users/[uid]/credits - Add credits to a user
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
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
    const isAdmin = await verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Get user ID from params (Next.js 15+ uses Promise)
    const params = await context.params;
    const uid = params?.uid;
    if (!uid) {
      console.error('❌ UID not found in params:', params);
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { amount, reason } = body;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid credit amount is required (must be a positive number)' },
        { status: 400 }
      );
    }
    
    // Add credits using server-side function
    const { result, error } = await addCreditsServer(uid, amount);
    
    if (error || !result) {
      console.error('Error adding credits:', error);
      return NextResponse.json(
        { error: 'Failed to add credits', details: error?.message || 'Unknown error' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully added ${amount} credits to user`,
      uid,
      amount,
      reason: reason || 'Admin credit adjustment'
    });
    
  } catch (error) {
    console.error('Error in add credits API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

