'use client'
import React, { useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { Database, Trash2, Download, Upload } from 'lucide-react';
import Card from '@/components/shared/Card';
import { seedAllData } from '@/firebase/firestore/seedData';
import { useToast } from '@/context/ToastContext';

export default function AdminDatabasePage(): React.ReactElement {
  const { user } = useAuthContext();
  const { showSuccess, showError } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    if (!user?.uid) return;
    
    setIsSeeding(true);
    
    try {
      const result = await seedAllData(user.uid);
      if (result.success) {
        showSuccess('Success', 'Sample data seeded successfully!');
      } else {
        showError('Error', 'Failed to seed data');
      }
    } catch (error) {
      showError('Error', 'An error occurred while seeding data');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Database Management</h1>
        <p className="text-muted-foreground">Manage application data and settings</p>
      </div>

      {/* Database Management Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-6 w-6 text-[#000C60]" />
            <h2 className="text-xl font-semibold text-foreground">Seed Sample Data</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Initialize the database with sample data for testing and development.
          </p>
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="flex items-center space-x-2 bg-[#000C60] text-white px-4 py-2 rounded-lg hover:bg-[#000C60]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSeeding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Seeding...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Seed Sample Data</span>
              </>
            )}
          </button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Trash2 className="h-6 w-6 text-red-500" />
            <h2 className="text-xl font-semibold text-foreground">Data Cleanup</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Remove all user data and reset the database to a clean state.
          </p>
          <button
            disabled
            className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All Data</span>
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Feature coming soon
          </p>
        </Card>
      </div>

      {/* Export/Import */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Download className="h-6 w-6 text-[#00B087]" />
            <h2 className="text-xl font-semibold text-foreground">Export Data</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Export all application data for backup or migration purposes.
          </p>
          <button
            disabled
            className="flex items-center space-x-2 bg-[#00B087] text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Feature coming soon
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Upload className="h-6 w-6 text-[#764F94]" />
            <h2 className="text-xl font-semibold text-foreground">Import Data</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Import data from backup files or external sources.
          </p>
          <button
            disabled
            className="flex items-center space-x-2 bg-[#764F94] text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
          >
            <Upload className="h-4 w-4" />
            <span>Import Data</span>
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Feature coming soon
          </p>
        </Card>
      </div>
    </div>
  );
}

