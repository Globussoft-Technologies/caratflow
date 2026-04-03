'use client';

import * as React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface BomItemRow {
  id?: string;
  itemType: string;
  description: string;
  quantityRequired: number;
  unitOfMeasure: string;
  weightMg: number | null;
  estimatedCostPaise: number;
  wastagePercent: number;
  sortOrder: number;
}

interface BomBuilderProps {
  items: BomItemRow[];
  onChange: (items: BomItemRow[]) => void;
  readOnly?: boolean;
}

const ITEM_TYPES = ['METAL', 'STONE', 'FINDING', 'LABOR', 'OVERHEAD'] as const;
const UNIT_OPTIONS = ['mg', 'g', 'ct', 'pcs', 'hrs', 'lot'] as const;

export function BomBuilder({ items, onChange, readOnly = false }: BomBuilderProps) {
  const addItem = () => {
    onChange([
      ...items,
      {
        itemType: 'METAL',
        description: '',
        quantityRequired: 1,
        unitOfMeasure: 'g',
        weightMg: null,
        estimatedCostPaise: 0,
        wastagePercent: 0,
        sortOrder: items.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BomItemRow, value: unknown) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    onChange(updated);
  };

  const totalCost = items.reduce((sum, item) => sum + item.estimatedCostPaise, 0);

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8"></th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-20">Qty</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-20">Unit</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Weight (mg)</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Cost (paise)</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">Wastage %</th>
              {!readOnly && <th className="px-3 py-2 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 8 : 9} className="px-3 py-6 text-center text-muted-foreground">
                  No items yet. Click &quot;Add Item&quot; to start building the BOM.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="px-1 py-1.5 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="px-2 py-1.5">
                    {readOnly ? (
                      <span>{item.itemType}</span>
                    ) : (
                      <select
                        className="w-full rounded border bg-transparent px-1.5 py-1 text-sm"
                        value={item.itemType}
                        onChange={(e) => updateItem(index, 'itemType', e.target.value)}
                      >
                        {ITEM_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {readOnly ? (
                      <span>{item.description}</span>
                    ) : (
                      <input
                        className="w-full rounded border bg-transparent px-1.5 py-1 text-sm"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {readOnly ? (
                      <span>{item.quantityRequired}</span>
                    ) : (
                      <input
                        type="number"
                        className="w-full rounded border bg-transparent px-1.5 py-1 text-sm"
                        value={item.quantityRequired}
                        onChange={(e) => updateItem(index, 'quantityRequired', Number(e.target.value))}
                        min={0}
                        step={0.01}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {readOnly ? (
                      <span>{item.unitOfMeasure}</span>
                    ) : (
                      <select
                        className="w-full rounded border bg-transparent px-1.5 py-1 text-sm"
                        value={item.unitOfMeasure}
                        onChange={(e) => updateItem(index, 'unitOfMeasure', e.target.value)}
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {readOnly ? (
                      <span>{item.weightMg ?? '-'}</span>
                    ) : (
                      <input
                        type="number"
                        className="w-full rounded border bg-transparent px-1.5 py-1 text-sm"
                        value={item.weightMg ?? ''}
                        onChange={(e) => updateItem(index, 'weightMg', e.target.value ? Number(e.target.value) : null)}
                        min={0}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {readOnly ? (
                      <span>{(item.estimatedCostPaise / 100).toFixed(2)}</span>
                    ) : (
                      <input
                        type="number"
                        className="w-full rounded border bg-transparent px-1.5 py-1 text-sm"
                        value={item.estimatedCostPaise}
                        onChange={(e) => updateItem(index, 'estimatedCostPaise', Number(e.target.value))}
                        min={0}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {readOnly ? (
                      <span>{(item.wastagePercent / 100).toFixed(2)}%</span>
                    ) : (
                      <input
                        type="number"
                        className="w-full rounded border bg-transparent px-1.5 py-1 text-sm"
                        value={item.wastagePercent}
                        onChange={(e) => updateItem(index, 'wastagePercent', Number(e.target.value))}
                        min={0}
                        max={10000}
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td colSpan={6} className="px-3 py-2 text-right font-medium text-sm">
                Total Estimated Cost:
              </td>
              <td className="px-2 py-2 font-semibold text-sm">
                {(totalCost / 100).toFixed(2)}
              </td>
              <td colSpan={readOnly ? 1 : 2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {!readOnly && (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary"
          onClick={addItem}
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      )}
    </div>
  );
}
