import { NextRequest, NextResponse } from 'next/server';
import { firestore, auth } from '@/firebase/firebase-admin';
import { getUserProfileServer } from '@/firebase/firestore/userProfileServer';
import { deductCreditsServer } from '@/firebase/firestore/userProfileServer';
import { updateBrandWithQueryResultsServer } from '@/firebase/firestore/getUserBrandsServer';
import { saveDetailedQueryResultsServer } from '@/firebase/firestore/detailedQueryResultsServer';
import { calculateCumulativeAnalytics, saveBrandAnalytics } from '@/firebase/firestore/brandAnalytics';
import { calculateCumulativeCompetitorAnalytics } from '@/utils/competitor-analytics';
import { saveCompetitorAnalytics } from '@/firebase/firestore/competitorAnalytics';
import * as admin from 'firebase-admin';

// Verify user authentication
async function authenticateUser(request: NextRequest): Promise<{ uid: string; profile: any; token: string } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    
    const { result: profile } = await getUserProfileServer(decodedToken.uid);
    if (!profile) {
      return null;
    }
    
    return { uid: decodedToken.uid, profile, token };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

// Process a single query
async function processQuery(queryText: string, context: string, idToken: string): Promise<any> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/user-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        query: queryText,
        context,
        isAutoStart: true, // Skip credit check on individual queries since we check upfront
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to process query: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing query:', error);
    throw error;
  }
}

// Background processing function
async function processQueriesInBackground(
  jobId: string,
  userId: string,
  brandId: string,
  brandData: any,
  queries: any[],
  idToken: string
) {
  try {
    const jobRef = firestore.collection('processing_jobs').doc(jobId);
    
    // Update job status to processing
    await jobRef.update({
      status: 'processing',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      totalQueries: queries.length,
      processedQueries: 0
    });

    const allResults: any[] = [];
    const processingSessionId = `bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const processingSessionTimestamp = new Date().toISOString();
    let processedCount = 0;

    for (const query of queries) {
      try {
        // Update progress
        await jobRef.update({
          processedQueries: processedCount + 1,
          currentQuery: query.query,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        // Process query
        const queryData = await processQuery(
          query.query,
          `This query is related to ${brandData.companyName} in the ${query.category} category. Topic: ${query.keyword}.`,
          idToken
        );

        // Helper function to remove undefined values
        const removeUndefined = (obj: any): any => {
          if (obj === null || obj === undefined) {
            return null;
          }
          if (Array.isArray(obj)) {
            return obj.map(item => removeUndefined(item));
          }
          if (typeof obj === 'object') {
            const cleaned: any = {};
            for (const [key, value] of Object.entries(obj)) {
              if (value !== undefined) {
                cleaned[key] = removeUndefined(value);
              }
            }
            return cleaned;
          }
          return obj;
        };

        // Format the result
        const queryResult: any = {
          date: new Date().toISOString(),
          processingSessionId,
          processingSessionTimestamp,
          query: query.query,
          keyword: query.keyword,
          category: query.category,
          results: {}
        };

        // Process the results
        if (queryData.success && queryData.results && Array.isArray(queryData.results)) {
          queryData.results.forEach((result: any) => {
            if (result.providerId === 'azure-openai-search') {
              const chatgptData: any = {
                response: result.response || '',
                timestamp: result.timestamp || new Date().toISOString()
              };
              if (result.error !== undefined) chatgptData.error = result.error;
              if (result.responseTime !== undefined) chatgptData.responseTime = result.responseTime;
              if (result.tokenCount !== undefined) chatgptData.tokenCount = result.tokenCount;
              if (result.webSearchUsed !== undefined) chatgptData.webSearchUsed = result.webSearchUsed;
              if (result.citations !== undefined) chatgptData.citations = result.citations;
              
              queryResult.results.chatgpt = removeUndefined(chatgptData);
            } else if (result.providerId === 'google-ai') {
              const geminiData: any = {
                response: result.response || '',
                timestamp: result.timestamp || new Date().toISOString()
              };
              if (result.error !== undefined) geminiData.error = result.error;
              if (result.responseTime !== undefined) geminiData.responseTime = result.responseTime;
              if (result.tokenCount !== undefined) geminiData.tokenCount = result.tokenCount;
              
              queryResult.results.gemini = removeUndefined(geminiData);
            } else if (result.providerId === 'perplexity') {
              const perplexityData: any = {
                response: result.response || '',
                timestamp: result.timestamp || new Date().toISOString()
              };
              if (result.error !== undefined) perplexityData.error = result.error;
              if (result.responseTime !== undefined) perplexityData.responseTime = result.responseTime;
              if (result.citations !== undefined) perplexityData.citations = result.citations;
              if (result.realTimeData !== undefined) perplexityData.realTimeData = result.realTimeData;
              
              queryResult.results.perplexity = removeUndefined(perplexityData);
            }
          });
        }
        
        // Clean the entire query result before adding to array
        const cleanedResult = removeUndefined(queryResult);

        allResults.push(cleanedResult);
        processedCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing query "${query.query}":`, error);
        // Continue with other queries even if one fails
      }
    }

    // Save results to Firestore using server-side function
    const updateResult = await updateBrandWithQueryResultsServer(brandId, allResults);
    if (!updateResult.success) {
      throw new Error(`Failed to update brand: ${updateResult.error?.message || 'Unknown error'}`);
    }
    const saveResult = await saveDetailedQueryResultsServer(brandId, userId, brandData.companyName, allResults);
    if (!saveResult.success) {
      console.error('Failed to save detailed query results:', saveResult.error);
      // Don't throw - this is not critical for the main flow
    }

    // Calculate and save analytics
    const analytics = calculateCumulativeAnalytics(
      userId,
      brandId,
      brandData.companyName,
      brandData.domain,
      processingSessionId,
      processingSessionTimestamp,
      allResults
    );
    await saveBrandAnalytics(analytics);

    // Calculate competitor analytics if needed
    if (brandData.competitors && brandData.competitors.length > 0) {
      // Convert competitors array to Competitor format
      const competitors = brandData.competitors.map((comp: string) => ({
        name: comp,
        domain: undefined,
        aliases: undefined
      }));
      
      const competitorAnalytics = calculateCumulativeCompetitorAnalytics(
        userId,
        brandId,
        brandData.companyName,
        brandData.domain,
        processingSessionId,
        processingSessionTimestamp,
        competitors,
        allResults
      );
      await saveCompetitorAnalytics(competitorAnalytics);
    }

    // Mark job as completed
    await jobRef.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      processedQueries: processedCount,
      totalResults: allResults.length
    });

    console.log(`✅ Background processing completed for job ${jobId}: ${processedCount} queries processed`);
  } catch (error) {
    console.error(`❌ Error in background processing for job ${jobId}:`, error);
    const jobRef = firestore.collection('processing_jobs').doc(jobId);
    await jobRef.update({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      failedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

// POST /api/process-queries-background - Start background processing
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    const { uid: userId, profile, token: idToken } = authResult;

    // Parse request body
    const body = await request.json();
    const { brandId, brandData, queries } = body;

    if (!brandId || !brandData || !queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: 'brandId, brandData, and queries array are required' },
        { status: 400 }
      );
    }

    // Check credits
    const requiredCredits = queries.length * 10;
    if (profile.credits < requiredCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits,
          availableCredits: profile.credits
        },
        { status: 400 }
      );
    }

    // Deduct credits upfront
    const { result: creditsDeducted, error: creditsError } = await deductCreditsServer(userId, requiredCredits);
    if (!creditsDeducted || creditsError) {
      return NextResponse.json(
        { error: 'Failed to deduct credits', details: creditsError },
        { status: 500 }
      );
    }

    // Create processing job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const jobRef = firestore.collection('processing_jobs').doc(jobId);
    
    await jobRef.set({
      userId,
      brandId,
      status: 'pending',
      totalQueries: queries.length,
      processedQueries: 0,
      creditsUsed: requiredCredits,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    // Start background processing (fire and forget)
    processQueriesInBackground(jobId, userId, brandId, brandData, queries, idToken).catch(error => {
      console.error('Background processing error:', error);
    });

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Processing started in background',
      creditsUsed: requiredCredits
    });

  } catch (error) {
    console.error('Error starting background processing:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

