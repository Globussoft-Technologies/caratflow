'use client';

import * as React from 'react';
import { Bell, ChevronDown, LogOut, Moon, Search, Settings, Sun, User } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';

interface Branch {
  id: string;
  name: string;
}

interface TopbarProps {
  branches?: Branch[];
  activeBranchId?: string;
  onBranchChange?: (branchId: string) => void;
  userName?: string;
  userEmail?: string;
  onSearch?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
  notificationCount?: number;
}

export function Topbar({
  branches = [],
  activeBranchId,
  onBranchChange,
  userName = 'User',
  userEmail = '',
  onSearch,
  onNotifications,
  onSettings,
  onLogout,
  theme = 'light',
  onThemeToggle,
  notificationCount = 0,
}: TopbarProps) {
  const activeBranch = branches.find((b) => b.id === activeBranchId);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      {/* Left side: Branch selector */}
      <div className="flex items-center gap-4">
        {branches.length > 0 && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent">
                <span>{activeBranch?.name ?? 'Select Branch'}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[200px] rounded-md border bg-popover p-1 shadow-md"
                sideOffset={5}
              >
                {branches.map((branch) => (
                  <DropdownMenu.Item
                    key={branch.id}
                    onClick={() => onBranchChange?.(branch.id)}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent',
                      branch.id === activeBranchId && 'bg-accent font-medium',
                    )}
                  >
                    {branch.name}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>

      {/* Right side: Search, notifications, theme, profile */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={onSearch}
          className="inline-flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:bg-accent"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden rounded border bg-muted px-1 font-mono text-[10px] sm:inline">
            Ctrl+K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          onClick={onNotifications}
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium sm:inline">{userName}</span>
              <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[200px] rounded-md border bg-popover p-1 shadow-md"
              sideOffset={5}
              align="end"
            >
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{userName}</p>
                {userEmail && <p className="text-xs text-muted-foreground">{userEmail}</p>}
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onClick={onSettings}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
              >
                <Settings className="h-3.5 w-3.5" /> Settings
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onClick={onLogout}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
