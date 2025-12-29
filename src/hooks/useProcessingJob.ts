'use client'
import { useState, useEffect, useCallback } from 'react';
import { getFirebaseIdTokenWithRetry } from '@/utils/getFirebaseToken';

export interface ProcessingJob {
  id: string;
  userId: string;
  brandId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalQueries: number;
  processedQueries: number;
  currentQuery?: string;
  creditsUsed: number;
  error?: string;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  lastUpdated: string | null;
}

export function useProcessingJob(jobId: string | null) {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) {
      setJob(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idToken = await getFirebaseIdTokenWithRetry(3, 1000);
      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }

      const response = await fetch(`/api/processing-jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch job status');
      }

      const data = await response.json();
      setJob(data.job);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job status';
      setError(errorMessage);
      console.error('Error fetching job status:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Auto-poll if job is pending or processing
  useEffect(() => {
    if (!jobId || !job) return;

    if (job.status === 'pending' || job.status === 'processing') {
      const interval = setInterval(() => {
        fetchJobStatus();
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [jobId, job?.status, fetchJobStatus]);

  // Initial fetch
  useEffect(() => {
    if (jobId) {
      fetchJobStatus();
    }
  }, [jobId, fetchJobStatus]);

  return {
    job,
    loading,
    error,
    refetch: fetchJobStatus,
    isComplete: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    isProcessing: job?.status === 'processing' || job?.status === 'pending',
  };
}

