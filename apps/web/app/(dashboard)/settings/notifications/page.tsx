'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Save, MessageCircle, Mail, Smartphone } from 'lucide-react';

export default function NotificationSettingsPage() {
  const [config, setConfig] = useState({
    'notifications.whatsappApiKey': '',
    'notifications.whatsappPhoneId': '',
    'notifications.smsProvider': '',
    'notifications.smsApiKey': '',
    'notifications.smtpHost': '',
    'notifications.smtpPort': 587,
    'notifications.smtpUser': '',
    'notifications.smtpPassword': '',
    'notifications.fromEmail': '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Call trpc.platform.settings.set.mutate
      console.log('Saving notification config:', config);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Settings"
        description="Configure WhatsApp, SMS, and email notification providers."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Notifications' },
        ]}
      />

      {/* WhatsApp */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b p-6">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <div>
            <h2 className="text-lg font-semibold">WhatsApp Business API</h2>
            <p className="text-sm text-muted-foreground">Send order updates, reminders, and promotions via WhatsApp.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="wa-key">API Key</label>
            <input id="wa-key" type="password" value={config['notifications.whatsappApiKey']} onChange={(e) => setConfig({ ...config, 'notifications.whatsappApiKey': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="Enter API key" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="wa-phone">Phone Number ID</label>
            <input id="wa-phone" type="text" value={config['notifications.whatsappPhoneId']} onChange={(e) => setConfig({ ...config, 'notifications.whatsappPhoneId': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g., 1234567890" />
          </div>
        </div>
      </div>

      {/* SMS */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b p-6">
          <Smartphone className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold">SMS Provider</h2>
            <p className="text-sm text-muted-foreground">Send SMS notifications for orders and OTPs.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="sms-provider">Provider</label>
            <select id="sms-provider" value={config['notifications.smsProvider']} onChange={(e) => setConfig({ ...config, 'notifications.smsProvider': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
              <option value="">Select provider...</option>
              <option value="msg91">MSG91</option>
              <option value="twilio">Twilio</option>
              <option value="kaleyra">Kaleyra</option>
              <option value="textlocal">TextLocal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="sms-key">API Key</label>
            <input id="sms-key" type="password" value={config['notifications.smsApiKey']} onChange={(e) => setConfig({ ...config, 'notifications.smsApiKey': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Email SMTP */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b p-6">
          <Mail className="h-5 w-5 text-orange-600" />
          <div>
            <h2 className="text-lg font-semibold">Email (SMTP)</h2>
            <p className="text-sm text-muted-foreground">Send email notifications, invoices, and reports.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="smtp-host">SMTP Host</label>
            <input id="smtp-host" type="text" value={config['notifications.smtpHost']} onChange={(e) => setConfig({ ...config, 'notifications.smtpHost': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="smtp-port">SMTP Port</label>
            <input id="smtp-port" type="number" value={config['notifications.smtpPort']} onChange={(e) => setConfig({ ...config, 'notifications.smtpPort': Number(e.target.value) })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="smtp-user">Username</label>
            <input id="smtp-user" type="text" value={config['notifications.smtpUser']} onChange={(e) => setConfig({ ...config, 'notifications.smtpUser': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="smtp-pass">Password</label>
            <input id="smtp-pass" type="password" value={config['notifications.smtpPassword']} onChange={(e) => setConfig({ ...config, 'notifications.smtpPassword': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium" htmlFor="from-email">From Email</label>
            <input id="from-email" type="email" value={config['notifications.fromEmail']} onChange={(e) => setConfig({ ...config, 'notifications.fromEmail': e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm md:w-1/2" placeholder="noreply@sharmajewellers.com" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Notification Settings'}
        </button>
      </div>
    </div>
  );
}
