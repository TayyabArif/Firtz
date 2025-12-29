'use client'
import React from "react";
import { Settings } from 'lucide-react';
import Card from '@/components/shared/Card';

export default function AdminSettingsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground">Configure admin panel settings and preferences</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="h-6 w-6 text-[#000C60]" />
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        </div>
        <p className="text-muted-foreground">
          Admin settings and configuration options will be available here.
        </p>
      </Card>
    </div>
  );
}

