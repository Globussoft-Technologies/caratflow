'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Edit, Trash2, GripVertical, HelpCircle } from 'lucide-react';
import { FaqEditor } from '@/features/cms';

// Mock data -- in production from tRPC: cms.faq.list
const mockFaqs = [
  { id: '1', question: 'What is the return policy for jewelry?', answer: 'We offer a 7-day return policy...', category: 'Returns', displayOrder: 1, isPublished: true },
  { id: '2', question: 'How do I verify hallmark?', answer: 'All our jewelry comes with BIS hallmark...', category: 'Authenticity', displayOrder: 2, isPublished: true },
  { id: '3', question: 'Do you offer EMI payments?', answer: 'Yes, we offer no-cost EMI on orders above Rs. 10,000...', category: 'Payments', displayOrder: 3, isPublished: true },
  { id: '4', question: 'What shipping options are available?', answer: 'We offer insured shipping across India...', category: 'Shipping', displayOrder: 4, isPublished: true },
  { id: '5', question: 'How to care for gold jewelry?', answer: 'Store in a soft pouch, avoid chemicals...', category: 'Care', displayOrder: 5, isPublished: true },
  { id: '6', question: 'Can I customize a design?', answer: 'Yes, we offer custom jewelry design...', category: 'Orders', displayOrder: 6, isPublished: false },
];

export default function FaqPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="FAQ Management"
        description="Manage frequently asked questions for your storefront."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CMS', href: '/cms' },
          { label: 'FAQ' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add FAQ
          </button>
        }
      />

      {showForm && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-4">Add FAQ</h3>
          <FaqEditor
            onSubmit={(data) => {
              console.log('Create FAQ:', data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* FAQ List -- Drag to reorder */}
      <div className="space-y-2">
        {mockFaqs.map((faq) => (
          <div
            key={faq.id}
            className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30"
          >
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm font-medium">{faq.question}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <StatusBadge
                    label={faq.isPublished ? 'Published' : 'Draft'}
                    variant={getStatusVariant(faq.isPublished ? 'ACTIVE' : 'PENDING')}
                    dot
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{faq.answer}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {faq.category}
                </span>
                <div className="flex items-center gap-1">
                  <button className="rounded p-1 transition-colors hover:bg-accent" title="Edit">
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button className="rounded p-1 transition-colors hover:bg-destructive/10" title="Delete">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
