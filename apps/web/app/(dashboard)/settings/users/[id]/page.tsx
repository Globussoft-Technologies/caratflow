'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { Save, ShieldCheck, Key } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string | null;
  isActive: boolean;
  role: { id: string; name: string } | null;
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const userQuery = trpc.platform.users.getById.useQuery({ userId }, { enabled: !!userId });
  const rolesQuery = trpc.platform.roles.list.useQuery();

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    roleId: '',
    isActive: true,
  });
  const [initialProfile, setInitialProfile] = useState(profile);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const u = userQuery.data as UserDetail | undefined;
    if (!u) return;
    const next = {
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      email: u.email ?? '',
      roleId: u.roleId ?? '',
      isActive: u.isActive,
    };
    setProfile(next);
    setInitialProfile(next);
  }, [userQuery.data]);

  const roles = (rolesQuery.data as Array<{ id: string; name: string }> | undefined) ?? [];

  const updateProfileMutation = trpc.platform.users.updateProfile.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Profile updated.' });
      setInitialProfile(profile);
      void userQuery.refetch();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const assignRoleMutation = trpc.platform.roles.assignToUser.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Role updated.' });
      void userQuery.refetch();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const changePasswordMutation = trpc.platform.users.changePassword.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Password changed.' });
      setShowPasswordForm(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const activateMutation = trpc.platform.users.activate.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'User activated.' });
      void userQuery.refetch();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const deactivateMutation = trpc.platform.users.deactivate.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'User deactivated.' });
      void userQuery.refetch();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const isDirty =
    profile.firstName !== initialProfile.firstName ||
    profile.lastName !== initialProfile.lastName;

  const handleSaveProfile = () => {
    if (!isDirty) return;
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setBanner({ type: 'error', message: 'First and last name are required.' });
      return;
    }
    updateProfileMutation.mutate({
      userId,
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
    });
  };

  const handleAssignRole = (roleId: string) => {
    setProfile({ ...profile, roleId });
    if (!roleId) {
      setBanner({ type: 'error', message: 'Select a role to assign.' });
      return;
    }
    assignRoleMutation.mutate({ userId, roleId });
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setBanner({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setBanner({ type: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }
    // NOTE: platform.users.changePassword operates on the current authed user (ctx.userId),
    // not an arbitrary user ID. The backend does not expose an admin reset-password
    // procedure today, so this only works if the admin is editing their own profile.
    // TODO: needs platform.users.adminResetPassword mutation for admins to reset another user's password.
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleToggleActive = () => {
    if (profile.isActive) {
      deactivateMutation.mutate({ userId });
    } else {
      activateMutation.mutate({ userId });
    }
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

      {banner && (
        <div
          className={`rounded-md border p-3 text-sm ${
            banner.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {banner.message}
        </div>
      )}

      {userQuery.isLoading && (
        <div className="rounded-lg border bg-card py-8 text-center text-sm text-muted-foreground">Loading user...</div>
      )}

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
          <button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending || !isDirty}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
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
            disabled={assignRoleMutation.isPending}
            className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50 md:w-1/2"
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
                <button
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                </button>
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
            onClick={handleToggleActive}
            disabled={activateMutation.isPending || deactivateMutation.isPending}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${profile.isActive ? 'border border-red-300 text-red-700 hover:bg-red-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            {profile.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}
