'use client';

import { PageHeader } from '@caratflow/ui';
import { ExchangeRateDisplay } from '../../../../src/features/export/ExchangeRateDisplay';

export default function ExchangeRatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Exchange Rates"
        description="Manage exchange rates for multi-currency export transactions."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Exchange Rates' },
        ]}
      />
      <ExchangeRateDisplay />
    </div>
  );
}
