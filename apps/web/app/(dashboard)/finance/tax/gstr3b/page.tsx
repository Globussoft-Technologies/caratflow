'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';

const mockGstr3b = {
  period: '04-2026',
  outwardSupplies: { taxableAmountPaise: 350000_00, igstPaise: 0, cgstPaise: 5250_00, sgstPaise: 5250_00, cessPaise: 0 },
  inwardSupplies: { taxableAmountPaise: 200000_00, igstPaise: 0, cgstPaise: 3000_00, sgstPaise: 3000_00, cessPaise: 0 },
  itcAvailable: { igstPaise: 0, cgstPaise: 3000_00, sgstPaise: 3000_00, cessPaise: 0 },
  taxPayable: { igstPaise: 0, cgstPaise: 2250_00, sgstPaise: 2250_00, cessPaise: 0 },
};

export default function Gstr3bPage() {
  const d = mockGstr3b;
  const formatAmount = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const SectionTable = ({ title, data }: { title: string; data: { igstPaise: number; cgstPaise: number; sgstPaise: number; cessPaise: number; taxableAmountPaise?: number } }) => (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/20">
            {data.taxableAmountPaise !== undefined && <th className="px-4 py-2 text-right font-medium">Taxable Value</th>}
            <th className="px-4 py-2 text-right font-medium">IGST</th>
            <th className="px-4 py-2 text-right font-medium">CGST</th>
            <th className="px-4 py-2 text-right font-medium">SGST</th>
            <th className="px-4 py-2 text-right font-medium">Cess</th>
            <th className="px-4 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {data.taxableAmountPaise !== undefined && (
              <td className="px-4 py-2 text-right font-mono">{formatAmount(data.taxableAmountPaise)}</td>
            )}
            <td className="px-4 py-2 text-right font-mono">{formatAmount(data.igstPaise)}</td>
            <td className="px-4 py-2 text-right font-mono">{formatAmount(data.cgstPaise)}</td>
            <td className="px-4 py-2 text-right font-mono">{formatAmount(data.sgstPaise)}</td>
            <td className="px-4 py-2 text-right font-mono">{formatAmount(data.cessPaise)}</td>
            <td className="px-4 py-2 text-right font-mono font-bold">
              {formatAmount(data.igstPaise + data.cgstPaise + data.sgstPaise + data.cessPaise)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const totalPayable = d.taxPayable.igstPaise + d.taxPayable.cgstPaise + d.taxPayable.sgstPaise + d.taxPayable.cessPaise;

  return (
    <div className="space-y-6">
      <PageHeader
        title="GSTR-3B Worksheet"
        description={`Monthly summary return for period ${d.period}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Tax', href: '/finance/tax' },
          { label: 'GSTR-3B' },
        ]}
      />

      <SectionTable title="3.1 - Outward Supplies" data={d.outwardSupplies} />
      <SectionTable title="3.2 - Inward Supplies (ITC)" data={d.inwardSupplies} />
      <SectionTable title="4 - ITC Available" data={d.itcAvailable} />
      <SectionTable title="5 - Tax Payable (after ITC)" data={d.taxPayable} />

      <div className="rounded-lg border bg-primary/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Net Tax Payable</h3>
            <p className="text-sm text-muted-foreground">For period {d.period}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatAmount(totalPayable)}</p>
            <p className="text-sm text-muted-foreground">
              CGST: {formatAmount(d.taxPayable.cgstPaise)} + SGST: {formatAmount(d.taxPayable.sgstPaise)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
