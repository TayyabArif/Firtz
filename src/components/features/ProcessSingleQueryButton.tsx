'use client'
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useBrandContext } from '@/context/BrandContext';
import { useToast } from '@/context/ToastContext';
import { Zap, RefreshCw } from 'lucide-react';
import { getFirebaseIdTokenWithRetry } from '@/utils/getFirebaseToken';
import { useProcessingJob } from '@/hooks/useProcessingJob';

interface ProcessSingleQueryButtonProps {
  query: {
    query: string;
    keyword: string;
    category: string;
  };
  brandId: string;
  brandData: {
    companyName: string;
    domain: string;
    userId: string;
    competitors?: string[];
  };
  onComplete?: () => void;
  onJobStarted?: (jobId: string) => void; // Callback to notify parent about job start
  className?: string;
}

export default function ProcessSingleQueryButton({
  query,
  brandId,
  brandData,
  onComplete,
  onJobStarted,
  className = ''
}: ProcessSingleQueryButtonProps): React.ReactElement {
  const { user, userProfile, refreshUserProfile } = useAuthContext();
  const { refetchBrands } = useBrandContext();
  const { showSuccess, showError } = useToast();
  const [processing, setProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  // Check for active job for this specific query
  useEffect(() => {
    if (!brandId) return;
    
    const storedJobId = localStorage.getItem(`processing_job_${brandId}_${query.query}`);
    if (storedJobId) {
      setCurrentJobId(storedJobId);
      setProcessing(true);
    }
  }, [brandId, query.query]);
  
  // Use processing job hook to track job status
  const { job } = useProcessingJob(currentJobId);
  
  // Monitor job status
  useEffect(() => {
    if (!job) return;
    
    if (job.status === 'processing' || job.status === 'pending') {
      setProcessing(true);
    } else if (job.status === 'completed') {
      setProcessing(false);
      setCurrentJobId(null);
      // Remove both specific query job and main brand job (if it's the same)
      localStorage.removeItem(`processing_job_${brandId}_${query.query}`);
      const mainJobId = localStorage.getItem(`processing_job_${brandId}`);
      if (mainJobId === job.id) {
        localStorage.removeItem(`processing_job_${brandId}`);
      }
      // Trigger storage event to notify parent
      window.dispatchEvent(new StorageEvent('storage', {
        key: `processing_job_${brandId}_${query.query}`,
        newValue: null,
        oldValue: job.id
      }));
      refetchBrands();
      refreshUserProfile();
      if (onComplete) {
        onComplete();
      }
    } else if (job.status === 'failed') {
      setProcessing(false);
      setCurrentJobId(null);
      localStorage.removeItem(`processing_job_${brandId}_${query.query}`);
      const mainJobId = localStorage.getItem(`processing_job_${brandId}`);
      if (mainJobId === job.id) {
        localStorage.removeItem(`processing_job_${brandId}`);
      }
      // Trigger storage event to notify parent
      window.dispatchEvent(new StorageEvent('storage', {
        key: `processing_job_${brandId}_${query.query}`,
        newValue: null,
        oldValue: job.id
      }));
    }
  }, [job, brandId, query.query, refetchBrands, refreshUserProfile, onComplete]);

  const handleProcessQuery = async () => {
    if (!user?.uid) {
      showError('Authentication Required', 'Please sign in to process queries');
      return;
    }

    // Check credits (10 credits per query)
    const requiredCredits = 10;
    const availableCredits = userProfile?.credits || 0;
    
    if (availableCredits < requiredCredits) {
      showError(
        'Insufficient Credits',
        `You need ${requiredCredits} credits to process this query, but you only have ${availableCredits} credits available.`
      );
      return;
    }

    setProcessing(true);

    try {
      // Get Firebase ID token
      const idToken = await getFirebaseIdTokenWithRetry(3, 1000);
      
      if (!idToken) {
        throw new Error('Failed to get authentication token. Please sign in again.');
      }

      // Call background processing API with single query
      const response = await fetch(`${window.location.origin}/api/process-queries-background`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          brandId,
          brandData: {
            companyName: brandData.companyName,
            domain: brandData.domain,
            userId: brandData.userId,
            competitors: brandData.competitors || []
          },
          queries: [{
            query: query.query,
            keyword: query.keyword,
            category: query.category
          }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start processing');
      }

      const data = await response.json();
      const jobId = data.jobId;
      
      // Store job ID for this specific query
      if (jobId) {
        setCurrentJobId(jobId);
        setProcessing(true); // Keep button in processing state
        localStorage.setItem(`processing_job_${brandId}_${query.query}`, jobId);
        // Also store in the main brand job key for compatibility
        localStorage.setItem(`processing_job_${brandId}`, jobId);
        
        // Trigger storage event to notify parent immediately
        window.dispatchEvent(new StorageEvent('storage', {
          key: `processing_job_${brandId}_${query.query}`,
          newValue: jobId,
          oldValue: null
        }));
        
        // Notify parent that job started
        if (onJobStarted) {
          onJobStarted(jobId);
        }
      }
      
      showSuccess(
        'Processing Started',
        `Query is being processed in the background. You can close this page and return later to see the results.`
      );

      // Don't refresh immediately - let the job tracking handle updates
      if (onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error('Error processing query:', error);
      setProcessing(false);
      setCurrentJobId(null);
      showError(
        'Processing Failed',
        error instanceof Error ? error.message : 'An error occurred while processing the query.'
      );
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent row click
        handleProcessQuery();
      }}
      disabled={processing}
      className={`inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
        processing
          ? 'bg-gray-400 text-white cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
      } ${className}`}
      title={processing ? 'Processing...' : 'Process this query (10 credits)'}
    >
      {processing ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <Zap className="h-3 w-3" />
          <span>Process</span>
        </>
      )}
    </button>
  );
}

