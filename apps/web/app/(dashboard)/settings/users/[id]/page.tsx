'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { Save, ShieldCheck, Key } from 'lucide-react';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;

  // TODO: Fetch from API
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    roleId: '',
    isActive: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const roles: { id: string; name: string }[] = [];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // TODO: Call trpc.platform.users.updateProfile.mutate
      console.log('Saving profile:', userId, profile);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignRole = async (roleId: string) => {
    // TODO: Call trpc.platform.roles.assignToUser.mutate
    console.log('Assigning role:', roleId, 'to user:', userId);
    setProfile({ ...profile, roleId });
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // TODO: Call trpc.platform.users.changePassword.mutate
    console.log('Changing password for:', userId);
    setShowPasswordForm(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Profile"
        description="View and manage user account details."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Users', href: '/settings/users' },
          { label: `${profile.firstName || 'User'} ${profile.lastName || ''}`.trim() },
        ]}
      />

      {/* Profile Section */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Profile Information</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="user-first-name">First Name</label>
            <input id="user-first-name" type="text" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="user-last-name">Last Name</label>
            <input id="user-last-name" type="text" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium" htmlFor="user-email">Email</label>
            <input id="user-email" type="email" value={profile.email} disabled className="mt-1 w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed after account creation.</p>
          </div>
        </div>
        <div className="flex justify-end border-t p-4">
          <button onClick={handleSaveProfile} disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Role Assignment */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Role Assignment</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            The assigned role determines what this user can access and modify.
          </p>
        </div>
        <div className="p-6">
          <select
            value={profile.roleId}
            onChange={(e) => handleAssignRole(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm md:w-1/2"
          >
            <option value="">No role assigned</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Password Change */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Password</h2>
          </div>
        </div>
        <div className="p-6">
          {!showPasswordForm ? (
            <button onClick={() => setShowPasswordForm(true)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Change Password
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium" htmlFor="current-pw">Current Password</label>
                <input id="current-pw" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm md:w-1/2" />
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="new-pw">New Password</label>
                <input id="new-pw" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm md:w-1/2" />
                <p className="mt-1 text-xs text-muted-foreground">Min 8 characters, must include uppercase, lowercase, number, and special character.</p>
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="confirm-pw">Confirm New Password</label>
                <input id="confirm-pw" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm md:w-1/2" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPasswordForm(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleChangePassword} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Update Password</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Status */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Account Status</h2>
        </div>
        <div className="flex items-center justify-between p-6">
          <div>
            <p className="font-medium">
              Status: <span className={profile.isActive ? 'text-green-600' : 'text-red-600'}>{profile.isActive ? 'Active' : 'Inactive'}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {profile.isActive ? 'This user can log in and access the system.' : 'This user is deactivated and cannot log in.'}
            </p>
          </div>
          <button
            onClick={() => {
              // TODO: Call activate/deactivate
              setProfile({ ...profile, isActive: !profile.isActive });
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium ${profile.isActive ? 'border border-red-300 text-red-700 hover:bg-red-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            {profile.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}
