'use client';

import { useState } from 'react';
import { StatusBadge } from '@caratflow/ui';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';

interface CampaignWizardProps {
  templates: Array<{ id: string; name: string; channel: string }>;
  onSubmit: (data: {
    name: string;
    description: string;
    channel: string;
    templateId: string;
    audienceFilter: Record<string, unknown>;
    scheduledAt: string | null;
  }) => void;
  onCancel: () => void;
}

type Step = 'details' | 'audience' | 'template' | 'review';
const STEPS: Step[] = ['details', 'audience', 'template', 'review'];
const STEP_LABELS: Record<Step, string> = {
  details: 'Campaign Details',
  audience: 'Select Audience',
  template: 'Choose Template',
  review: 'Review & Send',
};

export function CampaignWizard({ templates, onSubmit, onCancel }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channel: 'WHATSAPP',
    templateId: '',
    customerType: [] as string[],
    city: [] as string[],
    scheduledAt: '',
  });

  const stepIndex = STEPS.indexOf(currentStep);
  const canNext = stepIndex < STEPS.length - 1;
  const canPrev = stepIndex > 0;

  const goNext = () => {
    if (canNext) setCurrentStep(STEPS[stepIndex + 1]!);
  };
  const goPrev = () => {
    if (canPrev) setCurrentStep(STEPS[stepIndex - 1]!);
  };

  const handleSubmit = () => {
    onSubmit({
      name: formData.name,
      description: formData.description,
      channel: formData.channel,
      templateId: formData.templateId,
      audienceFilter: {
        customerType: formData.customerType.length > 0 ? formData.customerType : undefined,
        city: formData.city.length > 0 ? formData.city : undefined,
      },
      scheduledAt: formData.scheduledAt || null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex gap-2">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex-1 rounded-full h-1.5 ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
      <h3 className="text-lg font-semibold">{STEP_LABELS[currentStep]}</h3>

      {/* Step Content */}
      {currentStep === 'details' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Campaign Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="e.g., Diwali Gold Offer"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
              placeholder="Campaign description..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Channel</label>
            <select
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>
        </div>
      )}

      {currentStep === 'audience' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Customer Type</label>
            <div className="mt-2 flex gap-2">
              {['RETAIL', 'WHOLESALE', 'CORPORATE'].map((type) => (
                <label key={type} className="inline-flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.customerType.includes(type)}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        customerType: e.target.checked
                          ? [...formData.customerType, type]
                          : formData.customerType.filter((t) => t !== type),
                      });
                    }}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Schedule</label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">Leave empty to save as draft</p>
          </div>
        </div>
      )}

      {currentStep === 'template' && (
        <div className="space-y-3">
          {templates
            .filter((t) => t.channel === formData.channel)
            .map((t) => (
              <label
                key={t.id}
                className={`block rounded-lg border p-4 cursor-pointer transition-colors ${
                  formData.templateId === t.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={formData.templateId === t.id}
                  onChange={() => setFormData({ ...formData, templateId: t.id })}
                  className="sr-only"
                />
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  <StatusBadge label={t.channel} variant="muted" dot={false} />
                </div>
              </label>
            ))}
        </div>
      )}

      {currentStep === 'review' && (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{formData.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Channel</span>
            <StatusBadge label={formData.channel} variant="muted" dot={false} />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Template</span>
            <span>{templates.find((t) => t.id === formData.templateId)?.name ?? 'None selected'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Audience</span>
            <span>{formData.customerType.length > 0 ? formData.customerType.join(', ') : 'All customers'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Schedule</span>
            <span>{formData.scheduledAt || 'Draft (manual send)'}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <div>
          {canPrev ? (
            <button onClick={goPrev} className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <button onClick={onCancel} className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent">
              Cancel
            </button>
          )}
        </div>
        <div>
          {canNext ? (
            <button onClick={goNext} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Send className="h-4 w-4" /> Create Campaign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
