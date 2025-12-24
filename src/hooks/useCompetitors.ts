import { useState, useEffect, useCallback } from 'react';
import { useBrandContext } from '@/context/BrandContext';
import { useAuthContext } from '@/context/AuthContext';
import { getLatestCompetitorAnalytics } from '@/firebase/firestore/competitorAnalytics';
import { CompetitorAnalyticsData } from '@/utils/competitor-analytics';

interface CompetitorData {
  id: string;
  name: string;
  domain?: string;
  mentions: number;
  visibility: number;
  queriesAnalyzed: number;
  topProvider: string;
  lastUpdated: string;
}

interface UseCompetitorsReturn {
  competitors: CompetitorData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCompetitors(): UseCompetitorsReturn {
  const { user } = useAuthContext();
  const { selectedBrand, selectedBrandId, loading: brandLoading } = useBrandContext();
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetitors = useCallback(async () => {
    if (!user?.uid || !selectedBrandId || brandLoading || !selectedBrand) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch real competitor analytics from Firestore
      const { result: analyticsData, error: analyticsError } = await getLatestCompetitorAnalytics(selectedBrandId);
      
      if (analyticsError) {
        console.error('Error fetching competitor analytics:', analyticsError);
        throw new Error(analyticsError as string);
      }

      if (!analyticsData) {
        // No competitor analytics data yet - show empty state
        console.log('No competitor analytics data found for brand:', selectedBrandId);
        setCompetitors([]);
        setLoading(false);
        return;
      }

      // Check if competitorStats exists and has data
      if (!analyticsData.competitorStats || Object.keys(analyticsData.competitorStats).length === 0) {
        console.warn('Competitor analytics data exists but competitorStats is empty:', analyticsData);
        setCompetitors([]);
        setLoading(false);
        return;
      }

      // Transform analytics data into competitor display format
      const competitorData: CompetitorData[] = Object.entries(analyticsData.competitorStats)
        .filter(([name, stats]) => stats && typeof stats === 'object' && stats.totalMentions !== undefined)
        .map(([name, stats]: [string, any], index) => ({
          id: (index + 1).toString(),
          name,
          domain: stats.domain || undefined,
          mentions: stats.totalMentions || 0,
          visibility: Math.round(stats.visibilityScore || 0),
          queriesAnalyzed: analyticsData.totalQueriesProcessed || 0,
          topProvider: stats.topProvider || 'none',
          lastUpdated: analyticsData.processingSessionTimestamp || analyticsData.timestamp || new Date().toISOString()
        }))
        .filter(comp => comp.mentions > 0); // Only show competitors with mentions

      if (competitorData.length === 0) {
        console.log('No competitors with mentions found in analytics data');
        setCompetitors([]);
        setLoading(false);
        return;
      }

      console.log('✅ Loaded competitors:', competitorData.length, 'competitors');
      setCompetitors(competitorData);
    } catch (err) {
      console.error('Error fetching competitors:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load competitor analytics: ${errorMessage}. Please process some queries first.`);
      setCompetitors([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, selectedBrandId, brandLoading, selectedBrand]);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  return {
    competitors,
    loading,
    error,
    refetch: fetchCompetitors
  };
} 