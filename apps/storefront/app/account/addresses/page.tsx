"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AddressDto {
  id: string;
  label?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  country?: string;
  postalCode: string;
  isDefault?: boolean;
}

const EMPTY: Omit<AddressDto, "id"> = {
  label: "Home",
  firstName: "",
  lastName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "IN",
  postalCode: "",
  isDefault: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<AddressDto[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AddressDto | null>(null);
  const [form, setForm] = useState<Omit<AddressDto, "id">>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    try {
      const data = await apiFetch<AddressDto[] | { items?: AddressDto[] }>("/api/v1/store/addresses", {
        tenantHeaders: true,
      });
      const items = Array.isArray(data) ? data : data.items ?? [];
      setAddresses(items);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        if (typeof window !== "undefined") window.location.href = "/auth/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load addresses");
      setAddresses([]);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(addr: AddressDto) {
    setEditing(addr);
    setForm({
      label: addr.label ?? "Home",
      firstName: addr.firstName ?? addr.fullName?.split(" ")[0] ?? "",
      lastName: addr.lastName ?? addr.fullName?.split(" ").slice(1).join(" ") ?? "",
      phone: addr.phone ?? "",
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 ?? "",
      city: addr.city,
      state: addr.state,
      country: addr.country ?? "IN",
      postalCode: addr.postalCode,
      isDefault: addr.isDefault ?? false,
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/v1/store/addresses/${editing.id}`, {
          method: "PUT",
          tenantHeaders: true,
          body: form,
        });
      } else {
        await apiFetch("/api/v1/store/addresses", {
          method: "POST",
          tenantHeaders: true,
          body: form,
        });
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save address");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    try {
      await apiFetch(`/api/v1/store/addresses/${id}`, {
        method: "DELETE",
        tenantHeaders: true,
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete address");
    }
  }

  if (addresses === null) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>My Addresses</h1>
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-navy/50 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>My Addresses</h1>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold text-white text-sm font-medium rounded-lg hover:bg-gold-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Address
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-navy mb-4">{editing ? "Edit Address" : "New Address"}</h2>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{formError}</div>
          )}
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Label" value={form.label ?? ""} onChange={(v) => setForm({ ...form, label: v })} />
              <Field label="Phone" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} required />
              <Field label="First Name" value={form.firstName ?? ""} onChange={(v) => setForm({ ...form, firstName: v })} required />
              <Field label="Last Name" value={form.lastName ?? ""} onChange={(v) => setForm({ ...form, lastName: v })} required />
              <Field label="Address Line 1" value={form.addressLine1} onChange={(v) => setForm({ ...form, addressLine1: v })} required />
              <Field label="Address Line 2" value={form.addressLine2 ?? ""} onChange={(v) => setForm({ ...form, addressLine2: v })} />
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
              <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} required />
              <Field label="Country" value={form.country ?? "IN"} onChange={(v) => setForm({ ...form, country: v })} required />
              <Field label="Postal Code" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} required />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isDefault ?? false}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="accent-gold"
              />
              <span className="text-sm text-navy/70">Set as default address</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-navy/60 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-gold text-white text-sm font-semibold rounded-lg hover:bg-gold-dark disabled:opacity-60">
                {saving ? "Saving..." : "Save Address"}
              </button>
            </div>
          </form>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-navy/40 mb-2">No saved addresses</p>
          <p className="text-sm text-navy/30">Add a delivery address to make checkout faster</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => {
            const fullName = addr.fullName ?? `${addr.firstName ?? ""} ${addr.lastName ?? ""}`.trim();
            return (
              <div key={addr.id} className={cn("bg-white rounded-xl border p-5", addr.isDefault ? "border-gold/30" : "border-gray-100")}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-sm text-navy">{addr.label || "Address"}</h3>
                  {addr.isDefault && (
                    <span className="px-2 py-0.5 bg-gold/10 text-gold-dark text-[10px] font-medium rounded">Default</span>
                  )}
                </div>
                <p className="text-sm text-navy/70">{fullName}</p>
                <p className="text-sm text-navy/60 mt-1">
                  {addr.addressLine1}
                  {addr.addressLine2 && `, ${addr.addressLine2}`}
                </p>
                <p className="text-sm text-navy/60">{addr.city}, {addr.state} - {addr.postalCode}</p>
                {addr.phone && <p className="text-xs text-navy/40 mt-1">{addr.phone}</p>}
                <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => openEdit(addr)}
                    className="text-xs text-gold hover:text-gold-dark font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    className="text-xs text-rose-500/60 hover:text-rose-500 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-navy/60 mb-1">{label}{required && " *"}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
      />
    </div>
  );
}
