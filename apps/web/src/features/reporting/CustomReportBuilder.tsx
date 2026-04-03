'use client';

import * as React from 'react';
import { Plus, Trash2, Play, Save } from 'lucide-react';
import type {
  SupportedEntity,
  CustomReportFilter,
  CustomReportAggregation,
  AggregationType,
} from '@caratflow/shared-types';

interface CustomReportBuilderProps {
  entities: SupportedEntity[];
  onExecute: (config: {
    entityType: string;
    columns: string[];
    filters: CustomReportFilter[];
    groupBy: string[];
    aggregations: CustomReportAggregation[];
  }) => void;
  onSave?: (config: {
    entityType: string;
    columns: string[];
    filters: CustomReportFilter[];
    groupBy: string[];
    aggregations: CustomReportAggregation[];
  }) => void;
  loading?: boolean;
}

const OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'like', label: 'Contains' },
  { value: 'isNull', label: 'Is Empty' },
  { value: 'isNotNull', label: 'Is Not Empty' },
] as const;

const AGG_FUNCTIONS: Array<{ value: AggregationType; label: string }> = [
  { value: 'COUNT' as AggregationType, label: 'Count' },
  { value: 'SUM' as AggregationType, label: 'Sum' },
  { value: 'AVG' as AggregationType, label: 'Average' },
  { value: 'MIN' as AggregationType, label: 'Min' },
  { value: 'MAX' as AggregationType, label: 'Max' },
];

export function CustomReportBuilder({
  entities,
  onExecute,
  onSave,
  loading = false,
}: CustomReportBuilderProps) {
  const [selectedEntity, setSelectedEntity] = React.useState(entities[0]?.name ?? '');
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>([]);
  const [filters, setFilters] = React.useState<CustomReportFilter[]>([]);
  const [groupBy, setGroupBy] = React.useState<string[]>([]);
  const [aggregations, setAggregations] = React.useState<CustomReportAggregation[]>([]);

  const entity = entities.find((e) => e.name === selectedEntity);
  const fields = entity?.fields ?? [];

  const handleEntityChange = (name: string) => {
    setSelectedEntity(name);
    setSelectedColumns([]);
    setFilters([]);
    setGroupBy([]);
    setAggregations([]);
  };

  const toggleColumn = (fieldName: string) => {
    setSelectedColumns((prev) =>
      prev.includes(fieldName)
        ? prev.filter((c) => c !== fieldName)
        : [...prev, fieldName],
    );
  };

  const addFilter = () => {
    const firstFilterable = fields.find((f) => f.filterable);
    if (firstFilterable) {
      setFilters([
        ...filters,
        { field: firstFilterable.name, operator: 'eq', value: '' },
      ]);
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<CustomReportFilter>) => {
    setFilters(
      filters.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    );
  };

  const addAggregation = () => {
    const firstAggregatable = fields.find((f) => f.aggregatable);
    if (firstAggregatable) {
      setAggregations([
        ...aggregations,
        { field: firstAggregatable.name, function: 'SUM' as AggregationType },
      ]);
    }
  };

  const removeAggregation = (index: number) => {
    setAggregations(aggregations.filter((_, i) => i !== index));
  };

  const config = {
    entityType: selectedEntity,
    columns: selectedColumns,
    filters,
    groupBy,
    aggregations,
  };

  return (
    <div className="space-y-6">
      {/* Entity Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Data Source</label>
        <select
          value={selectedEntity}
          onChange={(e) => handleEntityChange(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm bg-background"
        >
          {entities.map((e) => (
            <option key={e.name} value={e.name}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {/* Column Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Columns</label>
        <div className="flex flex-wrap gap-2">
          {fields.map((field) => (
            <button
              key={field.name}
              onClick={() => toggleColumn(field.name)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                selectedColumns.includes(field.name)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-accent'
              }`}
            >
              {field.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Filters</label>
          <button
            onClick={addFilter}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3 w-3" /> Add Filter
          </button>
        </div>
        {filters.map((filter, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              value={filter.field}
              onChange={(e) => updateFilter(idx, { field: e.target.value })}
              className="rounded-md border px-2 py-1.5 text-sm bg-background flex-1"
            >
              {fields
                .filter((f) => f.filterable)
                .map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label}
                  </option>
                ))}
            </select>
            <select
              value={filter.operator}
              onChange={(e) =>
                updateFilter(idx, { operator: e.target.value as CustomReportFilter['operator'] })
              }
              className="rounded-md border px-2 py-1.5 text-sm bg-background w-32"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            {!['isNull', 'isNotNull'].includes(filter.operator) && (
              <input
                type="text"
                value={String(filter.value ?? '')}
                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                placeholder="Value..."
                className="rounded-md border px-2 py-1.5 text-sm bg-background flex-1"
              />
            )}
            <button
              onClick={() => removeFilter(idx)}
              className="p-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Group By */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Group By</label>
        <div className="flex flex-wrap gap-2">
          {fields.map((field) => (
            <button
              key={field.name}
              onClick={() =>
                setGroupBy((prev) =>
                  prev.includes(field.name)
                    ? prev.filter((g) => g !== field.name)
                    : [...prev, field.name],
                )
              }
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                groupBy.includes(field.name)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'hover:bg-accent'
              }`}
            >
              {field.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregations */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Aggregations</label>
          <button
            onClick={addAggregation}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3 w-3" /> Add Aggregation
          </button>
        </div>
        {aggregations.map((agg, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              value={agg.function}
              onChange={(e) =>
                setAggregations(
                  aggregations.map((a, i) =>
                    i === idx
                      ? { ...a, function: e.target.value as AggregationType }
                      : a,
                  ),
                )
              }
              className="rounded-md border px-2 py-1.5 text-sm bg-background w-32"
            >
              {AGG_FUNCTIONS.map((fn) => (
                <option key={fn.value} value={fn.value}>
                  {fn.label}
                </option>
              ))}
            </select>
            <select
              value={agg.field}
              onChange={(e) =>
                setAggregations(
                  aggregations.map((a, i) =>
                    i === idx ? { ...a, field: e.target.value } : a,
                  ),
                )
              }
              className="rounded-md border px-2 py-1.5 text-sm bg-background flex-1"
            >
              {fields
                .filter((f) => f.aggregatable)
                .map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label}
                  </option>
                ))}
            </select>
            <button
              onClick={() => removeAggregation(idx)}
              className="p-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <button
          onClick={() => onExecute(config)}
          disabled={loading || selectedColumns.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {loading ? 'Running...' : 'Run Report'}
        </button>
        {onSave && (
          <button
            onClick={() => onSave(config)}
            disabled={selectedColumns.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        )}
      </div>
    </div>
  );
}
