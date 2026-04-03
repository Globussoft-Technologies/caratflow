'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import { Users, UserPlus, Search, MoreVertical, Check, X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: string; name: string } | null;
}

export default function UsersPage() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
  });

  // TODO: Fetch from API
  const users: User[] = [];
  const roles: { id: string; name: string }[] = [];

  const handleInvite = async () => {
    // TODO: Call trpc.platform.users.invite.mutate(inviteData)
    console.log('Inviting user:', inviteData);
    setShowInviteForm(false);
    setInviteData({ email: '', firstName: '', lastName: '', roleId: '' });
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    // TODO: Call trpc.platform.users.activate or deactivate
    console.log(isActive ? 'Deactivating' : 'Activating', userId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage user accounts and access."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Users' },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border py-2 pl-9 pr-3 text-sm sm:w-72"
          />
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Invite New User</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" htmlFor="invite-first-name">First Name</label>
              <input id="invite-first-name" type="text" value={inviteData.firstName} onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="invite-last-name">Last Name</label>
              <input id="invite-last-name" type="text" value={inviteData.lastName} onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="invite-email">Email</label>
              <input id="invite-email" type="email" value={inviteData.email} onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="invite-role">Role</label>
              <select id="invite-role" value={inviteData.roleId} onChange={(e) => setInviteData({ ...inviteData, roleId: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Select a role...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowInviteForm(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleInvite} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Send Invite</button>
          </div>
        </div>
      )}

      {/* User Table */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No users yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Invite your first team member to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Login</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/settings/users/${user.id}`} className="font-medium hover:text-primary">
                      {user.firstName} {user.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {user.role?.name ?? 'No role'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(user.id, user.isActive)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
