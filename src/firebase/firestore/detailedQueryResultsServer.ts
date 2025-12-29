import { firestore } from '@/firebase/firebase-admin';
import * as admin from 'firebase-admin';
import { DetailedQueryResult } from './detailedQueryResults';

// Helper function to recursively remove undefined values from objects
function filterUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => filterUndefinedValues(item));
  }
  
  if (typeof obj === 'object') {
    const filtered: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        filtered[key] = filterUndefinedValues(value);
      }
    }
    return filtered;
  }
  
  return obj;
}

// Server-side function to save detailed query results using Admin SDK
export async function saveDetailedQueryResultsServer(
  brandId: string,
  userId: string,
  brandName: string,
  queryResults: any[]
): Promise<{ success: boolean; error?: any }> {
  try {
    const batch = firestore.batch();
    
    for (const result of queryResults) {
      const docRef = firestore.collection('v8detailed_query_results').doc();
      
      const detailedResult: DetailedQueryResult = {
        userId,
        brandId,
        brandName,
        processingSessionId: result.processingSessionId,
        processingSessionTimestamp: result.processingSessionTimestamp,
        query: result.query,
        keyword: result.keyword,
        category: result.category,
        date: result.date,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Add ChatGPT result if available
      if (result.results?.chatgpt) {
        const chatgptData: any = {
          response: result.results.chatgpt.response || '',
          timestamp: result.results.chatgpt.timestamp || new Date().toISOString()
        };
        if (result.results.chatgpt.error !== undefined) chatgptData.error = result.results.chatgpt.error;
        if (result.results.chatgpt.responseTime !== undefined) chatgptData.responseTime = result.results.chatgpt.responseTime;
        if (result.results.chatgpt.webSearchUsed !== undefined) chatgptData.webSearchUsed = result.results.chatgpt.webSearchUsed;
        if (result.results.chatgpt.citations !== undefined) chatgptData.citations = result.results.chatgpt.citations?.length || 0;
        
        detailedResult.chatgptResult = filterUndefinedValues(chatgptData);
      }

      // Add Google AI result if available
      if (result.results?.googleAI || result.results?.gemini) {
        const googleData = result.results.googleAI || result.results.gemini;
        const googleResultData: any = {
          response: googleData.response || googleData.aiOverview || '',
          timestamp: googleData.timestamp || new Date().toISOString()
        };
        if (googleData.error !== undefined) googleResultData.error = googleData.error;
        if (googleData.responseTime !== undefined) googleResultData.responseTime = googleData.responseTime;
        if (googleData.totalItems !== undefined) googleResultData.totalItems = googleData.totalItems;
        if (googleData.organicResults !== undefined) googleResultData.organicResults = googleData.organicResults;
        if (googleData.peopleAlsoAsk !== undefined) googleResultData.peopleAlsoAsk = googleData.peopleAlsoAsk;
        if (googleData.location !== undefined) googleResultData.location = googleData.location;
        if (googleData.aiOverview !== undefined) googleResultData.aiOverview = googleData.aiOverview;
        if (googleData.aiOverviewReferences !== undefined) googleResultData.aiOverviewReferences = googleData.aiOverviewReferences;
        if (googleData.hasAIOverview !== undefined) googleResultData.hasAIOverview = googleData.hasAIOverview;
        if (googleData.serpFeatures !== undefined) googleResultData.serpFeatures = googleData.serpFeatures;
        if (googleData.relatedSearches !== undefined) googleResultData.relatedSearches = googleData.relatedSearches;
        if (googleData.videoResults !== undefined) googleResultData.videoResults = googleData.videoResults;
        if (googleData.rawDataForSEOResponse !== undefined) googleResultData.rawDataForSEOResponse = googleData.rawDataForSEOResponse;
        
        detailedResult.googleAIResult = filterUndefinedValues(googleResultData);
      }

      // Add Perplexity result if available
      if (result.results?.perplexity) {
        const perplexityData: any = {
          response: result.results.perplexity.response || '',
          timestamp: result.results.perplexity.timestamp || new Date().toISOString()
        };
        if (result.results.perplexity.error !== undefined) perplexityData.error = result.results.perplexity.error;
        if (result.results.perplexity.responseTime !== undefined) perplexityData.responseTime = result.results.perplexity.responseTime;
        if (result.results.perplexity.citations !== undefined) perplexityData.citations = result.results.perplexity.citations?.length || 0;
        if (result.results.perplexity.realTimeData !== undefined) perplexityData.realTimeData = result.results.perplexity.realTimeData;
        if (result.results.perplexity.citationsList !== undefined) perplexityData.citationsList = result.results.perplexity.citationsList;
        if (result.results.perplexity.searchResults !== undefined) perplexityData.searchResults = result.results.perplexity.searchResults;
        if (result.results.perplexity.structuredCitations !== undefined) perplexityData.structuredCitations = result.results.perplexity.structuredCitations;
        if (result.results.perplexity.metadata !== undefined) perplexityData.metadata = result.results.perplexity.metadata;
        if (result.results.perplexity.usage !== undefined) perplexityData.usage = result.results.perplexity.usage;
        
        detailedResult.perplexityResult = filterUndefinedValues(perplexityData);
      }

      // Filter out undefined values and set document
      const filteredResult = filterUndefinedValues(detailedResult);
      batch.set(docRef, filteredResult);
    }

    // Commit the batch
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error saving detailed query results:', error);
    return { success: false, error };
  }
}

