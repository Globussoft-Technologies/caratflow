'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Package, CreditCard, MapPin, Truck, X, RotateCcw } from 'lucide-react';
import { OrderTimeline, ChannelBadge, PaymentStatusBadge, ShipmentTracker } from '@/features/ecommerce';

// Mock data -- in production from tRPC: ecommerce.getOrder
const order = {
  id: '1',
  orderNumber: 'ON/SHO/2604/0028',
  channelType: 'SHOPIFY',
  externalOrderId: 'SH-1234567890',
  customerName: 'Meera Joshi',
  customerEmail: 'meera@example.com',
  customerPhone: '+91 98765 43210',
  status: 'CONFIRMED',
  subtotalPaise: 120000_00,
  shippingPaise: 5000_00,
  taxPaise: 3750_00,
  discountPaise: 0,
  totalPaise: 128750_00,
  currencyCode: 'INR',
  shippingAddress: {
    name: 'Meera Joshi',
    line1: '123, Marine Drive',
    line2: 'Apt 4B',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'IN',
    postalCode: '400002',
    phone: '+91 98765 43210',
  },
  billingAddress: {
    name: 'Meera Joshi',
    line1: '123, Marine Drive',
    line2: 'Apt 4B',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'IN',
    postalCode: '400002',
  },
  notes: null,
  cancelReason: null,
  placedAt: '2026-04-04T11:00:00Z',
  confirmedAt: '2026-04-04T11:05:00Z',
  shippedAt: null,
  deliveredAt: null,
  items: [
    { id: 'li1', title: '22K Gold Necklace Set', quantity: 1, unitPricePaise: 95000_00, totalPaise: 95000_00, sku: 'GN-22K-001', weightMg: 15000 },
    { id: 'li2', title: 'Pearl Drop Earrings', quantity: 1, unitPricePaise: 25000_00, totalPaise: 25000_00, sku: 'PE-18K-003', weightMg: 5000 },
  ],
  payment: { id: 'pay1', method: 'card', amountPaise: 128750_00, status: 'CAPTURED', externalPaymentId: 'pay_AbCdEfGhIj' },
  shipments: [
    { id: 'sh1', shipmentNumber: 'SH/2604/0012', carrier: 'Bluedart', trackingNumber: 'BD123456789', status: 'LABEL_CREATED', estimatedDeliveryDate: '2026-04-08' },
  ],
};

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

export default function OrderDetailPage() {
  const addr = order.shippingAddress;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed on ${new Date(order.placedAt).toLocaleString()}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Orders', href: '/ecommerce/orders' },
          { label: order.orderNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {order.status === 'CONFIRMED' && (
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                <Truck className="h-4 w-4" />
                Ship Order
              </button>
            )}
            {['PENDING', 'CONFIRMED'].includes(order.status) && (
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                <X className="h-4 w-4" />
                Cancel
              </button>
            )}
            {order.status === 'DELIVERED' && (
              <button className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent">
                <RotateCcw className="h-4 w-4" />
                Refund
              </button>
            )}
          </div>
        }
      />

      {/* Status + Channel */}
      <div className="flex items-center gap-3">
        <StatusBadge
          label={order.status.replace('_', ' ')}
          variant={getStatusVariant(order.status)}
          dot
        />
        <ChannelBadge channelType={order.channelType} />
        {order.externalOrderId && (
          <span className="text-xs text-muted-foreground font-mono">Ext: {order.externalOrderId}</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border">
            <div className="border-b p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Order Items ({order.items.length})
              </h2>
            </div>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.sku} | Qty: {item.quantity}
                      {item.weightMg ? ` | ${(item.weightMg / 1000).toFixed(2)}g` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatPaise(item.totalPaise)}</p>
                    <p className="text-xs text-muted-foreground">{formatPaise(item.unitPricePaise)} each</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPaise(order.subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatPaise(order.shippingPaise)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPaise(order.taxPaise)}</span>
              </div>
              {order.discountPaise > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-600">-{formatPaise(order.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                <span>Total</span>
                <span>{formatPaise(order.totalPaise)}</span>
              </div>
            </div>
          </div>

          {/* Shipment Tracking */}
          {order.shipments.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Shipment Tracking
              </h2>
              {order.shipments.map((sh) => (
                <ShipmentTracker
                  key={sh.id}
                  shipmentNumber={sh.shipmentNumber}
                  carrier={sh.carrier}
                  trackingNumber={sh.trackingNumber}
                  status={sh.status}
                  estimatedDeliveryDate={sh.estimatedDeliveryDate}
                />
              ))}
            </div>
          )}

          {/* Order Timeline */}
          <div className="rounded-lg border p-4">
            <OrderTimeline
              placedAt={order.placedAt}
              confirmedAt={order.confirmedAt}
              shippedAt={order.shippedAt}
              deliveredAt={order.deliveredAt}
              cancelledAt={null}
              status={order.status}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold">Customer</h2>
            <div className="space-y-1">
              <p className="text-sm font-medium">{order.customerName}</p>
              <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
              <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Shipping Address
            </h2>
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>{addr.name}</p>
              <p>{addr.line1}</p>
              {addr.line2 && <p>{addr.line2}</p>}
              <p>{addr.city}, {addr.state} {addr.postalCode}</p>
              <p>{addr.country}</p>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Payment
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Method</span>
                <span className="text-sm capitalize">{order.payment.method}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-semibold">{formatPaise(order.payment.amountPaise)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <PaymentStatusBadge status={order.payment.status} />
              </div>
              {order.payment.externalPaymentId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reference</span>
                  <span className="text-xs font-mono">{order.payment.externalPaymentId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
