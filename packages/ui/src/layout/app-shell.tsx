'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

interface AppShellProps {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ sidebar, topbar, children, className }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      {sidebar}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        {topbar}

        {/* Page content */}
        <main className={cn('flex-1 overflow-y-auto p-6', className)}>{children}</main>
      </div>
    </div>
  );
}
