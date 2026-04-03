'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PermissionMatrixProps {
  permissionCatalog: Record<string, Array<{ resource: string; action: string; description: string | null }>>;
  selectedPermissions: string[];
  onPermissionsChange: (permissions: string[]) => void;
}

/** Module display names. */
const MODULE_LABELS: Record<string, string> = {
  platform: 'Platform & Settings',
  inventory: 'Inventory',
  manufacturing: 'Manufacturing',
  retail: 'Retail & POS',
  financial: 'Financial & Accounting',
  crm: 'CRM & Customers',
  wholesale: 'Wholesale & Suppliers',
  ecommerce: 'E-Commerce',
  compliance: 'Compliance',
  reporting: 'Reports & Analytics',
};

/**
 * PermissionMatrix: A grid of checkboxes grouped by module, with resource x action layout.
 * Used in the Role create/edit form.
 */
export function PermissionMatrix({
  permissionCatalog,
  selectedPermissions,
  onPermissionsChange,
}: PermissionMatrixProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const modules = Object.keys(permissionCatalog);

  const toggleModule = (moduleName: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  };

  const togglePermission = (permString: string) => {
    const next = selectedPermissions.includes(permString)
      ? selectedPermissions.filter((p) => p !== permString)
      : [...selectedPermissions, permString];
    onPermissionsChange(next);
  };

  const toggleAllForModule = (moduleName: string) => {
    const modulePerms = permissionCatalog[moduleName] ?? [];
    const allPermStrings = modulePerms.map((p) => `${moduleName}.${p.resource}.${p.action}`);
    const allSelected = allPermStrings.every((p) => selectedPermissions.includes(p));

    if (allSelected) {
      // Deselect all for this module
      onPermissionsChange(selectedPermissions.filter((p) => !p.startsWith(`${moduleName}.`)));
    } else {
      // Select all for this module
      const existing = new Set(selectedPermissions);
      for (const p of allPermStrings) {
        existing.add(p);
      }
      onPermissionsChange(Array.from(existing));
    }
  };

  const getModuleSelectedCount = (moduleName: string): number => {
    return selectedPermissions.filter((p) => p.startsWith(`${moduleName}.`)).length;
  };

  // Group permissions by resource within each module
  const groupByResource = (permissions: Array<{ resource: string; action: string; description: string | null }>) => {
    const grouped: Record<string, Array<{ action: string; description: string | null }>> = {};
    for (const p of permissions) {
      if (!grouped[p.resource]) {
        grouped[p.resource] = [];
      }
      grouped[p.resource].push({ action: p.action, description: p.description });
    }
    return grouped;
  };

  if (modules.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/50 p-8 text-center text-sm text-muted-foreground">
        No permissions available. Run permission seed first.
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-lg border">
      {modules.map((moduleName) => {
        const perms = permissionCatalog[moduleName] ?? [];
        const isExpanded = expandedModules.has(moduleName);
        const selectedCount = getModuleSelectedCount(moduleName);
        const totalCount = perms.length;
        const resourceGroups = groupByResource(perms);

        return (
          <div key={moduleName}>
            {/* Module Header */}
            <div
              className="flex cursor-pointer items-center gap-2 border-b px-4 py-3 hover:bg-muted/50"
              onClick={() => toggleModule(moduleName)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <input
                type="checkbox"
                checked={selectedCount === totalCount && totalCount > 0}
                ref={(el) => {
                  if (el) el.indeterminate = selectedCount > 0 && selectedCount < totalCount;
                }}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleAllForModule(moduleName);
                }}
                className="h-4 w-4 rounded border"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="flex-1 text-sm font-semibold">
                {MODULE_LABELS[moduleName] ?? moduleName}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedCount}/{totalCount}
              </span>
            </div>

            {/* Permission Grid */}
            {isExpanded && (
              <div className="border-b bg-muted/20 px-4 py-3">
                {Object.entries(resourceGroups).map(([resource, actions]) => (
                  <div key={resource} className="mb-2 last:mb-0">
                    <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {resource}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {actions.map((a) => {
                        const permString = `${moduleName}.${resource}.${a.action}`;
                        const isChecked = selectedPermissions.includes(permString);
                        return (
                          <label
                            key={permString}
                            className="flex items-center gap-1.5 text-sm"
                            title={a.description ?? permString}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(permString)}
                              className="h-3.5 w-3.5 rounded border"
                            />
                            <span className={isChecked ? 'text-foreground' : 'text-muted-foreground'}>
                              {a.action}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
