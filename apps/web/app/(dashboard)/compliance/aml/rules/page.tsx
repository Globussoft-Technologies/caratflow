'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

type RuleSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type RuleType =
  | 'TRANSACTION_AMOUNT_LIMIT'
  | 'FREQUENCY_LIMIT'
  | 'VELOCITY_CHECK'
  | 'HIGH_VALUE_ALERT'
  | 'COUNTRY_RESTRICTION'
  | 'PEP_CHECK';

interface RuleParameters {
  maxAmountPaise?: number;
  period?: string;
  maxCount?: number;
  velocityThresholdPaise?: number;
  structuringThresholdPaise?: number;
  structuringWindowHours?: number;
  restrictedCountries?: string[];
}

interface RuleRow {
  id: string;
  ruleName: string;
  ruleType: RuleType;
  severity: RuleSeverity;
  isActive: boolean;
  parameters: RuleParameters | unknown;
}

interface RuleFormState {
  id?: string;
  ruleName: string;
  ruleType: RuleType;
  severity: RuleSeverity;
  isActive: boolean;
  // Parameter fields (optional per rule type)
  maxAmountPaise?: string;
  period?: string;
  maxCount?: string;
  velocityThresholdPaise?: string;
  structuringThresholdPaise?: string;
  structuringWindowHours?: string;
  restrictedCountries?: string;
}

const severityConfig: Record<RuleSeverity, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
  LOW: { variant: 'info', label: 'Low' },
  MEDIUM: { variant: 'warning', label: 'Medium' },
  HIGH: { variant: 'danger', label: 'High' },
  CRITICAL: { variant: 'danger', label: 'Critical' },
};

const ruleTypeLabels: Record<RuleType, string> = {
  TRANSACTION_AMOUNT_LIMIT: 'Amount Limit',
  FREQUENCY_LIMIT: 'Frequency Limit',
  VELOCITY_CHECK: 'Velocity Check',
  HIGH_VALUE_ALERT: 'High Value Alert',
  COUNTRY_RESTRICTION: 'Country Restriction',
  PEP_CHECK: 'PEP Check',
};

const RULE_TYPES: RuleType[] = [
  'TRANSACTION_AMOUNT_LIMIT',
  'FREQUENCY_LIMIT',
  'VELOCITY_CHECK',
  'HIGH_VALUE_ALERT',
  'COUNTRY_RESTRICTION',
  'PEP_CHECK',
];

const emptyForm: RuleFormState = {
  ruleName: '',
  ruleType: 'TRANSACTION_AMOUNT_LIMIT',
  severity: 'MEDIUM',
  isActive: true,
};

function parseParameters(form: RuleFormState): RuleParameters {
  const out: RuleParameters = {};
  if (form.maxAmountPaise && form.maxAmountPaise.trim()) {
    const n = Number(form.maxAmountPaise);
    if (Number.isFinite(n)) out.maxAmountPaise = Math.trunc(n);
  }
  if (form.period && form.period.trim()) out.period = form.period.trim();
  if (form.maxCount && form.maxCount.trim()) {
    const n = Number(form.maxCount);
    if (Number.isFinite(n)) out.maxCount = Math.trunc(n);
  }
  if (form.velocityThresholdPaise && form.velocityThresholdPaise.trim()) {
    const n = Number(form.velocityThresholdPaise);
    if (Number.isFinite(n)) out.velocityThresholdPaise = Math.trunc(n);
  }
  if (form.structuringThresholdPaise && form.structuringThresholdPaise.trim()) {
    const n = Number(form.structuringThresholdPaise);
    if (Number.isFinite(n)) out.structuringThresholdPaise = Math.trunc(n);
  }
  if (form.structuringWindowHours && form.structuringWindowHours.trim()) {
    const n = Number(form.structuringWindowHours);
    if (Number.isFinite(n)) out.structuringWindowHours = Math.trunc(n);
  }
  if (form.restrictedCountries && form.restrictedCountries.trim()) {
    out.restrictedCountries = form.restrictedCountries
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);
  }
  return out;
}

function paramsToForm(rule: RuleRow): RuleFormState {
  const p = (rule.parameters as RuleParameters | null) ?? {};
  return {
    id: rule.id,
    ruleName: rule.ruleName,
    ruleType: rule.ruleType,
    severity: rule.severity,
    isActive: rule.isActive,
    maxAmountPaise: p.maxAmountPaise?.toString() ?? '',
    period: p.period ?? '',
    maxCount: p.maxCount?.toString() ?? '',
    velocityThresholdPaise: p.velocityThresholdPaise?.toString() ?? '',
    structuringThresholdPaise: p.structuringThresholdPaise?.toString() ?? '',
    structuringWindowHours: p.structuringWindowHours?.toString() ?? '',
    restrictedCountries: p.restrictedCountries?.join(', ') ?? '',
  };
}

function describeRule(rule: RuleRow): string {
  const p = (rule.parameters as RuleParameters | null) ?? {};
  switch (rule.ruleType) {
    case 'TRANSACTION_AMOUNT_LIMIT':
      return p.maxAmountPaise
        ? `Flag single transactions above Rs. ${(p.maxAmountPaise / 100).toLocaleString('en-IN')}`
        : 'Transaction amount limit rule';
    case 'FREQUENCY_LIMIT':
      return p.maxCount && p.period
        ? `Flag more than ${p.maxCount} transactions in ${p.period}`
        : 'Frequency limit rule';
    case 'VELOCITY_CHECK':
      return p.velocityThresholdPaise
        ? `Flag transactions exceeding Rs. ${(p.velocityThresholdPaise / 100).toLocaleString('en-IN')} velocity threshold`
        : 'Velocity check rule';
    case 'HIGH_VALUE_ALERT':
      return p.maxAmountPaise
        ? `High-value alert threshold: Rs. ${(p.maxAmountPaise / 100).toLocaleString('en-IN')}`
        : 'High-value alert rule';
    case 'COUNTRY_RESTRICTION':
      return p.restrictedCountries && p.restrictedCountries.length > 0
        ? `Flag customers from ${p.restrictedCountries.join(', ')}`
        : 'Country restriction rule';
    case 'PEP_CHECK':
      return 'Politically Exposed Person screening';
    default:
      return '';
  }
}

export default function AmlRulesPage() {
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [form, setForm] = useState<RuleFormState | null>(null);

  const listQuery = trpc.aml.ruleList.useQuery();
  const refresh = () => { void listQuery.refetch(); };

  const createMutation = trpc.aml.ruleCreate.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Rule created.' });
      setForm(null);
      refresh();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const updateMutation = trpc.aml.ruleUpdate.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Rule updated.' });
      setForm(null);
      refresh();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const deleteMutation = trpc.aml.ruleDelete.useMutation({
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Rule deactivated.' });
      refresh();
    },
    onError: (err) => setBanner({ type: 'error', message: err.message }),
  });

  const rules = (listQuery.data ?? []) as unknown as RuleRow[];

  const submitForm = () => {
    if (!form) return;
    if (!form.ruleName.trim()) {
      setBanner({ type: 'error', message: 'Rule name is required.' });
      return;
    }
    const parameters = parseParameters(form);
    const payload = {
      ruleName: form.ruleName.trim(),
      ruleType: form.ruleType,
      severity: form.severity,
      isActive: form.isActive,
      parameters,
    };
    if (form.id) {
      updateMutation.mutate({ id: form.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AML Rules"
        description="Configure anti-money laundering detection rules."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'AML', href: '/compliance/aml' },
          { label: 'Rules' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setForm({ ...emptyForm })}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        }
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

      {/* Rule Form */}
      {form && (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-semibold">
            {form.id ? 'Edit Rule' : 'New Rule'}
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="rule-name" className="block text-sm font-medium">Rule Name</label>
              <input
                id="rule-name"
                type="text"
                value={form.ruleName}
                onChange={(e) => setForm({ ...form, ruleName: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="rule-type" className="block text-sm font-medium">Rule Type</label>
              <select
                id="rule-type"
                value={form.ruleType}
                onChange={(e) => setForm({ ...form, ruleType: e.target.value as RuleType })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                {RULE_TYPES.map((t) => (
                  <option key={t} value={t}>{ruleTypeLabels[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rule-severity" className="block text-sm font-medium">Severity</label>
              <select
                id="rule-severity"
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as RuleSeverity })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>

            {/* Parameter fields */}
            {(form.ruleType === 'TRANSACTION_AMOUNT_LIMIT' || form.ruleType === 'HIGH_VALUE_ALERT') && (
              <div className="md:col-span-2">
                <label htmlFor="rule-max-amount" className="block text-sm font-medium">Max Amount (paise)</label>
                <input
                  id="rule-max-amount"
                  type="number"
                  value={form.maxAmountPaise ?? ''}
                  onChange={(e) => setForm({ ...form, maxAmountPaise: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            )}
            {form.ruleType === 'FREQUENCY_LIMIT' && (
              <>
                <div>
                  <label htmlFor="rule-max-count" className="block text-sm font-medium">Max Count</label>
                  <input
                    id="rule-max-count"
                    type="number"
                    value={form.maxCount ?? ''}
                    onChange={(e) => setForm({ ...form, maxCount: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="rule-period" className="block text-sm font-medium">Period (e.g. 24h, 7d)</label>
                  <input
                    id="rule-period"
                    type="text"
                    value={form.period ?? ''}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            {form.ruleType === 'VELOCITY_CHECK' && (
              <div className="md:col-span-2">
                <label htmlFor="rule-velocity" className="block text-sm font-medium">Velocity Threshold (paise)</label>
                <input
                  id="rule-velocity"
                  type="number"
                  value={form.velocityThresholdPaise ?? ''}
                  onChange={(e) => setForm({ ...form, velocityThresholdPaise: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            )}
            {form.ruleType === 'COUNTRY_RESTRICTION' && (
              <div className="md:col-span-2">
                <label htmlFor="rule-countries" className="block text-sm font-medium">Restricted Countries (comma-separated ISO codes)</label>
                <input
                  id="rule-countries"
                  type="text"
                  value={form.restrictedCountries ?? ''}
                  onChange={(e) => setForm({ ...form, restrictedCountries: e.target.value })}
                  placeholder="AF, KP, IR, SY"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitForm}
              disabled={isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : form.id ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      {listQuery.isLoading && (
        <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">
          Loading rules...
        </div>
      )}
      {listQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load rules: {listQuery.error.message}
        </div>
      )}
      {!listQuery.isLoading && !listQuery.isError && rules.length === 0 && (
        <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">
          No rules configured yet. Click Add Rule to create one.
        </div>
      )}
      {!listQuery.isLoading && !listQuery.isError && rules.length > 0 && (
        <div className="space-y-4">
          {rules.map((rule) => {
            const sevConfig = severityConfig[rule.severity] ?? severityConfig.MEDIUM;
            const params = (rule.parameters as RuleParameters | null) ?? {};
            return (
              <div
                key={rule.id}
                className={`rounded-lg border bg-card p-5 ${!rule.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{rule.ruleName}</h3>
                      <StatusBadge
                        label={rule.isActive ? 'Active' : 'Inactive'}
                        variant={rule.isActive ? 'success' : 'muted'}
                      />
                      <StatusBadge label={sevConfig.label} variant={sevConfig.variant} />
                    </div>
                    <p className="text-sm text-muted-foreground">{describeRule(rule)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setForm(paramsToForm(rule))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateMutation.mutate({ id: rule.id, isActive: !rule.isActive });
                      }}
                      disabled={updateMutation.isPending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
                      title={rule.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete (deactivate) rule "${rule.ruleName}"?`)) {
                          deleteMutation.mutate({ id: rule.id });
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {ruleTypeLabels[rule.ruleType] ?? rule.ruleType}
                    </span>
                  </div>
                  {params.maxAmountPaise !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Threshold:</span>
                      <span className="font-medium">
                        Rs. {(params.maxAmountPaise / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {params.maxCount !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Max Count:</span>
                      <span className="font-medium">{params.maxCount}</span>
                    </div>
                  )}
                  {params.period && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Period:</span>
                      <span className="font-medium">{params.period}</span>
                    </div>
                  )}
                  {params.velocityThresholdPaise !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Velocity:</span>
                      <span className="font-medium">
                        Rs. {(params.velocityThresholdPaise / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {params.restrictedCountries && params.restrictedCountries.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Countries:</span>
                      <span className="font-medium">{params.restrictedCountries.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
