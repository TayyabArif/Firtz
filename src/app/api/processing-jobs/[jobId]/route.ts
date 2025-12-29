import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/firebase/firebase-admin';
import * as admin from 'firebase-admin';

// Get Firebase ID token from request
async function getAuthToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Verify user authentication
async function getUserId(token: string): Promise<string | null> {
  try {
    const { auth } = await import('@/firebase/firebase-admin');
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    return null;
  }
}

// GET /api/processing-jobs/[jobId] - Get job status
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
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

    // Get user ID
    const userId = await getUserId(token);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Get job ID from params
    const params = await context.params;
    const jobId = params?.jobId;
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get job document
    const jobRef = firestore.collection('processing_jobs').doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();

    // Verify job belongs to user
    if (jobData?.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Job does not belong to user' },
        { status: 403 }
      );
    }

    // Convert timestamps to ISO strings for JSON serialization
    const job = {
      id: jobId,
      userId: jobData?.userId,
      brandId: jobData?.brandId,
      status: jobData?.status,
      totalQueries: jobData?.totalQueries || 0,
      processedQueries: jobData?.processedQueries || 0,
      currentQuery: jobData?.currentQuery,
      creditsUsed: jobData?.creditsUsed,
      error: jobData?.error,
      createdAt: jobData?.createdAt?.toDate?.()?.toISOString() || null,
      startedAt: jobData?.startedAt?.toDate?.()?.toISOString() || null,
      completedAt: jobData?.completedAt?.toDate?.()?.toISOString() || null,
      failedAt: jobData?.failedAt?.toDate?.()?.toISOString() || null,
      lastUpdated: jobData?.lastUpdated?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json({
      success: true,
      job
    });

  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

