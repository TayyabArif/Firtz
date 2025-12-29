'use client'
import React, { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useBrandContext } from '@/context/BrandContext';
import { useToast } from '@/context/ToastContext';
import { RefreshCw, Zap, AlertCircle, CheckCircle, RotateCcw, StopCircle, CreditCard } from 'lucide-react';
import { getFirebaseIdTokenWithRetry } from '@/utils/getFirebaseToken';
import { useProcessingJob } from '@/hooks/useProcessingJob';

interface ProcessQueriesButtonProps {
  brandId?: string;
  onComplete?: (result: any) => void;
  onProgress?: (results: any[]) => void; // New callback for real-time updates
  onStart?: () => void; // New callback for when processing starts
  onQueryStart?: (query: string) => void; // New callback for when individual query processing starts
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  autoStart?: boolean; // NEW PROP
}

export default function ProcessQueriesButton({ 
  brandId, 
  onComplete,
  onProgress,
  onStart,
  onQueryStart,
  className = '',
  variant = 'primary',
  size = 'md',
  autoStart = false // NEW PROP
}: ProcessQueriesButtonProps): React.ReactElement {
  const { user, userProfile, refreshUserProfile } = useAuthContext();
  const { selectedBrand, brands, refetchBrands } = useBrandContext();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error' | 'cancelled'>('idle');
  const [message, setMessage] = useState('');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  // Get target brand ID for localStorage key
  const targetBrandId = brandId || selectedBrand?.id;
  
  // Restore job ID from localStorage on mount (simple approach)
  useEffect(() => {
    if (!targetBrandId) return;
    
    const storedJobId = localStorage.getItem(`processing_job_${targetBrandId}`);
    if (storedJobId) {
      setCurrentJobId(storedJobId);
      setProcessing(true);
      setStatus('processing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBrandId]); // Only run when targetBrandId changes (component mount or brand change)
  
  // Use processing job hook for background jobs (this will poll and update status)
  const { job, isComplete, isFailed, isProcessing: jobProcessing } = useProcessingJob(currentJobId);
  
  // Add ref to track if completion toasts have been shown for current processing session
  const completionToastsShownRef = useRef(false);
  
  // Store job ID in localStorage when it changes
  useEffect(() => {
    if (targetBrandId) {
      if (currentJobId) {
        localStorage.setItem(`processing_job_${targetBrandId}`, currentJobId);
      } else {
        localStorage.removeItem(`processing_job_${targetBrandId}`);
      }
    }
  }, [currentJobId, targetBrandId]);

  // Auto-trigger processing if autoStart becomes true
  const [autoStarted, setAutoStarted] = useState(false);
  useEffect(() => {
    if (autoStart && !autoStarted && !processing) {
      setAutoStarted(true);
      handleProcessQueries();
    } else if (!autoStart && autoStarted) {
      setAutoStarted(false);
    }
  }, [autoStart, autoStarted, processing]);

  // Monitor job status
  useEffect(() => {
    if (!job) return;

    if (job.status === 'processing' || job.status === 'pending') {
      setProcessing(true);
      setStatus('processing');
      setMessage(`Processing ${job.processedQueries} of ${job.totalQueries} queries in background...`);
    } else if (job.status === 'completed') {
      setProcessing(false);
      setStatus('success');
      setMessage(`Successfully processed ${job.processedQueries} queries! (${job.creditsUsed} credits used)`);
      
      // Clear job ID and localStorage immediately for completed jobs
      if (targetBrandId) {
        localStorage.removeItem(`processing_job_${targetBrandId}`);
      }
      setCurrentJobId(null);
      
      if (!completionToastsShownRef.current) {
        completionToastsShownRef.current = true;
        showSuccess('🎉 Queries Processed!', `Successfully processed ${job.processedQueries} queries in the background.`);
        
        // Refresh brands and user profile only once when job completes
        refetchBrands();
        refreshUserProfile();
        
        if (onComplete) {
          onComplete({
            success: true,
            cancelled: false,
            queryResults: [],
            summary: {
              totalQueries: job.totalQueries,
              processedQueries: job.processedQueries,
              totalErrors: 0,
              creditsUsed: job.creditsUsed
            }
          });
        }
      }
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        completionToastsShownRef.current = false;
      }, 3000);
    } else if (job.status === 'failed') {
      setProcessing(false);
      setStatus('error');
      setMessage(`Processing failed: ${job.error || 'Unknown error'}`);
      showError('Processing Failed', job.error || 'An error occurred while processing queries.');
      if (targetBrandId) {
        localStorage.removeItem(`processing_job_${targetBrandId}`);
      }
      setCurrentJobId(null);
    }
  }, [job, showSuccess, showError, refetchBrands, refreshUserProfile, onComplete, targetBrandId]);

  const handleProcessQueries = async () => {
    if (!user?.uid) {
      setStatus('error');
      setMessage('Please sign in to process queries');
      return;
    }

    // Check user credits (10 credits per query) - Skip if autoStart is true
    const targetBrand = brands.find(b => b.id === targetBrandId);
    
    if (!targetBrand) {
      setStatus('error');
      setMessage('No brand selected');
      return;
    }

    const brandName = targetBrand.companyName;
    const queries = targetBrand.queries || [];

    if (queries.length === 0) {
      setStatus('error');
      setMessage('No queries to process');
      return;
    }

    // Only check credits if NOT auto-starting
    if (!autoStart) {
      // Check if user has enough credits (10 per query)
      const requiredCredits = queries.length * 10;
      const availableCredits = userProfile?.credits || 0;
      
      if (availableCredits < requiredCredits) {
        setStatus('error');
        setMessage(`Insufficient credits. Need ${requiredCredits}, have ${availableCredits}`);
        
        // Show user-friendly notification
        showError(
          'Insufficient Credits',
          `You need ${requiredCredits} credits to process ${queries.length} queries, but you only have ${availableCredits} credits available.`,
        );
        
        return;
      }
    }

    completionToastsShownRef.current = false; // Reset completion toasts tracking

    // Notify parent that processing has started
    if (onStart) {
      onStart();
    }

    try {
      // Get Firebase ID token for authentication with retry logic
      const idToken = await getFirebaseIdTokenWithRetry(3, 1000);
      
      if (!idToken) {
        throw new Error('Failed to get authentication token. Please sign in again.');
      }

      // Call background processing API
      const response = await fetch(`${window.location.origin}/api/process-queries-background`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          brandId: targetBrandId,
          brandData: {
            companyName: targetBrand.companyName,
            domain: targetBrand.domain,
            userId: targetBrand.userId,
            competitors: targetBrand.competitors || []
          },
          queries: queries.map(q => ({
            query: q.query,
            keyword: q.keyword,
            category: q.category
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start background processing');
      }

      const data = await response.json();
      
      // Store job ID to track progress
      setCurrentJobId(data.jobId);
      setProcessing(true);
      setStatus('processing');
      setMessage(`Started processing ${queries.length} queries in background...`);
      
      // Refresh user profile to show updated credits
      await refreshUserProfile();
      
      showInfo(
        '✅ Processing Started',
        `Your queries are now processing in the background. You can safely close this page and come back later.`
      );

    } catch (error) {
      setProcessing(false);
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to start processing';
      setMessage(errorMessage);
      console.error('Process queries error:', error);
      
      showError(
        '❌ Processing Failed',
        errorMessage
      );
    }
  };

  // Check if queries have been processed
  const getProcessedQueriesCount = () => {
    const targetBrand = brands.find(b => b.id === targetBrandId);
    return targetBrand?.queryProcessingResults?.length || 0;
  };

  const hasProcessedQueries = getProcessedQueriesCount() > 0;

  // Calculate required credits
  const getRequiredCredits = () => {
    const targetBrand = brands.find(b => b.id === targetBrandId);
    const queryCount = targetBrand?.queries?.length || 0;
    return queryCount * 10;
  };

  const requiredCredits = getRequiredCredits();
  const availableCredits = userProfile?.credits || 0;
  const hasEnoughCredits = availableCredits >= requiredCredits;

  // Button styling based on variant and size
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const getVariantStyles = () => {
    if (!hasEnoughCredits && requiredCredits > 0) {
      // Insufficient credits styling
      return {
        primary: 'bg-red-600 text-white cursor-not-allowed opacity-70',
        secondary: 'bg-white text-red-600 border border-red-600 cursor-not-allowed opacity-70',
        ghost: 'text-red-600 cursor-not-allowed opacity-70'
      };
    }
    
    if (hasProcessedQueries && status === 'idle') {
      // Different styling for reprocess button
      return {
        primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-600',
        secondary: 'bg-white text-orange-600 border border-orange-600 hover:bg-orange-50 focus:ring-orange-600',
        ghost: 'text-orange-600 hover:bg-orange-100 focus:ring-orange-600'
      };
    }
    
    return {
      primary: 'bg-[#000C60] text-white hover:bg-[#000C60]/90 focus:ring-[#000C60]',
      secondary: 'bg-white text-[#000C60] border border-[#000C60] hover:bg-gray-50 focus:ring-[#000C60]',
      ghost: 'text-[#000C60] hover:bg-gray-100 focus:ring-[#000C60]'
    };
  };

  const variantStyles = getVariantStyles();

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm space-x-1.5',
    md: 'px-4 py-2 text-base space-x-2',
    lg: 'px-6 py-3 text-lg space-x-2.5'
  };

  const statusStyles = {
    idle: '',
    processing: 'opacity-80 cursor-not-allowed',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    error: 'bg-red-600 hover:bg-red-700 text-white',
  };

  // Icon based on status and processed state
  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <RefreshCw className={`${size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} animate-spin`} />;
      case 'success':
        return <CheckCircle className={`${size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />;
      case 'error':
        return <AlertCircle className={`${size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />;
      case 'cancelled':
        return <StopCircle className={`${size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />;
      default:
        if (!hasEnoughCredits && requiredCredits > 0) {
          return <AlertCircle className={`${size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />;
        }
        if (hasProcessedQueries) {
          return <RotateCcw className={`${size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />;
        }
        return <Zap className={`${size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />;
    }
  };

  // Button text based on status and processed state
  const getButtonText = () => {
    if (message && status !== 'idle') {
      return message;
    }
    
    if (processing) {
      return 'Processing...';
    }
    
    if (!hasEnoughCredits && requiredCredits > 0) {
      return `Need ${requiredCredits} Credits (Have ${availableCredits})`;
    }
    
    if (hasProcessedQueries) {
      const count = getProcessedQueriesCount();
      return `Reprocess Queries (${requiredCredits} Credits)`;
    }
    
    return `Process Queries (${requiredCredits} Credits)`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center space-x-2">
        <button
          onClick={handleProcessQueries}
          disabled={processing || !user || !hasEnoughCredits}
          className={`
            ${baseStyles} 
            ${variantStyles[variant]} 
            ${sizeStyles[size]} 
            ${statusStyles[status]}
            ${className}
          `}
          title={
            !user ? 'Please sign in to process queries' : 
            !hasEnoughCredits ? `Need ${requiredCredits} credits, you have ${availableCredits}` :
            ''
          }
        >
          {getIcon()}
          <span>{getButtonText()}</span>
        </button>
        
      </div>
      
      {processing && job && (
        <p className="text-xs text-blue-600 mt-1 font-medium text-center">
          ✓ Processing in background... ({job.processedQueries}/{job.totalQueries} queries completed). You can safely close this page.
        </p>
      )}
      
      {/* Credit information */}
      {!processing && requiredCredits > 0 && (
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {hasEnoughCredits ? 
            `Ready: ${availableCredits} credits available` : 
            `Need ${requiredCredits - availableCredits} more credits`
          }
        </p>
      )}
    </div>
  );
} 