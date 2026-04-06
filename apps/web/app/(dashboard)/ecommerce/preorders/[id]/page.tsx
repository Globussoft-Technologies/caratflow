'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import {
  Clock,
  CheckCircle,
  Package,
  XCircle,
  ShoppingBag,
  User,
  CreditCard,
  CalendarDays,
  Factory,
  Bell,
} from 'lucide-react';

// Mock data -- in production from tRPC: preorder.getPreOrder
const preOrder = {
  id: '2',
  tenantId: 'tenant-1',
  customerId: 'cust-2',
  customerName: 'Vikram Singh',
  customerEmail: 'vikram@example.com',
  customerPhone: '+91 98765 12345',
  productId: 'prod-2',
  productName: 'Diamond Solitaire Ring',
  productSku: 'DR-18K-001',
  quantity: 1,
  status: 'CONFIRMED',
  orderType: 'MADE_TO_ORDER',
  depositPaise: 50000_00,
  estimatedAvailableDate: '2026-04-28',
  estimatedDeliveryDate: '2026-05-05',
  actualAvailableDate: null,
  notifiedAt: null,
  fulfilledOrderId: null,
  cancelReason: null,
  notes: 'Customer requested size 7 with engraving "Forever".',
  priceLockPaise: 275000_00,
  isPriceLocked: true,
  createdAt: '2026-04-03T09:30:00Z',
  updatedAt: '2026-04-04T10:15:00Z',
};

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

function getOrderTypeLabel(type: string) {
  const labels: Record<string, string> = {
    PRE_ORDER: 'Pre-Order',
    BACKORDER: 'Backorder',
    MADE_TO_ORDER: 'Made to Order',
  };
  return labels[type] ?? type;
}

// Timeline steps based on pre-order status flow
const timelineSteps = [
  { key: 'PENDING', label: 'Created', icon: Clock, date: preOrder.createdAt },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle, date: preOrder.status !== 'PENDING' ? preOrder.updatedAt : null },
  { key: 'IN_PRODUCTION', label: 'In Production', icon: Factory, date: null },
  { key: 'AVAILABLE', label: 'Available', icon: Package, date: preOrder.actualAvailableDate },
  { key: 'FULFILLED', label: 'Fulfilled', icon: ShoppingBag, date: null },
];

const statusOrder = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'AVAILABLE', 'FULFILLED'];

export default function PreOrderDetailPage() {
  const currentIndex = statusOrder.indexOf(preOrder.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pre-Order: ${preOrder.productName}`}
        description={`Created on ${new Date(preOrder.createdAt).toLocaleString()}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Pre-Orders', href: '/ecommerce/preorders' },
          { label: preOrder.productName },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {preOrder.status === 'PENDING' && (
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                <CheckCircle className="h-4 w-4" />
                Confirm
              </button>
            )}
            {['CONFIRMED', 'IN_PRODUCTION'].includes(preOrder.status) && (
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                <Package className="h-4 w-4" />
                Mark Available
              </button>
            )}
            {preOrder.status === 'AVAILABLE' && (
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                <ShoppingBag className="h-4 w-4" />
                Fulfill Order
              </button>
            )}
            {!['FULFILLED', 'CANCELLED'].includes(preOrder.status) && (
              <>
                <button className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent">
                  <Bell className="h-4 w-4" />
                  Notify Customer
                </button>
                <button className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" />
                  Cancel
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Status + Type */}
      <div className="flex items-center gap-3">
        <StatusBadge
          label={preOrder.status.replace(/_/g, ' ')}
          variant={getStatusVariant(preOrder.status)}
          dot
        />
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
          {getOrderTypeLabel(preOrder.orderType)}
        </span>
        {preOrder.isPriceLocked && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Price Locked
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <div className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold mb-4">Pre-Order Timeline</h2>
            <div className="flex items-center justify-between">
              {timelineSteps.map((step, index) => {
                const isComplete = index <= currentIndex;
                const isCurrent = index === currentIndex;
                const Icon = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center relative">
                    {index > 0 && (
                      <div
                        className={`absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                          index <= currentIndex ? 'bg-primary' : 'bg-muted'
                        }`}
                        style={{ width: 'calc(100% + 1rem)', right: '50%' }}
                      />
                    )}
                    <div
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                        isCurrent
                          ? 'border-primary bg-primary text-primary-foreground'
                          : isComplete
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted bg-background text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className={`mt-2 text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(step.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Product Details */}
          <div className="rounded-lg border">
            <div className="border-b p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Product Details
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Product</span>
                <span className="text-sm font-medium">{preOrder.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">SKU</span>
                <span className="text-sm font-mono">{preOrder.productSku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Quantity</span>
                <span className="text-sm">{preOrder.quantity}</span>
              </div>
              {preOrder.isPriceLocked && preOrder.priceLockPaise && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Locked Price</span>
                  <span className="text-sm font-semibold">{formatPaise(preOrder.priceLockPaise)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {preOrder.notes && (
            <div className="rounded-lg border p-4 space-y-2">
              <h2 className="text-sm font-semibold">Notes</h2>
              <p className="text-sm text-muted-foreground">{preOrder.notes}</p>
            </div>
          )}

          {/* Cancel Reason */}
          {preOrder.cancelReason && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-destructive">Cancellation Reason</h2>
              <p className="text-sm">{preOrder.cancelReason}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Customer
            </h2>
            <div className="space-y-1">
              <p className="text-sm font-medium">{preOrder.customerName}</p>
              <p className="text-xs text-muted-foreground">{preOrder.customerEmail}</p>
              <p className="text-xs text-muted-foreground">{preOrder.customerPhone}</p>
            </div>
          </div>

          {/* Deposit & Payment */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Deposit
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-semibold">{formatPaise(preOrder.depositPaise)}</span>
              </div>
              {preOrder.isPriceLocked && preOrder.priceLockPaise && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Remaining</span>
                  <span className="text-sm font-semibold">
                    {formatPaise(preOrder.priceLockPaise - preOrder.depositPaise)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Dates
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-xs">{new Date(preOrder.createdAt).toLocaleDateString()}</span>
              </div>
              {preOrder.estimatedAvailableDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Est. Available</span>
                  <span className="text-xs">{new Date(preOrder.estimatedAvailableDate).toLocaleDateString()}</span>
                </div>
              )}
              {preOrder.estimatedDeliveryDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Est. Delivery</span>
                  <span className="text-xs">{new Date(preOrder.estimatedDeliveryDate).toLocaleDateString()}</span>
                </div>
              )}
              {preOrder.actualAvailableDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Actual Available</span>
                  <span className="text-xs">{new Date(preOrder.actualAvailableDate).toLocaleDateString()}</span>
                </div>
              )}
              {preOrder.notifiedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Customer Notified</span>
                  <span className="text-xs">{new Date(preOrder.notifiedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fulfilled Order Link */}
          {preOrder.fulfilledOrderId && (
            <div className="rounded-lg border p-4 space-y-2">
              <h2 className="text-sm font-semibold">Fulfilled Order</h2>
              <a
                href={`/ecommerce/orders/${preOrder.fulfilledOrderId}`}
                className="text-sm text-primary hover:underline font-mono"
              >
                View Order
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
