'use client';

import { PageHeader } from '@caratflow/ui';
import { Search } from 'lucide-react';
import { PaymentStatusBadge } from '@/features/ecommerce';

// Mock data -- in production from tRPC: ecommerce.listPayments
const payments = [
  { id: '1', orderId: 'o1', orderNumber: 'ON/SHO/2604/0028', gatewayType: 'RAZORPAY', method: 'card', amountPaise: 128750_00, currencyCode: 'INR', status: 'CAPTURED', externalPaymentId: 'pay_AbCdEfGhIj', completedAt: '2026-04-04T11:05:00Z' },
  { id: '2', orderId: 'o2', orderNumber: 'ON/AMA/2604/0006', gatewayType: 'RAZORPAY', method: 'upi', amountPaise: 85000_00, currencyCode: 'INR', status: 'CAPTURED', externalPaymentId: 'pay_KlMnOpQrSt', completedAt: '2026-04-04T09:35:00Z' },
  { id: '3', orderId: 'o3', orderNumber: 'ON/SHO/2604/0027', gatewayType: 'STRIPE', method: 'card', amountPaise: 250000_00, currencyCode: 'INR', status: 'CAPTURED', externalPaymentId: 'pi_UvWxYz123', completedAt: '2026-04-03T16:05:00Z' },
  { id: '4', orderId: 'o4', orderNumber: 'ON/INS/2604/0004', gatewayType: 'RAZORPAY', method: 'netbanking', amountPaise: 45000_00, currencyCode: 'INR', status: 'INITIATED', externalPaymentId: null, completedAt: null },
  { id: '5', orderId: 'o5', orderNumber: 'ON/SHO/2604/0025', gatewayType: 'RAZORPAY', method: 'card', amountPaise: 95000_00, currencyCode: 'INR', status: 'REFUNDED', externalPaymentId: 'pay_RefundTest', completedAt: '2026-03-28T10:00:00Z' },
];

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Online Payments"
        description="Payment transactions and reconciliation for online orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Payments' },
        ]}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by payment reference or order number..."
          className="h-10 w-full rounded-md border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Order</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Gateway</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Method</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Reference</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="p-3 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.map((pay) => (
              <tr key={pay.id} className="transition-colors hover:bg-accent/50">
                <td className="p-3">
                  <a href={`/ecommerce/orders/${pay.orderId}`} className="text-sm font-mono text-primary hover:underline">
                    {pay.orderNumber}
                  </a>
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {pay.gatewayType}
                  </span>
                </td>
                <td className="p-3">
                  <span className="text-sm capitalize">{pay.method}</span>
                </td>
                <td className="p-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    {pay.externalPaymentId ?? '--'}
                  </span>
                </td>
                <td className="p-3">
                  <PaymentStatusBadge status={pay.status} />
                </td>
                <td className="p-3 text-right">
                  <span className="text-sm font-semibold">{formatPaise(pay.amountPaise)}</span>
                </td>
                <td className="p-3">
                  <span className="text-xs text-muted-foreground">
                    {pay.completedAt ? new Date(pay.completedAt).toLocaleString() : '--'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
