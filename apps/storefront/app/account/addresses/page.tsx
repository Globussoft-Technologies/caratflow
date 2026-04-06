"use client";

import { useState } from "react";
import { mockAddresses } from "@/lib/mock-data";
import AddressForm from "@/components/AddressForm";
import type { Address } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>(mockAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | undefined>();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>My Addresses</h1>
        <button
          type="button"
          onClick={() => { setEditingAddress(undefined); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold text-white text-sm font-medium rounded-lg hover:bg-gold-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Address
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-navy mb-4">{editingAddress ? "Edit Address" : "New Address"}</h2>
          <AddressForm
            address={editingAddress}
            onSave={(addr) => {
              if (editingAddress) {
                setAddresses((prev) => prev.map((a) => a.id === addr.id ? addr : a));
              } else {
                setAddresses((prev) => [...prev, addr]);
              }
              setShowForm(false);
              setEditingAddress(undefined);
            }}
            onCancel={() => { setShowForm(false); setEditingAddress(undefined); }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <div key={addr.id} className={cn("bg-white rounded-xl border p-5", addr.isDefault ? "border-gold/30" : "border-gray-100")}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-sm text-navy">{addr.label || "Address"}</h3>
              {addr.isDefault && (
                <span className="px-2 py-0.5 bg-gold/10 text-gold-dark text-[10px] font-medium rounded">Default</span>
              )}
            </div>
            <p className="text-sm text-navy/70">{addr.fullName}</p>
            <p className="text-sm text-navy/60 mt-1">
              {addr.addressLine1}
              {addr.addressLine2 && `, ${addr.addressLine2}`}
            </p>
            <p className="text-sm text-navy/60">{addr.city}, {addr.state} - {addr.pincode}</p>
            <p className="text-xs text-navy/40 mt-1">{addr.phone}</p>
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50">
              <button
                type="button"
                onClick={() => { setEditingAddress(addr); setShowForm(true); }}
                className="text-xs text-gold hover:text-gold-dark font-medium transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setAddresses((prev) => prev.filter((a) => a.id !== addr.id))}
                className="text-xs text-rose-500/60 hover:text-rose-500 font-medium transition-colors"
              >
                Delete
              </button>
              {!addr.isDefault && (
                <button
                  type="button"
                  onClick={() => setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === addr.id })))}
                  className="text-xs text-navy/40 hover:text-navy font-medium transition-colors"
                >
                  Set as Default
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
