"use client";

import { useState } from "react";
import type { Address } from "@/lib/types";
import { generateId } from "@/lib/utils";

interface AddressFormProps {
  address?: Address;
  onSave: (address: Address) => void;
  onCancel: () => void;
}

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Puducherry",
];

export default function AddressForm({ address, onSave, onCancel }: AddressFormProps) {
  const [form, setForm] = useState({
    label: address?.label ?? "",
    fullName: address?.fullName ?? "",
    phone: address?.phone ?? "",
    addressLine1: address?.addressLine1 ?? "",
    addressLine2: address?.addressLine2 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    pincode: address?.pincode ?? "",
    isDefault: address?.isDefault ?? false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: address?.id ?? generateId(),
      ...form,
      country: "India",
    });
  }

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-navy/60 mb-1">Label</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => updateField("label", e.target.value)}
            placeholder="Home, Office, etc."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-navy/60 mb-1">Full Name *</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-navy/60 mb-1">Phone *</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          required
          placeholder="+91 98765 43210"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-navy/60 mb-1">Address Line 1 *</label>
        <input
          type="text"
          value={form.addressLine1}
          onChange={(e) => updateField("addressLine1", e.target.value)}
          required
          placeholder="Flat/House No., Building"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-navy/60 mb-1">Address Line 2</label>
        <input
          type="text"
          value={form.addressLine2}
          onChange={(e) => updateField("addressLine2", e.target.value)}
          placeholder="Area, Street, Landmark"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-navy/60 mb-1">City *</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-navy/60 mb-1">State *</label>
          <select
            value={form.state}
            onChange={(e) => updateField("state", e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 bg-white"
          >
            <option value="">Select</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-navy/60 mb-1">Pincode *</label>
          <input
            type="text"
            value={form.pincode}
            onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            maxLength={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => updateField("isDefault", e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-gold accent-gold"
        />
        <span className="text-sm text-navy/70">Set as default address</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="px-6 py-2.5 bg-gold text-white text-sm font-semibold rounded-lg hover:bg-gold-dark transition-colors"
        >
          {address ? "Update Address" : "Save Address"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-gray-200 text-navy/60 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
