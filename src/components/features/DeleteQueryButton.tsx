'use client'
import React, { useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useBrandContext } from '@/context/BrandContext';
import { useToast } from '@/context/ToastContext';
import { Trash2, X } from 'lucide-react';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import firebase_app from '@/firebase/config';

const db = getFirestore(firebase_app);

interface DeleteQueryButtonProps {
  query: {
    query: string;
    keyword: string;
    category: string;
  };
  brandId: string;
  onComplete?: () => void;
  className?: string;
}

export default function DeleteQueryButton({
  query,
  brandId,
  onComplete,
  className = ''
}: DeleteQueryButtonProps): React.ReactElement {
  const { user } = useAuthContext();
  const { brands, refetchBrands } = useBrandContext();
  const { showSuccess, showError } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!user?.uid) {
      showError('Authentication Required', 'Please sign in to delete queries');
      return;
    }

    setIsDeleting(true);

    try {
      // Get current brand data
      const brand = brands.find(b => b.id === brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }

      // Remove the query from the queries array
      const updatedQueries = (brand.queries || []).filter(
        q => !(q.query === query.query && q.keyword === query.keyword && q.category === query.category)
      );

      // Update Firestore
      const brandRef = doc(db, 'v8userbrands', brandId);
      await updateDoc(brandRef, {
        queries: updatedQueries,
        totalQueries: updatedQueries.length,
        updatedAt: new Date().toISOString()
      });

      showSuccess('Query Deleted', 'The query has been successfully removed.');
      setShowConfirm(false);
      
      // Refresh brands
      await refetchBrands();
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error deleting query:', error);
      showError(
        'Delete Failed',
        error instanceof Error ? error.message : 'Failed to delete the query. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div 
        className={`inline-flex items-center space-x-2 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={isDeleting}
          className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isDeleting ? 'Deleting...' : 'Confirm'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(false);
          }}
          disabled={isDeleting}
          className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent row click
        setShowConfirm(true);
      }}
      className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors ${className}`}
      title="Delete query"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  );
}

