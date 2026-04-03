'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Printer, RotateCcw, Ban } from 'lucide-react';
import { SaleInvoice } from '../../../../../src/features/retail/SaleInvoice';

// Mock sale detail -- in production from tRPC: retail.getSale
const mockSale = {
  id: '1',
  saleNumber: 'SL/MUM/2604/0012',
  customerName: 'Priya Sharma',
  customerPhone: '+91 98765 43210',
  status: 'COMPLETED',
  locationName: 'Mumbai Showroom',
  salesperson: 'Raj Kumar',
  items: [
    {
      description: '22K Gold Necklace - Lakshmi',
      quantity: 1,
      unitPricePaise: 8500000,
      metalWeightMg: 15000,
      makingChargesPaise: 250000,
      cgstPaise: 131250,
      sgstPaise: 131250,
      igstPaise: 0,
      lineTotalPaise: 9012500,
      hsnCode: '7113',
    },
  ],
  subtotalPaise: 8750000,
  discountPaise: 0,
  taxPaise: 262500,
  roundOffPaise: 0,
  totalPaise: 9012500,
  payments: [
    { method: 'CASH', amountPaise: 5000000, reference: null },
    { method: 'CARD', amountPaise: 4012500, reference: 'TXN-123456' },
  ],
  createdAt: new Date().toISOString(),
};

export default function SaleDetailPage() {
  const sale = mockSale;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sale ${sale.saleNumber}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Sales', href: '/retail/sales' },
          { label: sale.saleNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              label={sale.status.replace('_', ' ')}
              variant={getStatusVariant(sale.status)}
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            {sale.status === 'COMPLETED' && (
              <>
                <a
                  href={`/retail/returns?saleId=${sale.id}`}
                  className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent"
                >
                  <RotateCcw className="h-4 w-4" />
                  Return
                </a>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/50 px-3 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <Ban className="h-4 w-4" />
                  Void
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Sale details */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
          <p className="mt-1 font-medium">{sale.customerName}</p>
          <p className="text-sm text-muted-foreground">{sale.customerPhone}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
          <p className="mt-1 font-medium">{sale.locationName}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Salesperson</h3>
          <p className="mt-1 font-medium">{sale.salesperson}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(sale.createdAt).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/30 px-4 py-2 text-sm font-medium">Invoice Preview</div>
        <SaleInvoice
          saleNumber={sale.saleNumber}
          date={new Date(sale.createdAt)}
          customerName={sale.customerName}
          customerPhone={sale.customerPhone}
          items={sale.items}
          subtotalPaise={sale.subtotalPaise}
          discountPaise={sale.discountPaise}
          taxPaise={sale.taxPaise}
          roundOffPaise={sale.roundOffPaise}
          totalPaise={sale.totalPaise}
          payments={sale.payments}
        />
      </div>
    </div>
  );
}
