'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Settings, Plus, Pencil, Trash2 } from 'lucide-react';

// Placeholder data -- in production, use trpc.aml.ruleList hook
const rulesData = [
  {
    id: '1',
    ruleName: 'High-Value Transaction Limit',
    ruleType: 'TRANSACTION_AMOUNT_LIMIT',
    severity: 'CRITICAL',
    isActive: true,
    parameters: { maxAmountPaise: 100000000, period: '24h' },
    description: 'Flag single transactions above Rs. 10,00,000',
  },
  {
    id: '2',
    ruleName: 'Transaction Frequency Limit',
    ruleType: 'FREQUENCY_LIMIT',
    severity: 'MEDIUM',
    isActive: true,
    parameters: { maxCount: 5, period: '24h' },
    description: 'Flag more than 5 transactions in 24 hours',
  },
  {
    id: '3',
    ruleName: 'Velocity Check',
    ruleType: 'VELOCITY_CHECK',
    severity: 'HIGH',
    isActive: true,
    parameters: { velocityThresholdPaise: 500000000 },
    description: 'Flag transactions exceeding Rs. 50,00,000 velocity threshold',
  },
  {
    id: '4',
    ruleName: 'Structuring Detection',
    ruleType: 'STRUCTURING',
    severity: 'HIGH',
    isActive: true,
    parameters: { structuringThresholdPaise: 100000000, structuringWindowHours: 24 },
    description: 'Detect transactions split to stay below Rs. 10,00,000 threshold',
  },
  {
    id: '5',
    ruleName: 'Country Restriction',
    ruleType: 'COUNTRY_RESTRICTION',
    severity: 'MEDIUM',
    isActive: true,
    parameters: { restrictedCountries: ['AF', 'KP', 'IR', 'SY'] },
    description: 'Flag customers from FATF high-risk countries',
  },
  {
    id: '6',
    ruleName: 'CTR Threshold (Rs. 10 Lakh)',
    ruleType: 'HIGH_VALUE_ALERT',
    severity: 'LOW',
    isActive: false,
    parameters: { maxAmountPaise: 1000000000 },
    description: 'Cash Transaction Report threshold as per PMLA',
  },
];

const severityConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
  LOW: { variant: 'info', label: 'Low' },
  MEDIUM: { variant: 'warning', label: 'Medium' },
  HIGH: { variant: 'danger', label: 'High' },
  CRITICAL: { variant: 'danger', label: 'Critical' },
};

const ruleTypeLabels: Record<string, string> = {
  TRANSACTION_AMOUNT_LIMIT: 'Amount Limit',
  FREQUENCY_LIMIT: 'Frequency Limit',
  VELOCITY_CHECK: 'Velocity Check',
  HIGH_VALUE_ALERT: 'High Value Alert',
  COUNTRY_RESTRICTION: 'Country Restriction',
  PEP_CHECK: 'PEP Check',
  STRUCTURING: 'Structuring',
};

export default function AmlRulesPage() {
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
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        }
      />

      {/* Rules List */}
      <div className="space-y-4">
        {rulesData.map((rule) => {
          const sevConfig = severityConfig[rule.severity];
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
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
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
                {rule.parameters.maxAmountPaise && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Threshold:</span>
                    <span className="font-medium">
                      Rs. {(rule.parameters.maxAmountPaise / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {rule.parameters.maxCount && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Max Count:</span>
                    <span className="font-medium">{rule.parameters.maxCount}</span>
                  </div>
                )}
                {rule.parameters.period && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Period:</span>
                    <span className="font-medium">{rule.parameters.period}</span>
                  </div>
                )}
                {rule.parameters.restrictedCountries && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Countries:</span>
                    <span className="font-medium">{(rule.parameters.restrictedCountries as string[]).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
