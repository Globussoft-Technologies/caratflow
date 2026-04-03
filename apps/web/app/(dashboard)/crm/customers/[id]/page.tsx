'use client';

import { PageHeader, StatusBadge } from '@caratflow/ui';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Gift,
  Star,
  CalendarDays,
  MessageSquare,
  ShoppingBag,
  CreditCard,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

// Placeholder data for Customer 360 view
const customer360 = {
  profile: {
    id: '1',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya@example.com',
    phone: '+919876543210',
    alternatePhone: null,
    address: '123 MG Road, Dadar',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'IN',
    postalCode: '400014',
    customerType: 'RETAIL',
    panNumber: 'ABCPS1234D',
    aadhaarNumber: null,
    gstinNumber: null,
    dateOfBirth: new Date('1990-06-15'),
    anniversary: new Date('2018-11-22'),
    createdAt: new Date('2023-03-12'),
  },
  loyalty: {
    currentPoints: 2500,
    tier: 'GOLD',
    lifetimeEarned: 12400,
    lifetimeRedeemed: 9900,
    recentTransactions: [
      { id: 't1', transactionType: 'EARNED', points: 250, balanceAfter: 2500, description: 'Points earned from sale', createdAt: new Date(Date.now() - 2 * 86400000) },
      { id: 't2', transactionType: 'REDEEMED', points: -500, balanceAfter: 2250, description: 'Redeemed at POS', createdAt: new Date(Date.now() - 7 * 86400000) },
      { id: 't3', transactionType: 'EARNED', points: 180, balanceAfter: 2750, description: 'Points earned from sale', createdAt: new Date(Date.now() - 15 * 86400000) },
    ],
  },
  purchaseHistory: [
    { id: 'p1', invoiceNumber: 'INV-2024-001', totalPaise: 4523000, date: new Date(Date.now() - 2 * 86400000), itemCount: 3 },
    { id: 'p2', invoiceNumber: 'INV-2024-002', totalPaise: 1875000, date: new Date(Date.now() - 30 * 86400000), itemCount: 1 },
    { id: 'p3', invoiceNumber: 'INV-2023-089', totalPaise: 8900000, date: new Date(Date.now() - 90 * 86400000), itemCount: 5 },
  ],
  occasions: [
    { id: 'o1', occasionType: 'BIRTHDAY', date: new Date('2026-06-15'), description: null, reminderDaysBefore: 7 },
    { id: 'o2', occasionType: 'ANNIVERSARY', date: new Date('2026-11-22'), description: 'Wedding anniversary', reminderDaysBefore: 14 },
  ],
  recentInteractions: [
    { id: 'i1', interactionType: 'VISIT', direction: 'INBOUND', subject: 'Showroom visit - browsed necklaces', createdAt: new Date(Date.now() - 86400000) },
    { id: 'i2', interactionType: 'WHATSAPP', direction: 'OUTBOUND', subject: 'New collection notification', createdAt: new Date(Date.now() - 5 * 86400000) },
    { id: 'i3', interactionType: 'CALL', direction: 'OUTBOUND', subject: 'Follow-up on custom order', createdAt: new Date(Date.now() - 10 * 86400000) },
  ],
  feedback: [
    { id: 'f1', feedbackType: 'PURCHASE', rating: 5, comment: 'Loved the necklace! Excellent quality.', status: 'REVIEWED', createdAt: new Date(Date.now() - 5 * 86400000) },
    { id: 'f2', feedbackType: 'SERVICE', rating: 4, comment: 'Good cleaning service for old jewelry.', status: 'NEW', createdAt: new Date(Date.now() - 30 * 86400000) },
  ],
  schemes: [
    { id: 's1', type: 'GOLD_SAVINGS', schemeName: 'Monthly Gold Savings', currentBalancePaise: 5000000, currentPoints: null },
  ],
};

type TabKey = 'purchases' | 'loyalty' | 'occasions' | 'interactions' | 'feedback' | 'schemes';

function FeedbackStarsInline({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </span>
  );
}

function formatMoney(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default function Customer360Page() {
  const [activeTab, setActiveTab] = useState<TabKey>('purchases');
  const c = customer360;

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode; count?: number }> = [
    { key: 'purchases', label: 'Purchases', icon: <ShoppingBag className="h-4 w-4" />, count: c.purchaseHistory.length },
    { key: 'loyalty', label: 'Loyalty', icon: <Gift className="h-4 w-4" /> },
    { key: 'occasions', label: 'Occasions', icon: <CalendarDays className="h-4 w-4" />, count: c.occasions.length },
    { key: 'interactions', label: 'Interactions', icon: <MessageSquare className="h-4 w-4" />, count: c.recentInteractions.length },
    { key: 'feedback', label: 'Feedback', icon: <Star className="h-4 w-4" />, count: c.feedback.length },
    { key: 'schemes', label: 'Schemes', icon: <CreditCard className="h-4 w-4" />, count: c.schemes.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${c.profile.firstName} ${c.profile.lastName}`}
        description="Customer 360 view"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Customers', href: '/crm/customers' },
          { label: `${c.profile.firstName} ${c.profile.lastName}` },
        ]}
      />

      {/* Profile Card + Loyalty Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-lg border bg-card p-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{c.profile.firstName} {c.profile.lastName}</h2>
                <StatusBadge label={c.profile.customerType} variant="info" />
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {c.profile.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> {c.profile.phone}
                  </div>
                )}
                {c.profile.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /> {c.profile.email}
                  </div>
                )}
                {c.profile.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {c.profile.city}, {c.profile.state}
                  </div>
                )}
                {c.profile.dateOfBirth && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" /> DOB: {c.profile.dateOfBirth.toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
              {c.profile.panNumber && (
                <div className="mt-2 text-xs text-muted-foreground">
                  PAN: {c.profile.panNumber}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loyalty Card */}
        <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-amber-100 p-6 dark:from-amber-950 dark:to-amber-900">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Loyalty</h3>
            {c.loyalty.tier && (
              <StatusBadge label={c.loyalty.tier} variant="warning" />
            )}
          </div>
          <p className="mt-3 text-3xl font-bold">{c.loyalty.currentPoints.toLocaleString('en-IN')}</p>
          <p className="text-sm text-muted-foreground">Available Points</p>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lifetime Earned</span>
              <span>{c.loyalty.lifetimeEarned.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lifetime Redeemed</span>
              <span>{c.loyalty.lifetimeRedeemed.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 border-b-2 pb-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'purchases' && (
          <div className="space-y-3">
            {c.purchaseHistory.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{p.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.date.toLocaleDateString('en-IN')} -- {p.itemCount} item(s)
                  </p>
                </div>
                <p className="text-lg font-bold">{formatMoney(p.totalPaise)}</p>
              </div>
            ))}
            {c.purchaseHistory.length === 0 && (
              <p className="text-sm text-muted-foreground">No purchase history yet.</p>
            )}
          </div>
        )}

        {activeTab === 'loyalty' && (
          <div className="space-y-3">
            <h4 className="font-medium">Recent Transactions</h4>
            {c.loyalty.recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      label={t.transactionType}
                      variant={t.transactionType === 'EARNED' ? 'success' : t.transactionType === 'REDEEMED' ? 'warning' : 'muted'}
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{t.createdAt.toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${t.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.points > 0 ? '+' : ''}{t.points.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-muted-foreground">Bal: {t.balanceAfter.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'occasions' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-sm hover:bg-accent">
                <Plus className="h-3.5 w-3.5" /> Add Occasion
              </button>
            </div>
            {c.occasions.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{o.occasionType.replace('_', ' ')}</p>
                  <p className="text-sm text-muted-foreground">{o.date.toLocaleDateString('en-IN')}</p>
                  {o.description && <p className="text-sm text-muted-foreground">{o.description}</p>}
                </div>
                <StatusBadge label={`Remind ${o.reminderDaysBefore}d before`} variant="info" dot={false} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'interactions' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-sm hover:bg-accent">
                <Plus className="h-3.5 w-3.5" /> Log Interaction
              </button>
            </div>
            {c.recentInteractions.map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-lg border p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge label={i.interactionType} variant="default" dot={false} />
                    <StatusBadge
                      label={i.direction}
                      variant={i.direction === 'INBOUND' ? 'info' : 'muted'}
                      dot={false}
                    />
                  </div>
                  <p className="mt-1 text-sm">{i.subject}</p>
                  <p className="text-xs text-muted-foreground">{i.createdAt.toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-3">
            {c.feedback.map((f) => (
              <div key={f.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge label={f.feedbackType} variant="default" dot={false} />
                    <FeedbackStarsInline rating={f.rating} />
                  </div>
                  <StatusBadge label={f.status} variant={getStatusVariant(f.status)} />
                </div>
                {f.comment && <p className="mt-2 text-sm">{f.comment}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{f.createdAt.toLocaleDateString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'schemes' && (
          <div className="space-y-3">
            {c.schemes.map((s) => (
              <div key={s.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.schemeName}</p>
                    <StatusBadge label={s.type.replace('_', ' ')} variant="info" dot={false} />
                  </div>
                  <div className="text-right">
                    {s.currentBalancePaise !== null && (
                      <p className="text-lg font-bold">{formatMoney(s.currentBalancePaise)}</p>
                    )}
                    {s.currentPoints !== null && (
                      <p className="text-lg font-bold">{s.currentPoints.toLocaleString('en-IN')} pts</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {c.schemes.length === 0 && (
              <p className="text-sm text-muted-foreground">No active schemes.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
