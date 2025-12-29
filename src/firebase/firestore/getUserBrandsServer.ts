import { firestore } from '@/firebase/firebase-admin';
import * as admin from 'firebase-admin';
import { QueryProcessingResult } from './getUserBrands';

// Helper function to recursively remove undefined values from objects
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item));
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

// Server-side function to update brand with query results using Admin SDK
export async function updateBrandWithQueryResultsServer(
  brandId: string,
  queryResults: QueryProcessingResult[]
): Promise<{ success: boolean; error?: any }> {
  try {
    const brandRef = firestore.collection('v8userbrands').doc(brandId);
    
    // Get existing brand data
    const brandDoc = await brandRef.get();
    
    let existingResults: QueryProcessingResult[] = [];
    if (brandDoc.exists) {
      const brandData = brandDoc.data();
      existingResults = brandData?.queryProcessingResults || [];
    }

    // Check if we're updating an existing session or creating a new one
    const currentSessionId = queryResults[0]?.processingSessionId;
    
    if (currentSessionId) {
      // Remove any existing results from the same processing session (for incremental updates)
      existingResults = existingResults.filter(
        result => result.processingSessionId !== currentSessionId
      );
    }
    
    // Append the new query results
    const allResults = [...existingResults, ...queryResults];
    
    // Limit the number of stored results to prevent document size issues
    const MAX_STORED_RESULTS = 50;
    const limitedResults = allResults
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, MAX_STORED_RESULTS);
    
    // Remove all undefined values before saving
    const cleanedResults = removeUndefinedValues(limitedResults);
    
    // Update the brand document with ignoreUndefinedProperties enabled
    await brandRef.set(
      {
        queryProcessingResults: cleanedResults,
        lastProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating brand with query results:', error);
    return { success: false, error };
  }
}

