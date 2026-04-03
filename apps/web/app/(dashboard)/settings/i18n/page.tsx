'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Languages, Plus, Save, Search } from 'lucide-react';

interface TranslationKey {
  id: string;
  namespace: string;
  key: string;
  defaultValue: string;
  translations: Record<string, string>;
}

const LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'mr', name: 'Marathi' },
  { code: 'bn', name: 'Bengali' },
] as const;

export default function I18nPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [selectedLocale, setSelectedLocale] = useState('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const [createData, setCreateData] = useState({
    namespace: '',
    key: '',
    defaultValue: '',
  });

  // TODO: Fetch from API
  const translationKeys: TranslationKey[] = [];
  const namespaces: string[] = [];

  const handleCreate = async () => {
    // TODO: Call trpc.platform.i18n.create.mutate
    console.log('Creating translation:', createData);
    setShowCreateForm(false);
    setCreateData({ namespace: '', key: '', defaultValue: '' });
  };

  const handleUpdateTranslation = async (keyId: string, value: string) => {
    // TODO: Call trpc.platform.i18n.update.mutate
    console.log('Updating translation:', keyId, selectedLocale, value);
    setEditingKey(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Translations"
        description="Manage multi-language translations for Indian languages and English."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Translations' },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedNamespace}
            onChange={(e) => setSelectedNamespace(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">All namespaces</option>
            {namespaces.map((ns) => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <select
            value={selectedLocale}
            onChange={(e) => setSelectedLocale(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {LOCALES.map((locale) => (
              <option key={locale.code} value={locale.code}>
                {locale.name} ({locale.code})
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border py-2 pl-9 pr-3 text-sm sm:w-56"
            />
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Key
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">New Translation Key</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium" htmlFor="i18n-ns">Namespace</label>
              <input id="i18n-ns" type="text" value={createData.namespace} onChange={(e) => setCreateData({ ...createData, namespace: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="common" />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="i18n-key">Key</label>
              <input id="i18n-key" type="text" value={createData.key} onChange={(e) => setCreateData({ ...createData, key: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="buttons.save" />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="i18n-default">Default Value (English)</label>
              <input id="i18n-default" type="text" value={createData.defaultValue} onChange={(e) => setCreateData({ ...createData, defaultValue: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="Save" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowCreateForm(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleCreate} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Create</button>
          </div>
        </div>
      )}

      {/* Translation Table */}
      {translationKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
          <Languages className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No translation keys</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add your first translation key to enable multi-language support.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Namespace</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Key</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Default (EN)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {LOCALES.find((l) => l.code === selectedLocale)?.name ?? selectedLocale}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {translationKeys.map((tk) => (
                <tr key={tk.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{tk.namespace}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{tk.key}</td>
                  <td className="px-4 py-3 text-sm">{tk.defaultValue}</td>
                  <td className="px-4 py-3">
                    {editingKey === tk.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded border px-2 py-1 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateTranslation(tk.id, editValue)}
                          className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                        >
                          <Save className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer text-sm hover:text-primary"
                        onClick={() => {
                          setEditingKey(tk.id);
                          setEditValue(tk.translations[selectedLocale] ?? '');
                        }}
                      >
                        {tk.translations[selectedLocale] || <span className="italic text-muted-foreground">Click to translate</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs text-red-600 hover:underline">Delete</button>
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
