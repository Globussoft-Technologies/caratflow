'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell, Sidebar, Topbar } from '@caratflow/ui';
import { useUiStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, activeBranchId, setActiveBranch, theme, toggleTheme } =
    useUiStore();
  const { logout, user } = useAuthStore();

  // Mock branches for now -- will be fetched from API
  const branches = [
    { id: 'branch-1', name: 'Zaveri Bazaar - Main' },
    { id: 'branch-2', name: 'Andheri Branch' },
    { id: 'branch-3', name: 'Workshop & Vault' },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const renderLink = ({ href, children: linkChildren, className }: { href: string; children: React.ReactNode; className: string }) => (
    <Link href={href} className={className}>
      {linkChildren}
    </Link>
  );

  return (
    <AppShell
      sidebar={
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          currentPath={pathname}
          renderLink={renderLink}
        />
      }
      topbar={
        <Topbar
          branches={branches}
          activeBranchId={activeBranchId ?? branches[0]?.id}
          onBranchChange={setActiveBranch}
          userName={user?.firstName ?? 'Admin'}
          userEmail={user?.email ?? 'admin@sharmajewellers.com'}
          onSearch={() => {
            /* Will open command palette */
          }}
          onLogout={handleLogout}
          theme={theme}
          onThemeToggle={toggleTheme}
          notificationCount={3}
        />
      }
    >
      {children}
    </AppShell>
  );
}
