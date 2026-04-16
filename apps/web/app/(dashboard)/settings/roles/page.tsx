'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Shield, Plus, Pencil, Trash2 } from 'lucide-react';
import { PermissionMatrix } from '@/features/platform/PermissionMatrix';
import { trpc } from '@/lib/trpc';

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, string[]> | unknown;
  isSystem: boolean;
  _count: { users: number };
}

export default function RolesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const rolesQuery = trpc.platform.roles.list.useQuery();
  const permissionsQuery = trpc.platform.roles.permissions.useQuery();

  const roles = (rolesQuery.data as Role[] | undefined) ?? [];
  const permissionCatalog =
    (permissionsQuery.data as Record<
      string,
      Array<{ resource: string; action: string; description: string | null }>
    > | undefined) ?? {};

  const resetForm = () => {
    setShowForm(false);
    setEditingRole(null);
    setFormData({ name: '', description: '', permissions: [] });
  };

  const createMutation = trpc.platform.roles.create.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Role created.' });
      resetForm();
      void rolesQuery.refetch();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const updateMutation = trpc.platform.roles.update.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Role updated.' });
      resetForm();
      void rolesQuery.refetch();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const deleteMutation = trpc.platform.roles.delete.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Role deleted.' });
      void rolesQuery.refetch();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      setBanner({ type: 'error', message: 'Role name is required.' });
      return;
    }
    if (editingRole) {
      updateMutation.mutate({
        roleId: editingRole.id,
        name: formData.name.trim(),
        description: formData.description || undefined,
        permissions: formData.permissions,
      });
    } else {
      createMutation.mutate({
        name: formData.name.trim(),
        description: formData.description || undefined,
        permissions: formData.permissions,
      });
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    // Flatten permissions from JSON format to string array
    const permArray: string[] = [];
    const perms = role.permissions;
    if (perms && typeof perms === 'object') {
      for (const [key, actions] of Object.entries(perms as Record<string, unknown>)) {
        if (Array.isArray(actions)) {
          for (const action of actions as string[]) {
            permArray.push(`${key}.${action}`);
          }
        }
      }
    }
    setFormData({
      name: role.name,
      description: role.description ?? '',
      permissions: permArray,
    });
    setShowForm(true);
  };

  const handleDelete = (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    deleteMutation.mutate({ roleId });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Define roles and configure granular access control."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Roles & Permissions' },
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

      <div className="flex justify-end">
        <button
          onClick={() => { setEditingRole(null); setFormData({ name: '', description: '', permissions: [] }); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b p-6">
            <h3 className="text-lg font-semibold">
              {editingRole ? `Edit Role: ${editingRole.name}` : 'New Role'}
            </h3>
          </div>
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium" htmlFor="role-name">Role Name</label>
                <input id="role-name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g., Store Manager" />
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="role-desc">Description</label>
                <input id="role-desc" type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="Brief description of the role" />
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">Permissions</h4>
              <PermissionMatrix
                permissionCatalog={permissionCatalog}
                selectedPermissions={formData.permissions}
                onPermissionsChange={(permissions) => setFormData({ ...formData, permissions })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t p-4">
            <button onClick={resetForm} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </div>
      )}

      {/* Role List */}
      {rolesQuery.isLoading ? (
        <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">Loading roles...</div>
      ) : roles.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No roles defined</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first role to manage user permissions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{role.name}</h3>
                  {role.isSystem && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">System</span>
                  )}
                </div>
                {role.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{role.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {role._count.users} user{role._count.users !== 1 ? 's' : ''} assigned
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(role)}
                  disabled={role.isSystem}
                  className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  title="Edit role"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(role.id)}
                  disabled={role.isSystem || role._count.users > 0 || deleteMutation.isPending}
                  className="rounded p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Delete role"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
