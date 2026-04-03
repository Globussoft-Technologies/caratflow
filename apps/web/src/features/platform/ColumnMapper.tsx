'use client';

import { ArrowRight } from 'lucide-react';

interface ColumnMapperProps {
  sourceHeaders: string[];
  entityType: string;
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

/** Target fields per entity type. */
const ENTITY_FIELDS: Record<string, Array<{ value: string; label: string; required?: boolean }>> = {
  customer: [
    { value: 'firstName', label: 'First Name', required: true },
    { value: 'lastName', label: 'Last Name', required: true },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'alternatePhone', label: 'Alternate Phone' },
    { value: 'address', label: 'Address' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'country', label: 'Country' },
    { value: 'postalCode', label: 'Postal Code' },
    { value: 'customerType', label: 'Customer Type' },
    { value: 'panNumber', label: 'PAN Number' },
    { value: 'gstinNumber', label: 'GSTIN' },
    { value: 'notes', label: 'Notes' },
  ],
  product: [
    { value: 'sku', label: 'SKU', required: true },
    { value: 'name', label: 'Product Name', required: true },
    { value: 'productType', label: 'Product Type', required: true },
    { value: 'description', label: 'Description' },
    { value: 'metalPurity', label: 'Metal Purity' },
    { value: 'metalWeightMg', label: 'Metal Weight (mg)' },
    { value: 'grossWeightMg', label: 'Gross Weight (mg)' },
    { value: 'netWeightMg', label: 'Net Weight (mg)' },
    { value: 'stoneWeightCt', label: 'Stone Weight (ct)' },
    { value: 'huidNumber', label: 'HUID Number' },
    { value: 'hallmarkNumber', label: 'Hallmark Number' },
    { value: 'costPricePaise', label: 'Cost Price (paise)' },
    { value: 'sellingPricePaise', label: 'Selling Price (paise)' },
    { value: 'currencyCode', label: 'Currency' },
  ],
  supplier: [
    { value: 'name', label: 'Supplier Name', required: true },
    { value: 'contactPerson', label: 'Contact Person' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'address', label: 'Address' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'country', label: 'Country' },
    { value: 'postalCode', label: 'Postal Code' },
    { value: 'gstinNumber', label: 'GSTIN' },
    { value: 'panNumber', label: 'PAN Number' },
    { value: 'supplierType', label: 'Supplier Type' },
  ],
};

/**
 * ColumnMapper: Maps CSV columns to entity fields via dropdowns.
 * Shows source column names on the left, target field selector on the right.
 */
export function ColumnMapper({ sourceHeaders, entityType, mapping, onMappingChange }: ColumnMapperProps) {
  const targetFields = ENTITY_FIELDS[entityType] ?? [];

  const handleFieldChange = (sourceHeader: string, targetField: string) => {
    const newMapping = { ...mapping };
    if (targetField) {
      newMapping[sourceHeader] = targetField;
    } else {
      delete newMapping[sourceHeader];
    }
    onMappingChange(newMapping);
  };

  // Auto-map function: try to match source headers to target fields by name similarity
  const autoMap = () => {
    const newMapping: Record<string, string> = {};
    for (const header of sourceHeaders) {
      const normalized = header.toLowerCase().replace(/[\s_-]/g, '');
      const match = targetFields.find((f) => {
        const fieldNorm = f.value.toLowerCase();
        const labelNorm = f.label.toLowerCase().replace(/[\s_-]/g, '');
        return normalized === fieldNorm || normalized === labelNorm || normalized.includes(fieldNorm);
      });
      if (match) {
        newMapping[header] = match.value;
      }
    }
    onMappingChange(newMapping);
  };

  // Get used target fields to prevent duplicate mapping
  const usedTargets = new Set(Object.values(mapping));

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={autoMap}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Auto-Map Columns
        </button>
      </div>

      <div className="space-y-2">
        {sourceHeaders.map((header) => (
          <div key={header} className="flex items-center gap-3">
            <div className="w-1/3 truncate rounded bg-muted px-3 py-2 text-sm font-mono">
              {header}
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <select
              value={mapping[header] ?? ''}
              onChange={(e) => handleFieldChange(header, e.target.value)}
              className="w-1/3 rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Skip this column</option>
              {targetFields.map((field) => (
                <option
                  key={field.value}
                  value={field.value}
                  disabled={usedTargets.has(field.value) && mapping[header] !== field.value}
                >
                  {field.label}
                  {field.required ? ' *' : ''}
                </option>
              ))}
            </select>
            {mapping[header] && (
              <span className="text-xs text-green-600">Mapped</span>
            )}
          </div>
        ))}
      </div>

      {/* Required fields warning */}
      {(() => {
        const mapped = new Set(Object.values(mapping));
        const missing = targetFields.filter((f) => f.required && !mapped.has(f.value));
        if (missing.length === 0) return null;
        return (
          <div className="mt-3 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
            Required fields not mapped: {missing.map((f) => f.label).join(', ')}
          </div>
        );
      })()}
    </div>
  );
}
